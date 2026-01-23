from playwright.sync_api import Page, expect, sync_playwright
import time
import os

def test_search_page(page: Page):
    # 1. Arrange: Go to the Search page.
    print("Navigating to search page...")
    page.goto("http://localhost:8080/search")

    # 2. Act: Wait for load.
    print("Waiting for page load...")
    page.wait_for_timeout(5000)

    # Verify elements exist
    print("Verifying input...")
    expect(page.get_by_placeholder("Search by name or architect...")).to_be_visible()

    # Type in search
    print("Typing 'Tower'...")
    page.get_by_placeholder("Search by name or architect...").fill("Tower")

    # Wait for debounce and fetch
    print("Waiting for results...")
    page.wait_for_timeout(3000)

    # 4. Screenshot
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")
    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/search_page.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_search_page(page)
            print("Verification script ran successfully.")
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
