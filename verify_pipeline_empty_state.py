from playwright.sync_api import sync_playwright, expect
import json

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})

        # User and Group Data
        user_id = "test-user-id"
        group_id = "test-group-id"
        group_slug = "test-group"
        project_ref = "gyxspsuctbrxhwiyfvlj"

        user_data = {
            "id": user_id,
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "email_confirmed_at": "2023-01-01T00:00:00Z",
            "created_at": "2023-01-01T00:00:00Z",
            "last_sign_in_at": "2023-01-01T00:00:00Z",
            "app_metadata": {"provider": "email", "providers": ["email"]},
            "user_metadata": {"username": "testuser"}
        }

        # Mock Auth User endpoint (GET /auth/v1/user)
        context.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(user_data)
        ))

        # Mock Token Refresh/Grant (POST /auth/v1/token?grant_type=refresh_token)
        # This is often called on init if session exists
        context.route("**/auth/v1/token*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "access_token": "new-fake-token",
                "refresh_token": "new-fake-refresh",
                "expires_in": 3600,
                "user": user_data
            })
        ))

        # Mock Groups query (GET /rest/v1/groups?...)
        group_response = {
            "id": group_id,
            "slug": group_slug,
            "name": "Test Group",
            "description": "A test group for verification",
            "is_public": True,
            "cover_url": None,
            "members": [
                {
                    "user": {"id": user_id, "username": "testuser", "avatar_url": None},
                    "role": "admin",
                    "status": "active"
                }
            ],
            "cycles": [{"count": 0}],
            "polls": [{"count": 0}],
            "private": []
        }

        context.route("**/rest/v1/groups*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([group_response])
        ))

        # Mock Backlog Items (Pipeline) - EMPTY
        context.route("**/rest/v1/group_backlog_items*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))

        # Mock Cycles
        context.route("**/rest/v1/group_cycles*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))

        # Mock other lookups
        context.route("**/rest/v1/profiles*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([{"id": user_id, "username": "testuser"}])
        ))

        # Mock Edge Functions
        context.route("**/functions/v1/*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({})
        ))

        page = context.new_page()

        # Inject auth token into localStorage
        # The key is `sb-<project_ref>-auth-token`
        token_data = {
            "access_token": "fake-token",
            "refresh_token": "fake-refresh",
            "expires_in": 3600,
            "expires_at": 9999999999,
            "token_type": "bearer",
            "user": user_data
        }

        page.add_init_script(f"""
            localStorage.setItem('sb-{project_ref}-auth-token', '{json.dumps(token_data)}');
        """)

        # Navigate
        url = f"http://localhost:8081/groups/{group_slug}/pipeline"
        print(f"Navigating to {url}")

        # Add console listener
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        try:
            page.goto(url, timeout=20000)

            # Wait a bit for auth to settle
            page.wait_for_timeout(3000)

            # Check if we are stuck on "Members Only"
            if page.get_by_text("Members Only").is_visible():
                print("Still seeing 'Members Only'. Auth failed or member check failed.")
                page.screenshot(path="verification/members_only_debug.png")
            else:
                # Check for Pipeline Tab Title
                expect(page.get_by_text("Programming Pipeline")).to_be_visible(timeout=10000)

                # Check for Empty State
                expect(page.get_by_text("Start building your movie pipeline")).to_be_visible()

                print("Verification SUCCESS!")
                page.screenshot(path="verification/pipeline_success.png")

        except Exception as e:
            print(f"Verification FAILED: {e}")
            page.screenshot(path="verification/failed_final.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
