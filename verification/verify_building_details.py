from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Ensure output dir exists
    os.makedirs("verification", exist_ok=True)

    # Go to Search page
    print("Navigating to /search...")
    try:
        page.goto("http://localhost:8080/search", timeout=30000)
    except Exception as e:
        print(f"Failed to load page: {e}")
        browser.close()
        return

    # Wait for building list
    print("Waiting for building links...")
    try:
        # Wait for at least one building card link
        page.wait_for_selector('a[href*="/building/"]', timeout=20000)
    except:
        print("Timeout waiting for building links. Taking screenshot of search page.")
        page.screenshot(path="verification/search_page_fail.png")
        browser.close()
        return

    # Click the first building link
    first_building = page.locator('a[href*="/building/"]').first
    href = first_building.get_attribute("href")
    print(f"Clicking building link: {href}")
    first_building.click()

    # Wait for details page to load
    print("Waiting for building details...")
    try:
        # Wait for the main building name header to appear
        page.wait_for_selector('h1', timeout=20000)
        # Give a bit more time for valid rendering of async components
        page.wait_for_timeout(3000)
    except:
        print("Timeout waiting for details page.")
        page.screenshot(path="verification/details_fail.png")
        browser.close()
        return

    # Take screenshot of the relevant section (or full page)
    print("Taking screenshot...")
    page.screenshot(path="verification/building_details.png", full_page=True)

    # Verify elements via code as well
    content = page.content()

    if "Write Review" in content and "Edit Review" not in content:
        print("Warning: 'Write Review' text found in content.")

    if "Your Interest" in content:
        print("FAIL: 'Your Interest' title still present.")
    else:
        print("PASS: 'Your Interest' title absent.")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
