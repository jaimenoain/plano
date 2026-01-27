
import json
from playwright.sync_api import sync_playwright, Page, expect

def test_delete_review_button(page: Page):
    # Mock Auth
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "id": "user-123",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "user_metadata": {
                "onboarding_completed": True
            }
        })
    ))

    # Inject Session into LocalStorage
    page.goto("http://localhost:8080")
    page.evaluate("""() => {
        localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
            access_token: 'x.y.z',
            refresh_token: 'refresh-token',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            user: {
                id: 'user-123',
                email: 'test@example.com',
                user_metadata: { onboarding_completed: true }
            }
        }));
    }""")

    # Mock Building Data
    page.route("**/rest/v1/buildings?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "id": "building-123",
            "name": "Test Building",
            "slug": "test-building",
            "short_id": 123
        })
    ))

    # Mock User Buildings (Review) - Existing Review
    # This endpoint is hit twice: once for suggestions (tags), once for the specific building review
    def handle_user_buildings(route):
        url = route.request.url
        if "order=edited_at" in url:
            # Suggestions query
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps([])
            )
        elif "building_id=eq.building-123" in url:
            # Specific review query
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "id": "review-123",
                    "rating": 5,
                    "content": "Great place!",
                    "status": "visited",
                    "tags": ["Architecture"],
                    "visibility": "public"
                })
            )
        else:
             route.continue_()

    page.route("**/rest/v1/user_buildings?*", handle_user_buildings)

    # Mock Review Links
    page.route("**/rest/v1/review_links?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([])
    ))

    # Mock Review Images
    page.route("**/rest/v1/review_images?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([])
    ))

    # Mock Building Image
    page.route("**/storage/v1/object/public/building_images/*", lambda route: route.fulfill(
        status=200,
        content_type="image/jpeg",
        body=b""
    ))

    # Navigate to Write Review Page (Correct URL)
    page.goto("http://localhost:8080/building/building-123/review")

    # Wait for content to load
    page.get_by_text("Test Building").wait_for()
    page.get_by_text("Great place!").wait_for()

    # Check for Delete Review button
    delete_btn = page.get_by_text("Delete Review")
    expect(delete_btn).to_be_visible()

    # Scroll to bottom
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

    # Take Screenshot of the whole scrollable page
    page.screenshot(path="/home/jules/verification/delete_review.png", full_page=True)

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_delete_review_button(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
