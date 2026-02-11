from playwright.sync_api import sync_playwright

def find_collection():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            print("Navigating to profile...")
            page.goto("http://localhost:8080/profile/globetrotter_1968")
            # Wait for content
            page.wait_for_selector("a[href*='/map/']", timeout=10000)

            links = page.locator("a[href*='/map/']").all()
            if links:
                first_link = links[0].get_attribute("href")
                print(f"FOUND_LINK: {first_link}")
            else:
                print("NO_LINKS_FOUND")
        except Exception as e:
            print(f"ERROR: {e}")
            page.screenshot(path="error_profile.png")
        finally:
            browser.close()

if __name__ == "__main__":
    find_collection()
