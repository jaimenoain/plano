
from playwright.sync_api import sync_playwright

def verify_filters(page):
    # Navigate to Search Page
    # The default port for Vite is 5173, but it might vary. I'll try 8080 or check the log.
    # Usually Vite uses 5173.
    page.goto("http://localhost:8080/search")

    # Wait for the filter button (ListFilter icon or button with filter icon)
    # The button is an icon button.
    # I'll look for the button that opens the sheet.
    # "Button 2: Filter Icon -> Filter Sheet"
    # It has a ListFilter icon.
    # I'll try to find it by role button.

    # Wait for page load
    page.wait_for_timeout(3000)

    # Find the filter button. It's the second button in the header likely.
    # It has a class 'h-10 w-10'.
    # I'll use a selector.

    # Click the filter button
    # There are two buttons: MapPin (Location) and ListFilter (Filter).
    # I can try to click the one that is not MapPin.
    page.locator("button:has(.lucide-list-filter)").click()

    # Wait for sheet to open
    page.wait_for_selector("div[role='dialog']")
    page.wait_for_timeout(1000)

    # Take screenshot of the sheet
    page.screenshot(path="verification/filters_drawer.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_filters(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
