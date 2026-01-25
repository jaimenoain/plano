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

    # Mock Network
    page.route("**/rest/v1/functional_categories*", lambda route: route.fulfill(status=200, json=[{"id": "00000000-0000-0000-0000-000000000001", "name": "Residential", "slug": "residential"}]))
    page.route("**/rest/v1/functional_typologies*", lambda route: route.fulfill(status=200, json=[{"id": "00000000-0000-0000-0000-000000000002", "name": "House", "parent_category_id": "00000000-0000-0000-0000-000000000001", "slug": "house"}]))
    page.route("**/rest/v1/attribute_groups*", lambda route: route.fulfill(status=200, json=[{"id": "00000000-0000-0000-0000-000000000003", "name": "Material", "slug": "material"}]))
    page.route("**/rest/v1/attributes*", lambda route: route.fulfill(status=200, json=[{"id": "00000000-0000-0000-0000-000000000004", "name": "Brick", "group_id": "00000000-0000-0000-0000-000000000003", "slug": "brick"}]))

    page.route("**/rest/v1/rpc/find_nearby_buildings", lambda route: route.fulfill(status=200, json=[])) # No duplicates
    page.route("**/rest/v1/user_buildings*", lambda route: route.fulfill(status=200, json=[]))

    # Navigate
    print("Navigating to Add Building...")
    page.goto("http://localhost:8080/add-building")

    # Wait for map or title
    expect(page.get_by_text("Add a Building")).to_be_visible()

    # Drop Pin (Click map center)
    print("Clicking map...")
    # Wait for canvas
    page.wait_for_selector("canvas", timeout=10000)
    canvas = page.locator("canvas").first
    canvas.click(position={"x": 300, "y": 300}, force=True)

    # Click Continue
    print("Clicking Continue...")
    page.wait_for_timeout(1000) # Wait for debounce
    page.get_by_role("button", name="Continue").click()

    # Wait for Form
    print("Waiting for form...")
    expect(page.get_by_text("Add Details")).to_be_visible()

    # Wait for Taxonomy to load
    print("Waiting for taxonomy...")
    expect(page.get_by_text("Functional Classification")).to_be_visible()

    # Expand Category
    print("Selecting category...")
    page.get_by_label("Category *").dispatch_event("click", {"bubbles": True, "cancelable": True})
    page.get_by_role("option", name="Residential").dispatch_event("click", {"bubbles": True, "cancelable": True})

    # Wait for Typology
    print("Waiting for typology...")
    expect(page.get_by_text("House")).to_be_visible()

    # Take Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/verification.png", full_page=True)
    print("Done!")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
