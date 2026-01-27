from playwright.sync_api import Page, expect, sync_playwright
import time

def test_map_interaction(page: Page):
    print("Navigating to search page...")
    # 1. Navigate to Search
    page.goto("http://localhost:8080/search")

    # Wait for map to load
    print("Waiting for map container...")
    page.wait_for_selector("[data-testid='map-container']:visible")
    time.sleep(3) # Allow map to settle (London default)

    # 2. Interact with the map (Pan slightly)
    print("Interacting with map...")
    # We locate the map canvas
    map_canvas = page.locator("[data-testid='map-container']:visible canvas.maplibregl-canvas")
    if map_canvas.count() > 0:
        box = map_canvas.bounding_box()
        if box:
            center_x = box['x'] + box['width'] / 2
            center_y = box['y'] + box['height'] / 2

            page.mouse.move(center_x, center_y)
            page.mouse.down()
            page.mouse.move(center_x + 100, center_y + 100) # Drag
            page.mouse.up()

            print("Interacted with map (Pan executed).")
            time.sleep(1)
    else:
        print("Map canvas not found!")

    # 3. Perform Search
    # This should trigger resetInteractionTrigger -> reset userHasInteracted -> allow auto-zoom
    print("Performing search for 'Zaha Hadid'...")
    search_input = page.get_by_placeholder("Search buildings, architects...")
    search_input.fill("Zaha Hadid")

    # Wait for results to populate and map to potentially fly/zoom
    print("Waiting for results and map update...")
    time.sleep(5)

    # 4. Take screenshot
    page.screenshot(path="/home/jules/verification/map_interaction.png")
    print("Screenshot taken at verification/map_interaction.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            test_map_interaction(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
