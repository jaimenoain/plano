from playwright.sync_api import sync_playwright

def verify_map():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to Search Page
        page.goto("http://localhost:8080/search")

        # Wait for map container
        page.wait_for_selector("[data-testid='map-container']")

        # Wait a bit for tiles to load
        page.wait_for_timeout(3000)

        # Take screenshot
        screenshot_path = "/home/jules/verification/map_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_map()
