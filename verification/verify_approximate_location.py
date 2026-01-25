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

    # Mock Google Maps (Keep existing mock)
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
    page.route("**/rest/v1/rpc/find_nearby_buildings", lambda route: route.fulfill(status=200, json=[]))
    page.route("**/rest/v1/user_buildings*", lambda route: route.fulfill(status=200, json=[]))

    # Navigate
    print("Navigating to Add Building...")
    page.goto("http://localhost:8080/add-building")

    # Wait for map
    expect(page.get_by_text("Add a Building")).to_be_visible()

    # Verify Toggle Exists
    print("Verifying toggle...")
    toggle = page.get_by_label("Approximate Location")
    expect(toggle).to_be_visible()
    expect(toggle).not_to_be_checked()

    # Click Map to place pin
    print("Placing pin...")
    page.wait_for_selector("canvas", timeout=10000)
    canvas = page.locator("canvas").first
    canvas.click(position={"x": 300, "y": 300}, force=True)

    # Check Pin Color (Red default)
    # The pin uses Tailwind classes. approximate=amber-500, exact=red-600.
    print("Verifying initial red pin...")
    page.wait_for_selector(".text-red-600")

    # Toggle Approximate
    print("Toggling approximate...")
    toggle.check()
    expect(toggle).to_be_checked()

    # Check Pin Color (Amber)
    print("Verifying pin color change to amber...")
    page.wait_for_selector(".text-amber-500")

    # Take Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/verify_approximate.png", full_page=True)
    print("Done!")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
