from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()

    print("Navigating to /search...")
    # Navigate to the search page
    page.goto("http://localhost:8080/search")

    # Wait for initial load
    page.wait_for_timeout(5000)

    print("Taking screenshot...")
    # Take a screenshot of the page
    page.screenshot(path="verification/building_sidebar.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
