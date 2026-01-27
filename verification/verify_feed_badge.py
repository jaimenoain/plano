import json
import time
from playwright.sync_api import sync_playwright, expect

def test_feed_badge(page):
    # Mock Auth
    project_id = "lnqxtomyucnnrgeapnzt"
    token_key = f"sb-{project_id}-auth-token"

    expires_at = int(time.time()) + 3600 * 24 # Tomorrow

    # Dummy session
    session_data = {
        "access_token": "fake-token",
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": expires_at,
        "refresh_token": "fake-refresh",
        "user": {
            "id": "test-user-id",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "email_confirmed_at": "2023-01-01T00:00:00Z",
            "phone": "",
            "confirmed_at": "2023-01-01T00:00:00Z",
            "last_sign_in_at": "2023-01-01T00:00:00Z",
            "app_metadata": {
                "provider": "email",
                "providers": ["email"]
            },
            "user_metadata": {"username": "testuser", "onboarding_completed": True},
            "identities": [],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }
    }

    page.add_init_script(f"""
        window.localStorage.setItem('{token_key}', '{json.dumps(session_data)}');
    """)

    # Mock feed data
    mock_feed_data = [
        {
            "id": "review-1",
            "content": "This is a pending review",
            "rating": 5,
            "tags": [],
            "created_at": "2023-01-01T00:00:00Z",
            "edited_at": "2023-01-01T00:00:00Z",
            "status": "pending",
            "user_id": "test-user-id",
            "user_data": {
                "username": "testuser",
                "avatar_url": None
            },
            "building_data": {
                "id": "building-1",
                "short_id": 123,
                "slug": "building-slug",
                "name": "Test Building",
                "address": "123 Test St",
                "city": "Test City",
                "country": "Test Country",
                "main_image_url": "test.jpg",
                "architects": [],
                "year_completed": "2020"
            },
            "likes_count": 0,
            "comments_count": 0,
            "is_liked": False,
            "review_images": []
        }
    ]

    def handle_feed(route):
        print(f"Intercepted feed request: {route.request.url}")
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_feed_data)
        )

    # Intercept RPC call - allow any query params
    page.route("**/rest/v1/rpc/get_feed*", handle_feed)

    # Intercept Auth calls
    # User endpoint
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(session_data["user"])
    ))

    # Refresh token endpoint (just in case)
    page.route("**/auth/v1/token?grant_type=refresh_token", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(session_data)
    ))

    print("Navigating to home page...")
    page.goto("http://localhost:8080/")

    # Wait a bit
    page.wait_for_timeout(2000)
    print(f"Current URL: {page.url}")

    # Check if we are still on Landing (meaning auth failed)
    if page.get_by_text("Get Started").count() > 0:
        print("Still on Landing page. Auth failed.")
        # Try to debug why. Check console logs.
        page.screenshot(path="verification/landing_debug.png")
        raise Exception("Authentication failed, stuck on Landing page")

    print("Waiting for feed content...")
    # Wait for feed to load
    expect(page.get_by_text("Test Building")).to_be_visible(timeout=10000)

    print("Verifying badge absence...")
    expect(page.get_by_text("WANT TO VISIT")).to_have_count(0)

    expect(page.get_by_text("saved")).to_be_visible()

    print("Taking screenshot...")
    page.screenshot(path="verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            test_feed_badge(page)
            print("Verification script finished successfully.")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
