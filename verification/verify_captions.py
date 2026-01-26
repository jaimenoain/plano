import time
import json
from playwright.sync_api import sync_playwright

def test_captions(page):
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PageError: {err}"))

    # Mock Auth
    page.context.add_init_script("""
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
            access_token: "mock-token",
            refresh_token: "mock-refresh",
            user: {
                id: "test-user-id",
                email: "test@example.com",
                user_metadata: { onboarding_completed: true }
            },
            expires_at: Math.floor(Date.now() / 1000) + 3600
        }));
    """)

    # Mock Building
    page.route("**/rest/v1/buildings?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([{
            "id": "b1",
            "name": "Test Building",
            "location": "POINT(0 0)",
            "address": "123 Test St",
            "year_completed": 2020,
            "created_by": "creator-id",
            "styles": [] # Mock styles as empty array or properly nested if needed
        }])
    ))

    # Mock building_architects
    page.route("**/rest/v1/building_architects?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Top Links
    page.route("**/rest/v1/rpc/get_building_top_links*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Feed (entries) for the building
    mock_feed = [
        {
            "id": "entry1",
            "content": "Great place!",
            "rating": 5,
            "status": "visited",
            "tags": [],
            "created_at": "2023-01-01T12:00:00Z",
            "user": {
                "username": "PhotoUser",
                "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4"
            },
            "images": [
                {
                    "id": "img1",
                    "storage_path": "path/to/img1.jpg",
                    "likes_count": 10,
                    "created_at": "2023-01-01T12:00:00Z",
                    "comments": [{"count": 5}]
                }
            ]
        }
    ]

    def handle_user_buildings(route):
        url = route.request.url
        # If querying specific user status
        if "user_id=eq.test-user-id" in url:
             route.fulfill(status=200, content_type="application/json", body='[]')
        else:
             # Feed query
             route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_feed))

    page.route("**/rest/v1/user_buildings?*", handle_user_buildings)

    # Mock Image request
    page.route("**/storage/v1/object/public/review_images/**", lambda route: route.fulfill(
        status=200,
        content_type="image/svg+xml",
        body='<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="gray"/></svg>'
    ))

    # Mock Google Maps
    page.add_init_script("""
        window.google = {
            maps: {
                Map: class { setOptions() {} addListener() {} fitBounds() {} },
                Marker: class { setMap() {} setPosition() {} },
                LatLng: class {},
                places: { Autocomplete: class { addListener() {} } },
                event: { addListener: () => {}, trigger: () => {}, clearListeners: () => {} }
            }
        };
    """)

    # Go to page
    print("Navigating...")
    page.goto("http://localhost:8080/building/b1")

    # Debug loop
    for i in range(10):
        time.sleep(1)
        # Check if building name is visible
        if page.locator("text=Test Building").first.is_visible():
            print("Building loaded!")
            break
        print("Waiting for building...")

    # Wait for content
    try:
        # Check for caption elements
        page.locator("text=PhotoUser").first.wait_for(timeout=5000)
        print("Found username in caption")

        # Take screenshot
        page.screenshot(path="verification/verification.png")
        print("Screenshot saved")
    except Exception as e:
        print(f"Failed to verify: {e}")
        page.screenshot(path="verification/error.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        test_captions(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
