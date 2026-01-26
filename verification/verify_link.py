import json
from playwright.sync_api import sync_playwright, Page, expect

def verify_people_you_may_know_link(page: Page):
    # Mock Supabase Auth
    user_id = "test-user-id"
    auth_token = {
        "access_token": "mock-access-token",
        "refresh_token": "mock-refresh-token",
        "expires_at": 9999999999,
        "user": {
            "id": user_id,
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "user_metadata": {
                "onboarding_completed": True
            }
        }
    }

    # Set viewport to desktop size
    page.set_viewport_size({"width": 1280, "height": 800})

    # Set local storage before navigation
    page.goto("http://localhost:8080")
    page.evaluate(f"""
        localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', '{json.dumps(auth_token)}');
    """)

    # Mock 'get_people_you_may_know'
    def handle_people_rpc(route):
        response_data = [
            {
                "id": "suggestion-user-1",
                "username": "suggested_user",
                "avatar_url": None,
                "mutual_count": 5,
                "is_follows_me": False
            }
        ]
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(response_data)
        )

    # Mock 'get_feed'
    def handle_feed_rpc(route):
        response_data = [
            {
                "id": "review-1",
                "content": "Great building",
                "rating": 5,
                "tags": [],
                "created_at": "2023-01-01T00:00:00Z",
                "edited_at": "2023-01-01T00:00:00Z",
                "status": "visited",
                "user_id": user_id,
                "group_id": None,
                "user_data": {"username": "me", "avatar_url": None},
                "building_data": {"id": "b1", "name": "Building 1", "address": "Address 1", "architects": [], "year_completed": 2020},
                "likes_count": 0,
                "comments_count": 0,
                "is_liked": False
            }
        ]
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(response_data)
        )

    page.route("**/rest/v1/rpc/get_people_you_may_know*", handle_people_rpc)
    page.route("**/rest/v1/rpc/get_feed*", handle_feed_rpc)

    # Mock other necessary calls
    page.route("**/rest/v1/rpc/track_login", lambda route: route.fulfill(status=200, body="{}"))
    page.route("**/rest/v1/profiles*", lambda route: route.fulfill(status=200, body=json.dumps({"id": user_id, "username": "me"})))
    page.route("**/rest/v1/review_images*", lambda route: route.fulfill(status=200, body="[]"))
    page.route("**/rest/v1/image_likes*", lambda route: route.fulfill(status=200, body="[]"))
    page.route("**/rest/v1/likes*", lambda route: route.fulfill(status=200, body="[]")) # Mock likes check
    page.route("**/rest/v1/comments*", lambda route: route.fulfill(status=200, body="[]"))

    # Reload to apply auth and mocks
    page.reload()

    # Wait for the element to appear
    expect(page.get_by_text("People you may know")).to_be_visible()

    # Check if the user suggestion is a link
    user_link = page.get_by_role("link", name="suggested_user")
    expect(user_link).to_be_visible()

    # Verify the href
    href = user_link.get_attribute("href")
    print(f"Found link href: {href}")
    assert href == "/profile/suggested_user"

    # Take screenshot
    page.screenshot(path="verification/people_you_may_know_link.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_people_you_may_know_link(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
            raise
        finally:
            browser.close()
