from playwright.sync_api import sync_playwright

def verify_circles():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to home page
        print("Navigating to home page...")
        page.goto("http://localhost:8080/")

        # Wait for network idle to ensure redirections happen
        page.wait_for_load_state("networkidle")

        print(f"Current URL: {page.url}")

        # Screenshot home page or login page
        page.screenshot(path="/home/jules/verification/home_page.png")
        print("Screenshot saved to /home/jules/verification/home_page.png")

        browser.close()

if __name__ == "__main__":
    verify_circles()
