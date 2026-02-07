import time
from playwright.sync_api import sync_playwright

def verify_map():
    with sync_playwright() as p:
        # Enable SwiftShader for WebGL in headless mode
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--use-gl=angle",
                "--use-angle=swiftshader"
            ]
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Listen for console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # Navigate to the search page where the map is
        print("Navigating to search page...")
        page.goto("http://localhost:8080/search")

        # Wait for the map container to be visible
        print("Waiting for map container...")
        try:
            handle = page.wait_for_selector("[data-testid='map-container']", state="visible", timeout=30000)
            print("Map container found.")

            # Check dimensions
            bbox = handle.bounding_box()
            print(f"Map container bbox: {bbox}")

            # Check computed style height
            height = page.evaluate("el => getComputedStyle(el).height", handle)
            width = page.evaluate("el => getComputedStyle(el).width", handle)
            print(f"Map container computed style: {width} x {height}")

        except Exception as e:
            print(f"Error waiting for map container: {e}")

        # Give it a moment to render tiles (satellite)
        time.sleep(10)

        # Take a screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification_map.png")

        browser.close()

if __name__ == "__main__":
    verify_map()
