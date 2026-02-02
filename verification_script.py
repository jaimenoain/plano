from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    # The user ID I found earlier that has photos
    user_id = "08ebd70c-eab9-4402-8552-57e1e386c945"
    url = f"http://localhost:8080/profile/{user_id}/photos"

    print(f"Navigating to {url}")
    page.goto(url)

    # Wait for loading to finish (Loader2 should disappear)
    try:
        # Expect the loader to disappear
        page.wait_for_selector(".animate-spin", state="hidden", timeout=10000)
    except Exception as e:
        print(f"Loader did not disappear: {e}")

    # Check if photos are displayed
    # The component renders <img alt="photo.building.name"> or "User photo"
    # The container has class "grid"

    # Take screenshot
    os.makedirs("/home/jules/verification", exist_ok=True)
    screenshot_path = "/home/jules/verification/photo_gallery.png"
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"Screenshot saved to {screenshot_path}")

    # Check if we see photos
    images = page.locator("img")
    count = images.count()
    print(f"Found {count} images")

    # If count is 0, it might be "No photos uploaded yet" or still loading or error.
    if count == 0:
        content = page.content()
        if "No photos uploaded yet" in content:
             print("Page says: No photos uploaded yet.")
        elif "User not found" in content:
             print("Page says: User not found.")
        else:
             print("Page content snippet:", content[:500])

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
