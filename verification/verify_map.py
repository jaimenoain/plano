import time
import os
from playwright.sync_api import sync_playwright, Page, expect

def test_collection_map(page: Page):
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"Browser error: {exc}"))

    # Mock profile - single object
    page.route("**/rest/v1/profiles?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "user-123", "username": "jules"}'
    ))

    # Mock collection details - single object
    page.route("**/rest/v1/collections?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "col-123", "name": "My Trip", "description": "NYC and London", "owner_id": "user-123", "is_public": true, "slug": "my-trip"}'
    ))

    # Mock collection items
    items_body = """
    [
        {
            "id": "item-1",
            "building_id": "b-1",
            "note": "NYC Building",
            "order_index": 0,
            "building": {
                "id": "b-1",
                "name": "Empire State",
                "location": "0101000020E610000000000000000000000000000000000000",
                "location_lat": 40.7128,
                "location_lng": -74.0060,
                "city": "New York",
                "country": "USA",
                "year_completed": 1931,
                "hero_image_url": "https://example.com/nyc.jpg",
                "location_precision": "exact"
            }
        },
        {
            "id": "item-2",
            "building_id": "b-2",
            "note": "London Building",
            "order_index": 1,
            "building": {
                "id": "b-2",
                "name": "The Shard",
                "location": "0101000020E610000000000000000000000000000000000000",
                "location_lat": 51.5074,
                "location_lng": -0.1278,
                "city": "London",
                "country": "UK",
                "year_completed": 2012,
                "hero_image_url": "https://example.com/london.jpg",
                "location_precision": "exact"
            }
        }
    ]
    """
    page.route("**/rest/v1/collection_items?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=items_body
    ))

    # Mock user buildings map (status)
    page.route("**/rest/v1/user_buildings?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock findNearbyBuildingsRpc
    page.route("**/rpc/find_nearby_buildings*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Supabase auth session
    page.route("**/auth/v1/user", lambda route: route.fulfill(status=401, body='{}'))
    page.route("**/auth/v1/session", lambda route: route.fulfill(status=401, body='{}'))

    # Navigate
    print("Navigating...")
    page.goto("http://localhost:8080/map/jules/my-trip")

    print(f"Current URL: {page.url}")

    # Wait for map
    print("Waiting for map container...")
    expect(page.get_by_test_id("map-container")).to_be_visible(timeout=5000)

    # Wait a bit for map interaction
    time.sleep(3)

    # Screenshot
    cwd = os.getcwd()
    page.screenshot(path=f"{cwd}/verification/collection-map.png")
    print("Final screenshot taken")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_collection_map(page)
        except Exception as e:
            print(f"Error: {e}")
            print(f"Current URL: {page.url}")
            cwd = os.getcwd()
            page.screenshot(path=f"{cwd}/verification/error.png")
        finally:
            browser.close()
