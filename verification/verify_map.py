import time
from playwright.sync_api import sync_playwright

def test_building_discovery_map():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock the Supabase RPC response
        page.route("**/rest/v1/rpc/find_nearby_buildings?*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body="""[
                {
                    "id": "123",
                    "name": "Test Building 1",
                    "main_image_url": "https://example.com/image1.jpg",
                    "location_lat": 51.5074,
                    "location_lng": -0.1278,
                    "dist_meters": 0,
                    "similarity_score": 1.0
                },
                {
                    "id": "456",
                    "name": "Test Building 2",
                    "main_image_url": "https://example.com/image2.jpg",
                    "location_lat": 51.51,
                    "location_lng": -0.13,
                    "dist_meters": 500,
                    "similarity_score": 0.9
                }
            ]"""
        ))

        # Mock auth
        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id": "test-user-id", "email": "test@example.com"}'
        ))

        # Navigate to the page
        # Assuming the app is running on localhost:8080 (standard for many setups, but I need to check)
        # If I haven't started it yet, I should.
        page.goto("http://localhost:3000/search")

        # Wait for map to load (can be tricky with canvas, so we wait for some time or elements)
        time.sleep(5)

        # Take screenshot
        page.screenshot(path="verification/building_discovery_map.png")

        browser.close()

if __name__ == "__main__":
    test_building_discovery_map()
