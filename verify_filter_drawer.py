from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to test-drawer...")
    # No auth setup needed if the page is public
    page.goto("http://localhost:8080/test-drawer")

    # Wait for page load
    # Look for "Descubrir"
    try:
        page.wait_for_selector("text=Descubrir", timeout=5000)

        print("Drawer rendered. Taking screenshot 1.")
        page.screenshot(path="verification_drawer_discover.png")

        # Click "Mi Biblioteca"
        print("Switching to Library...")
        page.get_by_text("Mi Biblioteca").click()
        page.wait_for_timeout(500) # Wait for animation

        # Verify content changed
        if page.get_by_text("Controls for Library Mode").is_visible():
            print("Library mode visible.")
        else:
            print("Library mode NOT visible.")

        page.screenshot(path="verification_drawer_library.png")

        # Click "Global Filters" accordion (Categoría)
        print("Opening Accordion...")
        page.get_by_text("Categoría").click()
        page.wait_for_timeout(500)
        page.screenshot(path="verification_drawer_accordion.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="error_state.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
