
import os
from playwright.sync_api import sync_playwright

def verify_groups_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile view to check responsive layout too, or desktop
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Navigate to Groups page
        # Note: Since auth is required, we might just land on Landing page if not authenticated.
        # But we can try to see what's visible.
        # If we can't bypass auth easily, we'll verify the landing page or login page and at least confirm server is running.
        # Ideally we'd mock auth or have a test user session, but lacking that, we check accessibility.

        try:
            page.goto("http://localhost:3000/groups", timeout=30000)
            page.wait_for_load_state("networkidle")

            # Take a screenshot
            if not os.path.exists("verification"):
                os.makedirs("verification")

            screenshot_path = "verification/groups_page.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            # Check for specific text if visible (might be behind auth wall)
            content = page.content()
            if "Architecture Club" in content:
                print("SUCCESS: Found 'Architecture Club' text on the page.")
            elif "Sign in" in content or "Get Started" in content:
                print("INFO: Redirected to Auth/Landing page. Cannot verify 'Architecture Club' text without auth.")
            else:
                print("INFO: Page loaded but 'Architecture Club' text not found immediately.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_groups_ui()
