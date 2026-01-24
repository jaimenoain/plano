from playwright.sync_api import sync_playwright, Page, Route, expect

MOCK_ID = "00000000-0000-0000-0000-000000000000"

def respond_building(route: Route):
    route.fulfill(
        status=200,
        content_type="application/json",
        body=f'''{{
            "id": "{MOCK_ID}",
            "name": "Mock Building",
            "location": {{"type": "Point", "coordinates": [-0.1278, 51.5074]}},
            "address": "123 Mock St, London",
            "architects": ["Mock Architect"],
            "year_completed": 2023,
            "styles": ["Modern"],
            "main_image_url": null,
            "description": "A mock building for testing.",
            "created_by": "mock-user"
        }}'''
    )

def respond_user_building(route: Route):
    if "building_id" in route.request.url and "order" in route.request.url:
         # Feed
         route.fulfill(status=200, content_type="application/json", body='[]')
    else:
         # User status
         route.fulfill(status=200, content_type="application/json", body='null')

def handle_all_requests(route: Route):
    url = route.request.url
    if "/rest/v1/buildings" in url and "id=eq" in url:
        print(f"Intercepted building request: {url}")
        respond_building(route)
    elif "/rest/v1/user_buildings" in url:
        print(f"Intercepted user_building request: {url}")
        respond_user_building(route)
    else:
        route.continue_()

def test_building_map_style(page: Page):
    # Log console
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

    # Log all requests to check for map style
    page.on("request", lambda req: print(f"Request: {req.url}"))

    # Intercept all
    page.route("**/*", handle_all_requests)

    print(f"Navigating to page with ID {MOCK_ID}...")
    page.goto(f"http://localhost:8080/building/{MOCK_ID}")

    print("Waiting for building name...")
    page.wait_for_selector("text=Mock Building", timeout=10000)

    # Wait a bit for map to initialize and request style
    page.wait_for_timeout(5000)

    page.screenshot(path="/home/jules/verification/building_map_style.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        # Enable swiftshader for WebGL in headless if possible, though 'headless' arg usually suffices
        browser = p.chromium.launch(headless=True, args=['--use-gl=egl'])
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            test_building_map_style(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
