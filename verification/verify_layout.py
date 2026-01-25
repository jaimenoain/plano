from playwright.sync_api import sync_playwright, expect

def verify_search_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to ensure desktop view
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        try:
            # Navigate to the search page
            page.goto("http://localhost:8080/search")

            # Wait for the search input to be visible
            search_input = page.get_by_placeholder("Search buildings, architects...")
            expect(search_input).to_be_visible(timeout=10000)

            # Take a screenshot of the top area including the filter bar and part of the content
            page.screenshot(path="verification/search_layout_desktop.png")

            print("Screenshot taken at verification/search_layout_desktop.png")

        except Exception as e:
            print(f"Error: {e}")
            try:
                page.screenshot(path="verification/error_screenshot.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_search_layout()
