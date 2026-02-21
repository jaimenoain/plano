import json
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    # Mock Auth (Profile)
    page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({"id": "user-123", "username": "jules"})
    ))

    # Mock Collection
    # Supabase .single() expects an object if the header is set, but let's see.
    # We will return the object directly.
    page.route("**/rest/v1/collections*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "id": "col-123",
            "name": "Test Collection",
            "owner_id": "user-123",
            "slug": "test-collection",
            "itinerary": True,
            "categorization_method": "none",
            "show_community_images": True,
            "description": "A test collection to verify layout."
        })
    ))

    # Mock Collection Items (Need many to scroll)
    items = []
    for i in range(20):
        items.append({
            "id": f"item-{i}",
            "building_id": f"bldg-{i}",
            "note": f"Note {i}",
            "custom_category_id": None,
            "is_hidden": False,
            "building": {
                "id": f"bldg-{i}",
                "name": f"Building {i}",
                "location": {"lat": 40.7128 + i*0.01, "lng": -74.0060},
                "city": "New York",
                "country": "USA",
                "slug": f"building-{i}",
                "short_id": i,
                "year_completed": 2020,
                "hero_image_url": "https://placehold.co/600x400",
                "community_preview_url": "https://placehold.co/600x400",
                "location_precision": "exact",
                "building_architects": []
            }
        })

    page.route("**/rest/v1/collection_items*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(items)
    ))

    # Mock Markers
    page.route("**/rest/v1/collection_markers*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Contributors (empty)
    page.route("**/rest/v1/collection_contributors*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Favorites
    page.route("**/rest/v1/collection_favorites*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock User Buildings (Interactions)
    page.route("**/rest/v1/user_buildings*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Stats RPC
    page.route("**/rpc/get_collection_stats", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Navigate
    try:
        print("Navigating to collection page...")
        page.goto("http://localhost:3000/jules/map/test-collection")

        # Wait for content
        try:
            page.wait_for_selector("text=Building 0", timeout=10000)
        except:
            print("Timeout waiting for content. Taking debug screenshot.")
            page.screenshot(path="verification/debug_timeout.png")
            raise

        # Check All Items Tab
        print("Taking screenshot of All Items tab...")
        page.screenshot(path="verification/all_items_tab.png")

        # Click Itinerary Tab
        print("Clicking Itinerary tab...")
        # The tab trigger has value="itinerary". Use get_by_role('tab', name='Itinerary')
        page.get_by_role("tab", name="Itinerary").click()

        time.sleep(1) # Wait for animation/render

        # Screenshot Itinerary Tab
        print("Taking screenshot of Itinerary tab...")
        page.screenshot(path="verification/itinerary_tab.png")

        print("Verification complete.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
