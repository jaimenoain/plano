import time
from playwright.sync_api import sync_playwright, expect

def test_add_building_duplicates(page):
    # Mock the find_nearby_buildings RPC call
    def handle_find_nearby(route):
        print("MOCK: find_nearby_buildings called")
        route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id": "duplicate-1", "name": "Existing Building", "address": "123 Main St", "location_lat": 51.5074, "location_lng": -0.1278, "dist_meters": 10}]'
        )

    page.route("**/rest/v1/rpc/find_nearby_buildings*", handle_find_nearby)

    # Navigate to Add Building page.
    # Use /add-building as per App.tsx
    print("Navigating to /add-building...")
    page.goto("http://localhost:8081/add-building")

    # Use the test button instead of map
    print("Clicking Test Set Location button...")
    page.click("#test-trigger-duplicates")

    # Wait for the "Nearby Buildings" to appear in sidebar
    print("Waiting for duplicates list...")
    # The badge shows the count
    expect(page.locator("text=Nearby Buildings")).to_be_visible(timeout=10000)
    # Be more specific about the duplicate name as it might appear on map and sidebar
    expect(page.locator(".font-medium >> text=Existing Building")).to_be_visible()

    # Click "Continue" button
    print("Clicking Continue...")
    page.get_by_role("button", name="Continue").click()

    # Expect Dialog
    print("Waiting for dialog...")
    expect(page.get_by_role("dialog")).to_be_visible()
    expect(page.get_by_text("Duplicate Building Found")).to_be_visible()

    # Check for "Add to my list" button in dialog
    expect(page.get_by_role("button", name="Add to my list")).to_be_visible()

    # Screenshot
    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/verify_add_building_duplicates.png")
    print("Success!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_add_building_duplicates(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
