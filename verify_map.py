from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()

    print("Navigating to http://localhost:8080/search...")
    page.goto("http://localhost:8080/search")

    print("Waiting for canvas...")
    try:
        page.wait_for_selector("canvas", timeout=30000)
        print("Canvas found.")

        # Wait for data to load and render markers
        page.wait_for_timeout(5000)

        # Try to hover something if possible, but blindly it is hard.
        # Just verifying the map renders is enough to show no regression in initial load.

        print("Taking screenshot...")
        page.screenshot(path="verification_map.png")
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification_error_search.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
