from playwright.sync_api import sync_playwright, expect
import time

def verify_card():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Wait for server to start
        print("Waiting for server...")
        for i in range(30):
            try:
                page.goto("http://localhost:8080/verify-card")
                break
            except Exception as e:
                time.sleep(1)
                print(f"Retrying... {e}")

        # Check if page loaded
        try:
            expect(page.get_by_text("With Image (Short Wrap)")).to_be_visible(timeout=10000)
        except Exception:
             # Try to dump content
             print("Content:", page.content())
             raise

        # Take screenshot
        page.screenshot(path="verification/verification.png", full_page=True)
        print("Screenshot saved to verification/verification.png")

        browser.close()

if __name__ == "__main__":
    verify_card()
