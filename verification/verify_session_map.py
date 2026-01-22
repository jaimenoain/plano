
import re
import json
from playwright.sync_api import sync_playwright, expect

# Mock data
MOCK_SESSION = {
    "id": "session-1",
    "title": "Modernist Walk",
    "description": "A walk through the city center.",
    "session_date": "2026-06-15T10:00:00Z",
    "status": "published",
    "buildings": [
        {
            "is_main": True,
            "building": {
                "id": "b1",
                "name": "The Shard",
                "location": "POINT(-0.0865 51.5045)",
                "main_image_url": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
                "year_completed": 2012,
                "architects": ["Renzo Piano"]
            }
        },
        {
            "is_main": False,
            "building": {
                "id": "b2",
                "name": "Tate Modern",
                "location": "POINT(-0.0993 51.5076)",
                "main_image_url": "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
                "year_completed": 2000,
                "architects": ["Herzog & de Meuron"]
            }
        }
    ]
}

def verify_session_map(page):
    target_url_list = "http://localhost:3000/groups/test-group"

    # Mock Group - make it PUBLIC to bypass join screen
    page.route("**/rest/v1/groups?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([{
            "id": "group-1",
            "name": "Test Group",
            "slug": "test-group",
            "created_by": "user-1",
            "is_public": True,  # FORCE PUBLIC
            "description": "A public test group"
        }])
    ))

    # Mock Members - make me a member just in case
    page.route("**/rest/v1/group_members?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([{"user_id": "test-user-id", "role": "member"}]) # Mocking auth is harder, but public group should work
    ))

    # Mock Sessions
    page.route("**/rest/v1/group_sessions?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([MOCK_SESSION])
    ))

    # Mock Building details if fetched individually
    page.route("**/rest/v1/buildings?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([])
    ))

    page.goto(target_url_list)

    # Wait for the card to appear
    try:
        expect(page.get_by_text("Modernist Walk")).to_be_visible(timeout=20000)
    except Exception as e:
        print("Timeout waiting for 'Modernist Walk'. Dumping page content...")
        raise e

    page.wait_for_timeout(5000) # Give map time to init

    # MapLibre usually creates a canvas class 'maplibregl-canvas' or map container
    # Since we used MapGL from react-map-gl, look for the container div we added
    # We didn't add a specific ID, but we added a class in SessionCard.tsx: "h-48 w-full shadow-sm border-border/50"
    # But that class might be hard to select if minified or common.
    # The map library usually adds a canvas.

    map_canvas = page.locator("canvas.maplibregl-canvas")
    expect(map_canvas).to_be_visible()

    # Take screenshot
    page.screenshot(path="verification/session_card_map.png")
    print("Screenshot taken at verification/session_card_map.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        verify_session_map(page)
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()
