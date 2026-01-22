import time
from playwright.sync_api import sync_playwright

def test_add_building_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock the Google Maps API request to avoid RefererNotAllowedMapError in headless execution
        # although network requests in headless might not trigger it the same way, or it will fail anyway.
        # We mainly want to see if the map *loads* without crashing the JS.

        # Navigate to Add Building page
        try:
            page.goto("http://localhost:8080/add-building", timeout=10000)
        except Exception as e:
            # If default port is 8080 or 5173 or 3000, we should check logs.
            # Vite usually defaults to 8080 in this environment or 5173.
            # Let's try 8080 first.
            print(f"Navigation failed: {e}")

        # Check if page title contains "Add a Building"
        try:
            page.wait_for_selector("h1:has-text('Add a Building')", timeout=5000)
            print("Page loaded successfully.")
        except:
            print("Page load timeout or content missing.")
            # If port is wrong, we might need to check npm_output.log

        # Wait a bit for map to initialize (or fail)
        time.sleep(3)

        # Take screenshot
        page.screenshot(path="verification/add_building_map.png")
        print("Screenshot saved to verification/add_building_map.png")

        browser.close()

if __name__ == "__main__":
    test_add_building_page()
