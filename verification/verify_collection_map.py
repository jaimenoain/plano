
import os
from playwright.sync_api import sync_playwright

def verify_collection_map():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(viewport={"width": 375, "height": 667})
        page = context.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Mock Supabase responses

        # 1. Profile (single object)
        page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id": "user-123", "username": "testuser"}'
        ))

        # 2. Collection (single object)
        page.route("**/rest/v1/collections*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id": "col-123", "owner_id": "user-123", "slug": "test-collection", "name": "Test Collection", "description": "A test collection", "categorization_method": "default", "show_community_images": true}'
        ))

        # 3. Items (array)
        items_json = '''
        [
            {
                "id": "item-1",
                "building_id": "b-1",
                "note": "Test Note",
                "custom_category_id": null,
                "building": {
                    "id": "b-1",
                    "name": "Test Building 1",
                    "location": {"type": "Point", "coordinates": [2.3522, 48.8566]},
                    "city": "Paris",
                    "country": "France",
                    "year_completed": 2020,
                    "hero_image_url": "https://example.com/image.jpg",
                    "location_precision": "exact",
                    "building_architects": []
                }
            },
            {
                "id": "item-2",
                "building_id": "b-2",
                "note": "Another Note",
                "custom_category_id": null,
                "building": {
                    "id": "b-2",
                    "name": "Test Building 2",
                    "location": {"type": "Point", "coordinates": [2.3522, 48.8666]},
                    "city": "Paris",
                    "country": "France",
                    "year_completed": 2021,
                    "hero_image_url": "https://example.com/image2.jpg",
                    "location_precision": "exact",
                    "building_architects": []
                }
            }
        ]
        '''
        page.route("**/rest/v1/collection_items*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=items_json
        ))

        # Navigate
        page.goto("http://localhost:8080/map/testuser/test-collection")

        # Wait for content
        try:
            page.wait_for_selector("text=Test Collection", timeout=10000)
            page.wait_for_selector("text=Test Building 1", timeout=10000)
        except Exception as e:
            print(f"Error waiting for selector: {e}")
            page.screenshot(path="verification/error_screenshot.png")
            print("Captured error screenshot")
            browser.close()
            return

        # Take screenshot
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/collection_map_mobile.png")

        print("Screenshot taken at verification/collection_map_mobile.png")
        browser.close()

if __name__ == "__main__":
    verify_collection_map()
