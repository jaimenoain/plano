from playwright.sync_api import sync_playwright
import time

def verify_tooltip():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        url = "http://localhost:8080/globetrotter_1968/map/2026-bucket-list"
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for list items
        # List items are likely inside a ScrollArea
        # Selector for a building card might be something like "text=Building Name" or class based
        # Let's wait for any text inside the sidebar
        try:
            page.wait_for_selector(".group.relative.overflow-hidden", timeout=15000) # Card class from CollectionBuildingCard
        except:
            print("Timeout waiting for list items. Taking screenshot.")
            page.screenshot(path="timeout_list.png")
            return

        # Get the first item
        items = page.locator(".group.relative.overflow-hidden").all()
        if not items:
            print("No items found in list.")
            return

        first_item = items[0]
        building_name = first_item.locator("h3").inner_text()
        print(f"Testing with building: {building_name}")

        # 1. Hover over the item
        print("Hovering over list item...")
        first_item.hover()
        time.sleep(1) # Wait for state update and animation

        # Check for tooltip on map
        # Tooltip contains building name and has specific structure
        # We look for the building name in a marker/popup container
        # The tooltip structure:
        # <div class="absolute bottom-6 ...">
        #   <span>{building.name}</span>
        # </div>
        # It should be visible.

        # We can search for the text in the map container
        map_container = page.locator("[data-testid='map-container']")
        tooltip_locator = map_container.get_by_text(building_name)

        if tooltip_locator.count() > 0 and tooltip_locator.first.is_visible():
            print("Tooltip appeared on hover.")
        else:
            print("Tooltip NOT found on hover.")
            page.screenshot(path="hover_fail.png")
            # Proceed anyway to check unhover behavior? No, if it didn't appear, we can't test disappearance.
            # But maybe it appeared but locator failed.

        page.screenshot(path="hover_state.png")

        # 2. Unhover (Move mouse to body or somewhere else)
        print("Moving mouse away...")
        page.mouse.move(0, 0)
        time.sleep(1) # Wait for timeout (150ms in code) + animation

        # Check if tooltip is gone
        if tooltip_locator.count() == 0 or not tooltip_locator.first.is_visible():
            print("SUCCESS: Tooltip disappeared after unhover.")
        else:
            print("FAILURE: Tooltip is still visible after unhover.")

        page.screenshot(path="unhover_state.png")

        browser.close()

if __name__ == "__main__":
    verify_tooltip()
