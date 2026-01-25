from playwright.sync_api import sync_playwright
import json
import time
import os

def verify_map_toggle():
    os.makedirs('verification', exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Mock Network
        def handle_buildings(route):
            url = route.request.url
            if 'id=eq.b1' in url:
                route.fulfill(
                    status=200,
                    content_type='application/json',
                    body=json.dumps([{
                        'id': 'b1',
                        'name': 'Test Building',
                        'location': { 'type': 'Point', 'coordinates': [-0.1278, 51.5074] },
                        'address': '123 Test St, London',
                        'architects': ['Test Architect'],
                        'year_completed': 2020,
                        'styles': ['Modern'],
                        'main_image_url': 'https://example.com/image.jpg',
                        'description': 'A test building',
                        'created_by': 'user-other'
                    }]) # Supabase returns array for select unless single() is used, but utility likely handles it.
                    # fetchBuildingDetails uses .single() usually or .maybeSingle().
                    # Let's check fetchBuildingDetails in utils/supabaseFallback.ts if possible, or just return an object if single is expected.
                    # The test used object. I'll stick to object if the request expects object.
                    # Actually Supabase client returns object for single().
                )
            else:
                route.continue_()

        # The previous test mocked body as object.
        # But wait, supabase .select() returns array. .single() returns object.
        # If the code uses .single(), we should return object.

        page.route('**/rest/v1/buildings*', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps({
                        'id': 'b1',
                        'name': 'Test Building',
                        'location': { 'type': 'Point', 'coordinates': [-0.1278, 51.5074] },
                        'address': '123 Test St, London',
                        'architects': ['Test Architect'],
                        'year_completed': 2020,
                        'styles': ['Modern'],
                        'main_image_url': 'https://example.com/image.jpg',
                        'description': 'A test building',
                        'created_by': 'user-other'
            })
        ))

        page.route('**/rest/v1/user_buildings*', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps(None)
        ))

        # Mock other RPCs if needed
        page.route('**/rest/v1/rpc/get_building_top_links', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps([])
        ))

        page.route('**/rest/v1/building_architects*', lambda route: route.fulfill(
             status=200,
            content_type='application/json',
            body=json.dumps([])
        ))

        # Navigate
        page.goto('http://localhost:8080/building/b1')

        # Wait for map to load
        # MapLibre container usually has class 'maplibregl-map'
        try:
            page.wait_for_selector('.maplibregl-map', timeout=10000)
        except:
             print("Map selector not found. Dumping content.")
             # print(page.content())
             page.screenshot(path='verification/debug_fail_load.png')
             raise

        # 1. Expand Map
        # Find the expand button. It has title "Expand Map"
        expand_button = page.get_by_title("Expand Map")
        if not expand_button.is_visible():
             print("Expand button not visible")
             page.screenshot(path='verification/debug_no_expand.png')

        expand_button.click()

        # Wait for expansion animation/state update
        page.wait_for_timeout(1000)

        # 2. Verify Satellite Toggle is visible
        satellite_button = page.get_by_title("Show Satellite")
        if satellite_button.is_visible():
            print("Satellite toggle button is visible.")
        else:
            print("Satellite toggle button is NOT visible.")
            # Take debug screenshot
            page.screenshot(path='verification/debug_not_visible.png')
            raise Exception("Satellite toggle button not found")

        # 3. Click Satellite Toggle
        satellite_button.click()
        page.wait_for_timeout(500)

        # 4. Verify button changed to "Show Map"
        map_button = page.get_by_title("Show Map")
        if map_button.is_visible():
             print("Button changed to 'Show Map'.")
        else:
             print("Button did NOT change to 'Show Map'.")
             raise Exception("Button state check failed")

        # 5. Take screenshot of Satellite View
        page.screenshot(path='verification/satellite_view.png')
        print("Screenshot saved to verification/satellite_view.png")

        browser.close()

if __name__ == '__main__':
    verify_map_toggle()
