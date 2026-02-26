import time
import json
from playwright.sync_api import sync_playwright

def test_architect_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})

        # Enable console logging
        context.on("console", lambda msg: print(f"Console: {msg.text}"))

        # Track requests
        def log_request(request):
            if "auth/v1/user" in request.url:
                print(f"Request to: {request.url}")
        context.on("request", log_request)

        # Inject mock session
        project_ref = "gyxspsuctbrxhwiyfvlj"
        token_key = f"sb-{project_ref}-auth-token"

        # Fake JWT (just needs 3 parts separated by dots)
        fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6ImFyY2hpdGVjdEBleGFtcGxlLmNvbSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjE5OTk5OTk5OTksInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.signature"

        fake_session = {
            "access_token": fake_jwt,
            "refresh_token": "fake-refresh-token",
            "expires_at": 1999999999,
            "token_type": "bearer",
            "user": {
                "id": "test-user-id",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "architect@example.com",
                "app_metadata": {
                    "provider": "email",
                    "providers": ["email"]
                },
                "user_metadata": {},
                "created_at": "2023-01-01T00:00:00Z"
            }
        }
        session_str = json.dumps(fake_session)

        # Add init script to set LS
        context.add_init_script(f"""
            window.localStorage.setItem('{token_key}', '{session_str}');
        """)

        # Mock Routes
        # 1. Auth User
        context.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(fake_session["user"])
        ))

        # 2. Architect Claims
        context.route("**/rest/v1/architect_claims?*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"architect_id": "test-architect-id", "status": "verified"}'
        ))

        # 3. Building Architects
        context.route("**/rest/v1/building_architects?*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"building_id": "b1"}, {"building_id": "b2"}]'
        ))

        # 4. User Buildings
        def handle_user_buildings(route):
            url = route.request.url
            if "status=eq.visited" in url and "select=*" in url:
                route.fulfill(
                    status=200,
                    headers={"Content-Range": "0-0/150"},
                    content_type="application/json",
                    body='[]'
                )
            elif "status=eq.pending" in url and "select=*" in url:
                 route.fulfill(
                    status=200,
                    headers={"Content-Range": "0-0/42"},
                    content_type="application/json",
                    body='[]'
                )
            elif "select=rating" in url:
                 route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='[{"rating": 5}, {"rating": 4}, {"rating": 5}]'
                )
            elif "select=id" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='[' +
                        '{"id": "ub1", "content": "Amazing work!", "rating": 5, "status": "visited", "created_at": "2023-01-01T00:00:00Z", "user_id": "u1", "building_id": "b1", ' +
                        '"user": {"username": "Fan1", "avatar_url": null}, ' +
                        '"building": {"id": "b1", "name": "Sky Tower", "address": "123 High St", "city": "New York", "country": "USA", "slug": "sky-tower", "year_completed": 2020, "architects": [{"architect": {"name": "Test Arch"}}]}, ' +
                        '"images": [], "likes": [{"count": 10}], "comments": [{"count": 2}], "my_likes": []},' +
                        '{"id": "ub2", "content": "Beautiful design.", "rating": 4, "status": "visited", "created_at": "2023-01-02T00:00:00Z", "user_id": "u2", "building_id": "b2", ' +
                        '"user": {"username": "Critic2", "avatar_url": null}, ' +
                        '"building": {"id": "b2", "name": "River House", "address": "456 River Rd", "city": "London", "country": "UK", "slug": "river-house", "year_completed": 2021, "architects": [{"architect": {"name": "Test Arch"}}]}, ' +
                        '"images": [{"id": "img1", "storage_path": "path/to/img.jpg", "likes_count": 5}], "likes": [{"count": 5}], "comments": [{"count": 0}], "my_likes": []}' +
                    ']'
                )
            else:
                route.continue_()

        context.route("**/rest/v1/user_buildings?*", handle_user_buildings)

        page = context.new_page()

        try:
            print("Navigating to dashboard...")
            page.goto("http://localhost:8080/architect/dashboard")

            # Wait for content
            print("Waiting for content...")
            page.wait_for_selector("text=Architect Dashboard", timeout=10000)
            page.wait_for_selector("text=Sky Tower", timeout=10000)
            page.wait_for_selector("text=150", timeout=10000)

            print("Taking screenshot...")
            page.screenshot(path="/home/jules/verification/architect_dashboard_final.png", full_page=True)
            print("Screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e

        browser.close()

if __name__ == "__main__":
    test_architect_dashboard()
