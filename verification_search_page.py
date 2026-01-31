from playwright.sync_api import sync_playwright, expect
import json
import time

def verify_search_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to something standard
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # 1. Mock Session
        page.add_init_script("""
            window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
                access_token: "fake-token",
                refresh_token: "fake-refresh",
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                expires_in: 3600,
                token_type: "bearer",
                user: {
                    id: "user-uuid",
                    email: "test@example.com",
                    aud: "authenticated",
                    role: "authenticated"
                }
            }));
        """)

        # 2. Mock Google Maps
        page.add_init_script("""
            window.google = {
              maps: {
                Map: class {
                    setCenter() {}
                    setZoom() {}
                    addListener() {}
                    getCenter() { return { lat: () => 51.5074, lng: () => -0.1278 }; }
                    fitBounds() {}
                },
                Marker: class {
                    setMap() {}
                    setPosition() {}
                    addListener() {}
                },
                ControlPosition: { TOP_RIGHT: 1 },
                importLibrary: async () => ({}),
                places: {
                    AutocompleteService: class {
                        getPlacePredictions() { return { predictions: [] }; }
                    },
                    PlacesService: class {
                        getDetails() {}
                    }
                },
                Geocoder: class {
                    geocode() { return { results: [] }; }
                },
                Size: class {},
                Point: class {},
                LatLng: class { lat() { return 0; } lng() { return 0; } }
              }
            };
        """)

        # 3. Mock Network
        # Mock search_buildings RPC
        page.route('**/rest/v1/rpc/search_buildings*', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps([{
                "id": "1",
                "name": "Test Building",
                "location_lat": 51.5074,
                "location_lng": -0.1278,
                "status": "Built",
                "typologies": ["Office"],
                "main_image_url": "https://via.placeholder.com/150"
            }])
        ))

        # Mock user_buildings
        page.route('**/rest/v1/user_buildings*', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps([])
        ))

        # Mock notifications
        page.route('**/rest/v1/notifications*', lambda route: route.fulfill(
             status=200,
             content_type='application/json',
             body=json.dumps([])
        ))

        # Mock get_collection_stats
        page.route('**/rest/v1/rpc/get_collection_stats*', lambda route: route.fulfill(
             status=200,
             content_type='application/json',
             body=json.dumps([])
        ))


        # 4. Navigate
        print("Navigating to search page...")
        page.goto('http://localhost:8080/search')

        # Wait for page load
        page.wait_for_timeout(3000)

        # 5. Verify Header Elements
        print("Verifying header elements...")
        # Search input should be in the header
        search_input = page.locator('input[placeholder*="Search buildings"]')
        expect(search_input).to_be_visible()

        # Check if it's inside the header (header usually has z-50 fixed)
        header = page.locator('header')
        expect(header).to_be_visible()

        # Buttons
        # Use locator with icon classes or structure if no specific text/label
        # or use get_by_role('button')

        # MapPin button (Location)
        # It's a button with a ghost variant
        # We can look for the button containing the MapPin icon class if we can't find by label.
        # But we didn't add labels.
        # Let's count buttons in the right action area.

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path='verification_search_page.png')

        browser.close()

if __name__ == "__main__":
    verify_search_page()
