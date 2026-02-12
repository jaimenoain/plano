from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()

    # Log console messages
    page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
    page.on("requestfailed", lambda request: print(f"REQUEST FAILED: {request.url} - {request.failure}"))
    page.on("response", lambda response: print(f"RESPONSE: {response.url} - {response.status}"))

    # Mock Auth (User)
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        body='{"id": "test-user-id", "aud": "authenticated", "role": "authenticated", "email": "test@example.com"}',
        headers={"content-type": "application/json"}
    ))

    # Mock Profile
    page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
        status=200,
        body='{"id": "owner-id", "username": "testuser", "full_name": "Test User"}',
        headers={"content-type": "application/json"}
    ))

    # Mock Collection
    page.route("**/rest/v1/collections*", lambda route: route.fulfill(
        status=200,
        body='{"id": "col-1", "owner_id": "owner-id", "name": "Test Collection", "slug": "test-collection", "description": "A test collection", "categorization_method": "uniform", "custom_categories": [], "show_community_images": true}',
        headers={"content-type": "application/json"}
    ))

    # Mock Collection Items (Buildings)
    # Point 1: 10, 10
    # Point 2: 20, 20
    # Center should be roughly 15, 15
    page.route("**/rest/v1/collection_items*", lambda route: route.fulfill(
        status=200,
        body='''[
            {
                "id": "item-1",
                "building_id": "b-1",
                "note": "Note 1",
                "custom_category_id": null,
                "is_hidden": false,
                "building": {
                    "id": "b-1",
                    "name": "Building 1",
                    "location": {"type": "Point", "coordinates": [10, 10]},
                    "city": "City 1",
                    "country": "Country 1",
                    "slug": "building-1",
                    "short_id": 1,
                    "year_completed": 2020,
                    "hero_image_url": null,
                    "community_preview_url": null,
                    "location_precision": "exact",
                    "building_architects": []
                }
            },
            {
                "id": "item-2",
                "building_id": "b-2",
                "note": "Note 2",
                "custom_category_id": null,
                "is_hidden": false,
                "building": {
                    "id": "b-2",
                    "name": "Building 2",
                    "location": {"type": "Point", "coordinates": [20, 20]},
                    "city": "City 2",
                    "country": "Country 1",
                    "slug": "building-2",
                    "short_id": 2,
                    "year_completed": 2021,
                    "hero_image_url": null,
                    "community_preview_url": null,
                    "location_precision": "exact",
                    "building_architects": []
                }
            }
        ]''',
        headers={"content-type": "application/json"}
    ))

    # Mock other potential calls to empty arrays to prevent errors
    page.route("**/rest/v1/collection_markers?*", lambda route: route.fulfill(status=200, body='[]', headers={"content-type": "application/json"}))
    page.route("**/rest/v1/collection_contributors?*", lambda route: route.fulfill(status=200, body='[]', headers={"content-type": "application/json"}))
    page.route("**/rest/v1/collection_favorites?*", lambda route: route.fulfill(status=200, body='[]', headers={"content-type": "application/json"}))
    page.route("**/rest/v1/user_buildings?*", lambda route: route.fulfill(status=200, body='[]', headers={"content-type": "application/json"}))
    # Mock RPC call if needed
    page.route("**/rest/v1/rpc/get_collection_stats", lambda route: route.fulfill(status=200, body='[]', headers={"content-type": "application/json"}))


    print("Navigating to collection page...")
    # Visit the page
    page.goto("http://localhost:8080/testuser/map/test-collection")

    print("Waiting for map to load...")
    # Wait for map canvas
    page.wait_for_selector(".maplibregl-canvas")

    # Wait for a bit to allow fitBounds animation (1s duration in code)
    time.sleep(3)

    # Check URL for lat/lng
    url = page.url
    print(f"Current URL: {url}")

    # Expected: lat around 15, lng around 15.
    # Default is 20, 0.

    # Simple assertion on URL params
    if "lat=" in url and "lng=" in url:
        print("URL contains lat/lng params.")
        # Parse params to verify
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        lat = float(params['lat'][0])
        lng = float(params['lng'][0])
        print(f"Lat: {lat}, Lng: {lng}")

        if 10 < lat < 20 and 10 < lng < 20:
             print("SUCCESS: Map centered correctly between points (10,10) and (20,20).")
        elif lat == 20 and lng == 0:
             print("FAILURE: Map is at default position (20, 0).")
        else:
             print(f"Map is at unexpected position: {lat}, {lng}")
    else:
        print("FAILURE: URL does not contain lat/lng params (map didn't move?).")

    # Take screenshot
    page.screenshot(path="verification/verification.png")
    print("Screenshot saved to verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
