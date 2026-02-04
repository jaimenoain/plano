import os
import time
import json
from playwright.sync_api import sync_playwright

def test_filters(page):
    # Mock Auth User Endpoint
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        body=json.dumps({
            "id": "test-user-id",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "email_confirmed_at": "2023-01-01T00:00:00Z",
            "phone": "",
            "app_metadata": {"provider": "email", "providers": ["email"]},
            "user_metadata": {"onboarding_completed": True},
            "identities": [],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
        }),
        headers={"Content-Type": "application/json"}
    ))

    # Inject session into localStorage
    project_ref = "lnqxtomyucnnrgeapnzt"
    token_key = f"sb-{project_ref}-auth-token"

    fake_session = {
        "access_token": "fake-access-token",
        "refresh_token": "fake-refresh-token",
        "expires_at": int(time.time()) + 3600,
        "expires_in": 3600,
        "token_type": "bearer",
        "user": {
            "id": "test-user-id",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "email_confirmed_at": "2023-01-01T00:00:00Z",
            "phone": "",
            "app_metadata": {"provider": "email", "providers": ["email"]},
            "user_metadata": {"onboarding_completed": True},
            "identities": [],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
        }
    }

    session_json = json.dumps(fake_session)

    # Add init script to set localStorage before page loads
    page.add_init_script(f"""
        window.localStorage.setItem('{token_key}', '{session_json}');
        window.localStorage.setItem('explore-tutorial-seen', 'true');
    """)

    # Navigate to Search Page
    page.goto("http://localhost:8080/search")

    try:
        # Check if we are redirected to auth
        if "Welcome back" in page.content():
            print("Redirected to Auth page despite injection.")
            page.screenshot(path="/home/jules/verification/debug_auth_redirect.png")
            return

        page.locator("button[title='Filters'] >> visible=true").wait_for(timeout=10000)
        page.locator("button[title='Filters'] >> visible=true").click()
    except Exception as e:
        print(f"Filter button not found: {e}")
        page.screenshot(path="/home/jules/verification/debug_search.png")
        return

    # Wait for the sheet to open.
    # Use exact match for the Title "Filters"
    page.get_by_role("heading", name="Filters", exact=True).wait_for()

    # Wait for translation changes to appear
    try:
        page.get_by_text("New Construction").wait_for(timeout=5000)
        page.get_by_text("Rehabilitation").wait_for(timeout=5000)
        page.get_by_text("Discover").wait_for(timeout=5000)
        page.get_by_text("My Library").wait_for(timeout=5000)
        page.get_by_text("Architects").wait_for(timeout=5000)
    except Exception as e:
        print(f"Failed to find translated text: {e}")

    # Take screenshot of the filter drawer
    page.screenshot(path="/home/jules/verification/verification.png")

if __name__ == "__main__":
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})

        try:
            test_filters(page)
        except Exception as e:
            print(e)
        finally:
            browser.close()
