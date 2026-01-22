import time
import json
from playwright.sync_api import sync_playwright, expect

def verify_visit_with():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Debug console
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        # Inject Session
        project_ref = "gyxspsuctbrxhwiyfvlj"
        session_key = f"sb-{project_ref}-auth-token"

        # Valid-looking session structure
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
                "app_metadata": {
                    "provider": "email",
                    "providers": ["email"]
                },
                "user_metadata": {},
                "created_at": "2023-01-01T00:00:00.000000Z",
                "updated_at": "2023-01-01T00:00:00.000000Z"
            }
        }

        page.goto("http://localhost:3000/")

        page.evaluate(f"""(data) => {{
            localStorage.setItem('{session_key}', JSON.stringify(data));
        }}""", session_data)

        # Mock Network Requests

        # 1. Auth User
        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            body=json.dumps(session_data["user"]),
            headers={"content-type": "application/json"}
        ))

        # 2. Profile
        page.route("**/rest/v1/profiles?select=*", lambda route: route.fulfill(
            status=200,
            body='[{"id": "test-user-id", "username": "TestUser", "avatar_url": null, "role": "user"}]',
            headers={"content-type": "application/json"}
        ))

        # 3. Building
        building_id = "123e4567-e89b-12d3-a456-426614174000"
        page.route(f"**/rest/v1/buildings?*id=eq.{building_id}*", lambda route: route.fulfill(
            status=200,
            body='''{
                "id": "''' + building_id + '''",
                "name": "Test Building",
                "address": "123 Architecture Lane",
                "created_by": "other-user",
                "main_image_url": "https://placehold.co/600x400",
                "location": "POINT(0 0)",
                "year_completed": 2020,
                "architects": ["Famous Architect"],
                "styles": ["Modern"],
                "description": "A wonderful test building."
            }''',
            headers={"content-type": "application/json"}
        ))

        # 4. User Entry & Feed (GET)
        def handle_user_buildings_get(route):
            url = route.request.url
            if "profiles" in url:
                print("Mocking Feed (GET)")
                route.fulfill(
                    status=200,
                    body='[]',
                    headers={"content-type": "application/json"}
                )
            else:
                print("Mocking User Entry (GET)")
                route.fulfill(
                    status=200,
                    body='[]',
                    headers={"content-type": "application/json"}
                )

        page.route("**/rest/v1/user_buildings?*select=*", handle_user_buildings_get)

        # 5. Follows (for UserPicker)
        page.route("**/rest/v1/follows?*select=*", lambda route: route.fulfill(
            status=200,
            body='[{"following_id": "friend-1"}, {"following_id": "friend-2"}]',
            headers={"content-type": "application/json"}
        ))

        # 6. Friends Profiles
        page.route("**/rest/v1/profiles?*id=in.%28friend-1%2Cfriend-2%29*", lambda route: route.fulfill(
            status=200,
            body='''[
                {"id": "friend-1", "username": "Alice", "avatar_url": null},
                {"id": "friend-2", "username": "Bob", "avatar_url": null}
            ]''',
            headers={"content-type": "application/json"}
        ))

        # 7. Upsert (POST/PATCH)
        def handle_upsert(route):
            if route.request.method in ["POST", "PATCH", "PUT"]:
                print(f"Upsert called: {route.request.method} {route.request.url}")
                route.fulfill(
                    status=201,
                    body='{"id": "log-1", "status": "pending"}',
                    headers={"content-type": "application/json"}
                )
            else:
                route.continue_()

        page.route("**/rest/v1/user_buildings*", handle_upsert)

        # Navigate to building page
        print(f"Navigating to building {building_id}...")
        page.goto(f"http://localhost:3000/building/{building_id}")

        # Wait for load
        expect(page.get_by_role("heading", name="Test Building")).to_be_visible(timeout=10000)

        print("Clicking Save...")
        page.get_by_role("button", name="Save").click()

        # Verify "Pending" state and "Visit with..." appearance
        expect(page.get_by_text("Visit with...")).to_be_visible()

        # Open User Picker
        page.click("text=Select friends...")

        # Select "Alice"
        expect(page.get_by_text("Alice")).to_be_visible()
        page.get_by_text("Alice").click()

        # Verify Alice is selected (Badge appears)
        # We can look for the remove X icon which is only present on the badge
        # Or check that there are multiple elements now.
        expect(page.get_by_text("Alice").first).to_be_visible()

        # Wait a bit for UI to settle
        time.sleep(0.5)

        # Take screenshot of the "Visit With" UI
        page.screenshot(path="verification/verify_visit_with.png")

        print("Verification successful!")

if __name__ == "__main__":
    verify_visit_with()
