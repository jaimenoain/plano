import time
import json
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 375, "height": 667})
    page = context.new_page()

    # Console logs
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

    # Mock Auth Session
    fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjE5OTk5OTk5OTl9.signature"
    session_data = {
        "access_token": fake_jwt,
        "refresh_token": "fake-refresh-token",
        "expires_in": 3600,
        "expires_at": 1999999999,
        "user": {
            "id": "user123",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "confirmed_at": "2023-01-01T00:00:00Z",
            "last_sign_in_at": "2023-01-01T00:00:00Z",
            "app_metadata": { "provider": "email", "providers": ["email"] },
            "user_metadata": { "username": "TestUser" },
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }
    }

    # Project ID
    project_id = "lnqxtomyucnnrgeapnzt"
    token_key = f"sb-{project_id}-auth-token"

    # Set localStorage
    page.goto("http://localhost:8080/404")
    page.evaluate(f"""() => {{
        localStorage.setItem('{token_key}', '{json.dumps(session_data)}');
    }}""")

    # Mock RPCs
    page.route("**/rest/v1/rpc/search_buildings", lambda route: route.fulfill(status=200, content_type="application/json", body='[]'))
    page.route("**/rest/v1/rpc/get_building_top_links", lambda route: route.fulfill(status=200, body='[]'))
    page.route("**/rest/v1/rpc/find_nearby_buildings", lambda route: route.fulfill(status=200, body='[]'))
    page.route("**/rest/v1/rpc/get_user_location", lambda route: route.fulfill(status=200, body='{"lat": 0, "lng": 0}'))

    # Mock User Profile
    page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "user123", "username": "TestUser", "avatar_url": null, "favorites": []}'
    ))

    print("Navigating to /search...")
    page.goto("http://localhost:8080/search")

    # Wait
    time.sleep(5)

    # Check if main exists
    main_count = page.locator("main").count()
    print(f"Main element count: {main_count}")

    if main_count == 0:
        # Check body content
        body_text = page.locator("body").inner_text()
        print(f"Body text preview: {body_text[:200]}")
        page.screenshot(path="verification/error_screenshot.png")
    else:
        page.screenshot(path="verification/verification_map_bottom_before.png")
        print("Screenshot saved.")

        container = page.locator("main > div").first
        bottom_nav = page.locator("nav.fixed.bottom-0")

        if container.count() > 0 and bottom_nav.count() > 0:
            container_box = container.bounding_box()
            nav_box = bottom_nav.bounding_box()

            if container_box and nav_box:
                container_bottom = container_box['y'] + container_box['height']
                nav_top = nav_box['y']

                print(f"Container bottom: {container_bottom}")
                print(f"Nav top: {nav_top}")

                overlap = container_bottom - nav_top
                print(f"Overlap: {overlap} pixels")
        else:
            print(f"Container count: {container.count()}, Nav count: {bottom_nav.count()}")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        run(p)
