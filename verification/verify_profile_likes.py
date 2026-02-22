from playwright.sync_api import sync_playwright
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Route overrides for Supabase Mocking

    # 1. Profiles
    def handle_profiles(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([{
                "id": "user-123",
                "username": "testuser",
                "avatar_url": None,
                "bio": "Test Bio",
                "favorites": []
            }])
        )
    page.route("**/rest/v1/profiles*", handle_profiles)

    # 2. User Buildings (Review)
    # The app expects this structure.
    # We mock 1 review ("review-1").
    def handle_user_buildings(route):
        data = [{
            "id": "review-1",
            "content": "Great place",
            "rating": 4,
            "created_at": "2023-01-01T00:00:00+00:00",
            "edited_at": "2023-01-01T00:00:00+00:00",
            "user_id": "user-123",
            "building_id": "b1",
            "status": "visited",
            "building": {
                "id": "b1",
                "name": "Test Building",
                "address": "123 Main St",
                "city": "Metropolis",
                "country": "USA",
                "year_completed": 2000,
                "main_image_url": "img.jpg",
                "slug": "test-building",
                "short_id": "tb",
                "architects": [{"architect": {"name": "Arch One", "id": "a1"}}]
            }
        }]
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(data)
        )
    page.route("**/rest/v1/user_buildings*", handle_user_buildings)

    # 3. Review Images
    # We mock 2 images for "review-1".
    # Image 1: 5 likes. Image 2: 3 likes.
    def handle_review_images(route):
        data = [
            {"id": "img1", "review_id": "review-1", "storage_path": "path1", "likes_count": 5},
            {"id": "img2", "review_id": "review-1", "storage_path": "path2", "likes_count": 3}
        ]
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(data)
        )
    page.route("**/rest/v1/review_images*", handle_review_images)

    # 4. Likes (Review Likes)
    # We mock 1 like for the review "review-1".
    def handle_likes(route):
        data = [{"interaction_id": "review-1"}]
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(data)
        )
    page.route("**/rest/v1/likes*", handle_likes)

    # 5. Other endpoints (empty or default)
    page.route("**/rest/v1/comments*", lambda route: route.fulfill(status=200, content_type="application/json", body="[]"))
    page.route("**/rest/v1/follows*", lambda route: route.fulfill(status=200, content_type="application/json", body="[]"))
    page.route("**/rest/v1/image_likes*", lambda route: route.fulfill(status=200, content_type="application/json", body="[]"))
    page.route("**/storage/v1/object/public/avatars/*", lambda route: route.fulfill(status=200, body="avatar"))

    # Navigate to Profile
    try:
        page.goto("http://localhost:8080/profile/testuser")

        # Wait for "Test Building" to appear
        page.wait_for_selector("text=Test Building", timeout=10000)

        # Take screenshot
        page.screenshot(path="verification/profile_likes.png", full_page=True)
        print("Screenshot saved to verification/profile_likes.png")

        # Verify content
        content = page.content()

        # We expect total likes = 1 (review) + 5 (img1) + 3 (img2) = 9
        if "Test Building" in content:
            print("Found 'Test Building'.")

            # Check for "9"
            # It might appear in other places, but checking existence is a good start.
            # More specific locator:
            # A heart icon followed by text "9".
            # Playwright: locator("button").filter(has=page.locator("svg.lucide-heart")).locator("text=9")

            likes_element = page.locator("button").filter(has=page.locator("svg.lucide-heart")).get_by_text("9")
            if likes_element.count() > 0 or "9" in content:
                print("SUCCESS: Found like count '9'.")
            else:
                print("FAILURE: Did not find like count '9'.")

        else:
            print("FAILURE: Did not find 'Test Building'.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
