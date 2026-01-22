import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Console logging
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

    # Intercept RPC call to return mock duplicates with image
    def handle_rpc(route):
        print(f"Intercepted: {route.request.url}")
        # Only intercept find_nearby_buildings
        if "find_nearby_buildings" not in route.request.url:
            route.continue_()
            return

        print("Providing mock response for find_nearby_buildings")
        route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id":"1","name":"Test Building with Image","address":"123 Test St","location_lat":51.5074,"location_lng":-0.1278,"dist_meters":10,"similarity_score":0.95,"main_image_url":"https://images.unsplash.com/photo-1577761133163-475dabc9d56c?w=100&h=100&fit=crop"},{"id":"2","name":"Test Building No Image","address":"456 Test Ave","location_lat":51.5075,"location_lng":-0.1279,"dist_meters":50,"similarity_score":0.8,"main_image_url":null}]'
        )

    # Note: Supabase RPC calls go to /rest/v1/rpc/...
    page.route("**/rest/v1/rpc/find_nearby_buildings*", handle_rpc)

    try:
        # Navigate to Add Building page
        page.goto("http://localhost:8080/add-building")
        page.wait_for_load_state("networkidle")

        print("Page loaded. Waiting a bit for map...")
        time.sleep(3)

        # Click on the map to place a pin
        print("Clicking on map...")
        canvas = page.locator("canvas.maplibregl-canvas")
        if canvas.is_visible():
            box = canvas.bounding_box()
            if box:
                # Click slightly off-center to avoid any center markers if any
                page.mouse.click(box["x"] + box["width"] / 2 + 10, box["y"] + box["height"] / 2 + 10)
                print("Clicked map.")
            else:
                print("Canvas bounding box not found")
        else:
            print("Canvas not visible")

        # Check if marker appeared (red pin)
        # The marker in code has class or structure: <div class="flex flex-col items-center">...<MapPin .../>...</div>
        # But easier to check for "Nearby Buildings" or "Checking nearby..."

        print("Waiting for duplicates list...")
        # It might take a moment for the debounce and RPC
        try:
            page.wait_for_selector("text=Nearby Buildings", timeout=5000)
            print("Duplicates list found!")
        except Exception:
            print("Duplicates list NOT found. Checking for 'Checking nearby...'")
            if page.locator("text=Checking nearby...").is_visible():
                print("'Checking nearby...' is visible.")
            else:
                print("'Checking nearby...' is NOT visible.")

        # Take screenshot of the sidebar with duplicates
        print("Taking screenshot...")
        page.screenshot(path="verification_duplicates.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification_error_retry.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
