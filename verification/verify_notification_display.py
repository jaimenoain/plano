import time
import json
from playwright.sync_api import sync_playwright, expect

def verify_notification_display():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Inject Session (Same as before)
        project_ref = "gyxspsuctbrxhwiyfvlj"
        session_key = f"sb-{project_ref}-auth-token"
        session_data = {
            "access_token": "mock-access-token",
            "refresh_token": "mock-refresh-token",
            "expires_at": int(time.time()) + 3600,
            "expires_in": 3600,
            "token_type": "bearer",
            "user": {
                "id": "test-user-id",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "test@example.com",
                "app_metadata": {"provider": "email"},
                "user_metadata": {},
                "created_at": "2023-01-01T00:00:00.000000Z",
                "updated_at": "2023-01-01T00:00:00.000000Z"
            }
        }

        page.goto("http://localhost:3000/")
        page.evaluate(f"localStorage.setItem('{session_key}', JSON.stringify({json.dumps(session_data)}))")

        # Mock Auth User
        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200, body=json.dumps(session_data["user"]), headers={"content-type": "application/json"}
        ))

        # Mock Notifications Fetch
        notifications_response = [
            {
                "id": "notif-1",
                "created_at": "2023-10-27T10:00:00Z",
                "type": "visit_request",
                "is_read": False,
                "actor_id": "friend-1",
                "user_id": "test-user-id",
                "group_id": None,
                "resource_id": None,
                "session_id": None,
                "recommendation_id": "rec-1",
                "actor": {"username": "Alice", "avatar_url": None},
                "group": None,
                "resource": None,
                "recommendation": {
                    "id": "rec-1",
                    "status": "visit_with",
                    "building": {
                        "name": "Eiffel Tower",
                        "main_image_url": "https://placehold.co/100x100"
                    }
                },
                "session": None
            },
            {
                "id": "notif-2",
                "created_at": "2023-10-26T10:00:00Z",
                "type": "recommendation",
                "is_read": True,
                "actor_id": "friend-2",
                "user_id": "test-user-id",
                "group_id": None,
                "resource_id": None,
                "session_id": None,
                "recommendation_id": "rec-2",
                "actor": {"username": "Bob", "avatar_url": None},
                "group": None,
                "resource": None,
                "recommendation": {
                    "id": "rec-2",
                    "status": "pending",
                    "building": {
                        "name": "Empire State Building",
                        "main_image_url": "https://placehold.co/100x100"
                    }
                },
                "session": None
            }
        ]

        # Handle GET notifications (both unread and read calls)
        def handle_notifications(route):
            url = route.request.url
            if route.request.method == "GET":
                data = notifications_response
                # Simple filtering based on url params
                if "is_read=eq.false" in url:
                    data = [n for n in notifications_response if not n["is_read"]]
                elif "is_read=eq.true" in url:
                    data = [n for n in notifications_response if n["is_read"]]

                route.fulfill(
                    status=200,
                    body=json.dumps(data),
                    headers={"content-type": "application/json"}
                )
            else:
                # Handle PATCH (mark as read)
                route.fulfill(status=200, body='[]', headers={"content-type": "application/json"})

        page.route("**/rest/v1/notifications?*", handle_notifications)


        # Navigate to Notifications
        page.goto("http://localhost:3000/notifications")

        # Check for the text
        expect(page.get_by_text("Alice wants to visit Eiffel Tower with you")).to_be_visible()
        expect(page.get_by_text("Bob recommended Empire State Building for you")).to_be_visible()

        # Screenshot
        page.screenshot(path="verification/verify_notification_display.png")
        print("Verification successful!")

if __name__ == "__main__":
    verify_notification_display()
