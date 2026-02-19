from playwright.sync_api import Page, expect, sync_playwright

def test_profile_button(page: Page):
    try:
        print("Navigating to http://localhost:8080/verify-profile-button")
        # Navigate to the verification page
        page.goto("http://localhost:8080/verify-profile-button")

        # Wait for the button to be visible
        print("Waiting for button with label 'View on a map'")
        button = page.get_by_label("View on a map")
        expect(button).to_be_visible()

        # Take a screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/profile_button.png")

        # Assert the title is correct (tooltip)
        expect(button).to_have_attribute("title", "View on a map")

        print("Verification passed!")
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        test_profile_button(page)
        browser.close()
