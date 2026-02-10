from playwright.sync_api import sync_playwright

def run():
    print("Starting Playwright...")
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        print("Navigating to http://localhost:8080/search")
        page.goto("http://localhost:8080/search", timeout=60000)

        # Wait for application to load (assuming map or something loads)
        print("Waiting for 'Filters' button...")
        try:
            page.wait_for_selector("button:has-text('Filters')", timeout=60000)
        except Exception as e:
            print("Failed to find 'Filters' button. Taking screenshot of error state.")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e

        print("Found 'Filters' button. Clicking...")
        page.click("button:has-text('Filters')")

        print("Waiting for 'Global Filters' text...")
        page.wait_for_selector("text=Global Filters", timeout=10000)

        print("Waiting for 'Function' accordion...")
        page.wait_for_selector("button:has-text('Function')", timeout=10000)

        print("Clicking 'Function' accordion...")
        page.click("button:has-text('Function')")

        print("Waiting for 'Category' label...")
        page.wait_for_selector("text=Category", timeout=5000)

        # Wait for animation
        page.wait_for_timeout(1000)

        print("Taking verification screenshot...")
        page.screenshot(path="/home/jules/verification/verification.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    run()
