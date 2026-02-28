from playwright.sync_api import sync_playwright

def test_url(page):
    # Set status
    page.goto("http://localhost:8080/search")
    page.wait_for_timeout(2000)

    page.set_viewport_size({"width": 375, "height": 812})

    filters_btn = page.locator("button[aria-label='Filters']").first
    filters_btn.click()
    page.wait_for_timeout(1000)

    # Click a rating
    library_mode = page.locator("text=My Library")
    if library_mode.is_visible():
        library_mode.click()

    page.wait_for_timeout(1000)

    # Check the URL
    print(f"Current URL: {page.url}")

    # Click visited
    visited = page.locator("button[aria-label='Toggle visited']")
    if visited.is_visible():
        visited.click()
    page.wait_for_timeout(1000)

    print(f"After toggling visited URL: {page.url}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            test_url(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
