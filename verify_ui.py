from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to /verification...")
            page.goto("http://localhost:8080/verification")
            page.wait_for_selector(".shadow-subtle") # Wait for our class
            page.screenshot(path="verification_card_style.png")
            print("Captured verification_card_style.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui()
