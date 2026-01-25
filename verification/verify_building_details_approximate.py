from playwright.sync_api import sync_playwright, Page, expect
import json
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Mock Auth
    auth_state = {
        "access_token": "fake-token",
        "refresh_token": "fake-refresh",
        "expires_at": int(time.time()) + 3600,
        "expires_in": 3600,
        "token_type": "bearer",
        "user": {
            "id": "user-uuid",
            "email": "test@example.com",
            "aud": "authenticated",
            "role": "authenticated"
        }
    }
    page.add_init_script(f"""
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({json.dumps(auth_state)}));
    """)

    # Mock Google Maps
    page.add_init_script("""
        window.google = {
            maps: {
                places: { AutocompleteService: class {}, PlacesService: class { findPlaceFromQuery() {} } },
                Geocoder: class { geocode(req, cb) { cb([{ formatted_address: "123 Test St", address_components: [], geometry: { location: { lat: () => 51.5, lng: () => -0.1 } } }], "OK"); } },
                Map: class { setCenter() {} setZoom() {} addListener() {} },
                Marker: class { setMap() {} setPosition() {} },
                ControlPosition: { TOP_RIGHT: 1 },
                importLibrary: async () => ({})
            }
        };
    """)

    # Mock Building Data
    building_id = "12345678-1234-1234-1234-123456789012"

    mock_building = {
        "id": building_id,
        "name": "Test Approximate Building",
        "location": "POINT(-0.1 51.5)",
        "location_precision": "approximate",
        "address": "Some Locality, UK",
        "architects": ["Architect One"],
        "year_completed": 2020,
        "styles": ["Modern"],
        "main_image_url": None,
        "created_by": "user-uuid",
        "description": "A description"
    }

    # Mock Network
    def handle_buildings(route):
        url = route.request.url
        print(f"Intercepted: {url}")
        if f"id=eq.{building_id}" in url:
             # Return array for list/maybeSingle
             route.fulfill(status=200, json=[mock_building])
        else:
             route.continue_()

    page.route("**/rest/v1/buildings*", handle_buildings)

    # Mock other requests
    page.route("**/rest/v1/building_architects*", lambda route: route.fulfill(status=200, json=[]))

    # Mock user_buildings.
    # Logic in code: .eq("user_id", ...).eq("building_id", ...).maybeSingle() -> returns object or null.
    # Supabase response for list is [].
    page.route("**/rest/v1/user_buildings*", lambda route: route.fulfill(status=200, json=[]))

    page.route("**/rest/v1/rpc/get_building_top_links", lambda route: route.fulfill(status=200, json=[]))

    # Navigate
    print(f"Navigating to Building {building_id}...")
    page.goto(f"http://localhost:8080/building/{building_id}")

    # Wait for page to load
    expect(page.get_by_text("Test Approximate Building")).to_be_visible()

    # Verify Warning Banner
    print("Verifying warning banner...")
    banner = page.get_by_text("Exact location not verified")
    expect(banner).to_be_visible()

    # Verify Directions Button
    print("Verifying directions button...")
    button = page.get_by_role("link", name="Get Directions (Approximate)")
    expect(button).to_be_visible()
    expect(button).to_have_attribute("href", "https://www.google.com/maps/dir/?api=1&destination=51.5,-0.1")

    # Take Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/verify_building_details.png", full_page=True)
    print("Done!")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
