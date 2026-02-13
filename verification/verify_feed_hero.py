from playwright.sync_api import sync_playwright

def verify_feed_hero():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Mobile Viewport
        page_mobile = browser.new_page(viewport={"width": 375, "height": 1200})
        page_mobile.goto("http://localhost:5173/verify-feed-hero")
        page_mobile.wait_for_load_state("networkidle")
        # Ensure images are loaded (or placeholders)
        page_mobile.wait_for_timeout(2000)
        page_mobile.screenshot(path="verification/feed_hero_mobile.png", full_page=True)
        print("Mobile screenshot taken.")

        # Desktop Viewport
        page_desktop = browser.new_page(viewport={"width": 1024, "height": 1200})
        page_desktop.goto("http://localhost:5173/verify-feed-hero")
        page_desktop.wait_for_load_state("networkidle")
        page_desktop.wait_for_timeout(2000)
        page_desktop.screenshot(path="verification/feed_hero_desktop.png", full_page=True)
        print("Desktop screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_feed_hero()
