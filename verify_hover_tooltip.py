import time
from playwright.sync_api import sync_playwright, expect

def test_hover_tooltip(page):
    # Navigate to Paris with high zoom to ensure individual buildings (not clusters)
    page.goto("http://localhost:8080/?lat=48.8566&lng=2.3522&zoom=16")

    # Wait for the map to load and data to be fetched
    # We can wait for a marker to appear or the list to populate

    # Wait for at least one building card in the sidebar
    # The sidebar uses h3 for building names inside cards
    page.wait_for_selector("div[class*='scroll-area'] h3", timeout=10000)

    # Get the first building card
    cards = page.locator("div[class*='scroll-area'] a")
    first_card = cards.first

    # Get the name of the building to verify popup
    building_name = first_card.locator("h3").inner_text()
    print(f"Hovering over building: {building_name}")

    # Hover over the card
    first_card.hover()

    # Wait for popup
    # The popup contains the building name
    # We use a relaxed locator because the popup structure might be complex
    # But we know it should contain the text
    popup_locator = page.locator(".maplibregl-popup-content").get_by_text(building_name)

    try:
        expect(popup_locator).to_be_visible(timeout=5000)
        print("Popup appeared!")
    except Exception as e:
        print(f"Popup failed to appear: {e}")
        # Take screenshot even if failed to see state
        page.screenshot(path="/home/jules/verification/failed_verification.png")
        raise e

    # Take screenshot
    page.screenshot(path="/home/jules/verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        try:
            test_hover_tooltip(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
