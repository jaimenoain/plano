from playwright.sync_api import sync_playwright

def test_add_building_radius():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            permissions=["geolocation"]
        )
        page = context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Variable to store the request payload
        request_payload = {}

        # Intercept the RPC call
        def handle_route(route):
            request = route.request
            if "find_nearby_buildings" in request.url:
                print(f"Intercepted RPC call: {request.url}")
                try:
                    # Post data is JSON
                    data = request.post_data_json
                    print(f"Request payload: {data}")
                    request_payload.update(data)
                except Exception as e:
                    print(f"Error parsing post data: {e}")

                # Mock response to avoid actual DB call
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='[]'
                )
            else:
                route.continue_()

        # Intercept specifically RPC calls
        page.route("**/rest/v1/rpc/find_nearby_buildings*", handle_route)

        print("Navigating to Add Building page...")
        page.goto("http://localhost:3000/add-building")

        # Check if we are redirected
        if "/auth" in page.url:
            print("Redirected to auth.")
        else:
            print("On Add Building page.")

            # Wait for map to be ready.
            # We can look for the canvas
            try:
                page.wait_for_selector(".maplibregl-canvas", timeout=10000)
                print("Map canvas appeared.")
            except:
                print("Map canvas not found within timeout.")

            # Additional wait for map initialization
            page.wait_for_timeout(3000)

            # Locate map canvas
            canvas = page.locator(".maplibregl-canvas")
            if canvas.count() > 0:
                print("Found map canvas.")
                box = canvas.bounding_box()
                if box:
                    x = box['x'] + box['width'] / 2
                    y = box['y'] + box['height'] / 2
                    print(f"Clicking at {x}, {y}")
                    page.mouse.click(x, y)
                else:
                    print("Could not get bounding box.")
            else:
                print("Map canvas not found via selector, trying hardcoded coordinates")
                page.mouse.click(900, 300)

            # Wait for debounce (500ms) and network
            print("Waiting for RPC call...")
            page.wait_for_timeout(3000)

            # Verify the radius
            radius = request_payload.get('radius_meters')
            print(f"Captured radius_meters: {radius}")

            if radius == 50:
                print("SUCCESS: radius_meters is 50")
                page.screenshot(path="/home/jules/verification/verification.png")
            else:
                print(f"FAILURE: radius_meters is {radius}, expected 50")
                # Take screenshot of failure state
                page.screenshot(path="/home/jules/verification/failure.png")

                # Also dump page content to see if there are errors visible
                # print(page.content())

        browser.close()

if __name__ == "__main__":
    test_add_building_radius()
