from playwright.sync_api import Page, expect, sync_playwright
import time
import os

def test_search_page(page: Page):
    print("Navigating to search page...")
    page.goto("http://localhost:8080/search")

    # Wait for page load
    time.sleep(5)

    print(f"Current URL: {page.url}")
    print(f"Page Title: {page.title()}")

    print("Checking for toggle buttons (should be absent)...")

    search_input = page.get_by_placeholder("Search buildings, architects...")
    if search_input.is_visible():
        print("Search input found.")
    else:
        print("Search input NOT found.")

    # Take a screenshot
    # Use absolute path mapped to sandbox
    output_path = os.path.abspath("verification/verification.png")
    page.screenshot(path=output_path)
    print(f"Screenshot taken at {output_path}")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_search_page(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
