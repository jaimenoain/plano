
import json
import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_demolished_status(page: Page):
    # Mock the search_buildings RPC call
    def handle_rpc(route):
        print(f"Intercepted RPC call: {route.request.url}")
        response_data = [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "name": "Visible Building",
                "location": "(51.5074,-0.1278)",
                "location_lat": 51.5074,
                "location_lng": -0.1278,
                "status": "Built",
                "main_image_url": "https://images.unsplash.com/photo-1486739985386-d4fae04ca6f7",
                "city": "London",
                "country": "UK",
                "year_completed": 2020
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "name": "Demolished Building",
                "location": "(51.5080,-0.1280)",
                "location_lat": 51.5080,
                "location_lng": -0.1280,
                "status": "Demolished",
                "main_image_url": "https://images.unsplash.com/photo-1486739985386-d4fae04ca6f7",
                "city": "London",
                "country": "UK",
                "year_completed": 1900
            }
        ]
        route.fulfill(status=200, content_type="application/json", body=json.dumps(response_data))

    # Intercept the RPC call
    page.route("**/rest/v1/rpc/search_buildings*", handle_rpc)

    print("Navigating to search page...")
    # Use port 3001 as seen in logs
    page.goto("http://localhost:3001/search")

    # Wait for page to load
    page.wait_for_timeout(3000)

    # 1. Verify List
    print("Verifying list...")
    # Look for list items specifically. Usually inside a scroll container or list.
    # The list cards usually have an H3 with the name.
    visible_card = page.locator("h3", has_text="Visible Building").first
    demolished_card = page.locator("h3", has_text="Demolished Building").first

    expect(visible_card).to_be_visible()
    expect(demolished_card).to_be_visible()
    print("Both buildings visible in list.")

    # 2. Verify Map
    print("Verifying map...")
    # Map markers are usually children of the map container.
    # React Map GL markers often have class 'mapboxgl-marker' or maplibregl-marker.
    # Inside the marker, there might be text if it's a custom marker (which it seems to be based on previous error showing span with text).

    # Let's count markers.
    # We expect 1 marker (for Visible Building) + maybe user location marker.
    # Or specifically, we check if text "Demolished Building" exists inside a marker.

    # Previous error showed: <span class="font-medium text-white text-center">Visible Building</span>
    # This looks like a marker label.

    marker_visible = page.locator(".mapboxgl-marker, .maplibregl-marker").filter(has_text="Visible Building")
    marker_demolished = page.locator(".mapboxgl-marker, .maplibregl-marker").filter(has_text="Demolished Building")

    # Wait a bit for map to render
    page.wait_for_timeout(2000)

    count_visible = marker_visible.count()
    count_demolished = marker_demolished.count()

    print(f"Visible markers count: {count_visible}")
    print(f"Demolished markers count: {count_demolished}")

    if count_visible > 0:
        print("PASS: Visible Building marker found.")
    else:
        print("FAIL: Visible Building marker NOT found.")

    if count_demolished == 0:
        print("PASS: Demolished Building marker NOT found.")
    else:
        print("FAIL: Demolished Building marker found.")

    # Take a screenshot to verify visually
    page.screenshot(path="verification/search_verification.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to ensure split view (desktop) so both map and list are visible
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_demolished_status(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()
