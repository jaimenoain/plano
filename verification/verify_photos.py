from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock user profile
        page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id": "test-uuid", "username": "TestUser"}]'
        ))

        # Mock review images
        def handle_images(route):
            request = route.request
            url = request.url
            print(f"Request to review_images: {url}")

            # Check for order param
            if "order=likes_count" in url:
                print("VERIFIED: Request contains order=likes_count")
            elif "order=created_at" in url:
                print("VERIFIED: Request contains order=created_at")

            # Simple mock data
            mock_data = """
            [
                {
                    "id": "img1",
                    "storage_path": "path/to/img1.jpg",
                    "likes_count": 10,
                    "review_id": "rev1",
                    "user_buildings": {
                        "building": {"id": "b1", "name": "Building 1", "slug": "b1"}
                    }
                },
                {
                    "id": "img2",
                    "storage_path": "path/to/img2.jpg",
                    "likes_count": 50,
                    "review_id": "rev2",
                    "user_buildings": {
                        "building": {"id": "b2", "name": "Building 2", "slug": "b2"}
                    }
                }
            ]
            """
            route.fulfill(status=200, content_type="application/json", body=mock_data)

        page.route("**/rest/v1/review_images*", handle_images)

        # Mock image likes (empty)
        page.route("**/rest/v1/image_likes*", lambda route: route.fulfill(
            status=200, content_type="application/json", body='[]'
        ))

        try:
            # Navigate to the page
            print("Navigating...")
            page.goto("http://localhost:3000/profile/test-uuid/photos")

            # Wait for content to load
            print("Waiting for content...")
            page.wait_for_selector("text=Building 1")

            # Take screenshot of initial state
            page.screenshot(path="verification/initial_load.png")
            print("Initial screenshot taken.")

            # Click the trigger (combobox)
            # Shadcn Select trigger usually has role 'combobox'
            print("Clicking sort dropdown...")
            page.click("button[role='combobox']")

            # Wait for options
            page.wait_for_selector("text=Popular")

            # Click "Popular"
            print("Selecting Popular...")
            page.click("text=Popular")

            # Wait a moment for the new request
            page.wait_for_timeout(2000)

            # Take screenshot after change
            page.screenshot(path="verification/after_sort.png")
            print("After sort screenshot taken.")

            # Verify UI text
            content = page.text_content("button[role='combobox']")
            if "Popular" in content:
                print("SUCCESS: UI shows Popular")
            else:
                print(f"FAILURE: UI shows {content}")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
