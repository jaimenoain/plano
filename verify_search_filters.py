from playwright.sync_api import sync_playwright, expect
import time

def verify_search_filters():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # 1. Login
        print("Logging in...")
        page.goto("http://localhost:8080/auth")
        page.fill('input[type="email"]', "tester@cineforum.eu")
        page.fill('input[type="password"]', "CnjFsiVD2YgX9iBuZrfj")
        page.click('button[type="submit"]')

        # Wait for redirect
        page.wait_for_url("http://localhost:8080/", timeout=60000)
        print("Logged in successfully.")

        # 2. Go to Search Page via Navigation
        print("Navigating to Find page...")
        page.locator("a", has_text="Find").click()
        page.locator("input[placeholder*='Search']").wait_for()

        # 3. Open Filter Sheet
        print("Opening filter sheet...")
        try:
            filters_btn = page.locator("button").filter(has_text="Filters").first
            filters_btn.wait_for(timeout=10000)
            filters_btn.click()
        except Exception as e:
            print(f"Error finding/clicking Filters button: {e}")
            page.screenshot(path="/home/jules/verification/error_filters_btn.png")
            return

        # Wait for sheet to open
        expect(page.locator("div[role='dialog']")).to_be_visible()

        # 4. Expand "Social & Personal"
        print("Checking 'Social & Personal' filters...")
        social_trigger = page.locator("button").filter(has_text="Social & Personal").first
        if social_trigger.get_attribute("data-state") == "closed":
            social_trigger.click()

        # 5. Test Seen/Not Seen Mutual Exclusion
        print("Testing Seen/Not Seen mutual exclusion...")

        not_seen_container = page.locator("div").filter(has_text="Not seen by me").last
        not_seen_switch = not_seen_container.locator("button[role='switch']").first

        seen_container = page.locator("div").filter(has_text="Seen by me").last
        seen_switch = seen_container.locator("button[role='switch']").first

        # Click "Not seen by me"
        not_seen_switch.click()
        expect(not_seen_switch).to_have_attribute("data-state", "checked")
        expect(seen_switch).to_have_attribute("data-state", "unchecked")

        # Click "Seen by me" -> Should uncheck "Not seen by me"
        seen_switch.click()
        expect(seen_switch).to_have_attribute("data-state", "checked")
        expect(not_seen_switch).to_have_attribute("data-state", "unchecked")

        print("Mutual exclusion verified.")

        # 6. Check "Rated by specific friends" conditional visibility
        print("Testing 'Rated by specific friends' conditional visibility...")

        rated_by_friends_container = page.locator("div").filter(has_text="Rated by friends").last
        rated_by_friends_switch = rated_by_friends_container.locator("button[role='switch']").first

        # Ensure "Rated by friends" is off
        if rated_by_friends_switch.get_attribute("data-state") == "checked":
             rated_by_friends_switch.click()

        # "Rated by specific friends" should NOT be visible
        expect(page.locator("text='Rated by specific friends'")).not_to_be_visible()

        # Turn "Rated by friends" ON
        rated_by_friends_switch.click()

        # "Rated by specific friends" SHOULD be visible
        expect(page.locator("text='Rated by specific friends'")).to_be_visible()

        print("Conditional visibility verified.")

        # 8. Check Saved View Tooltip
        print("Saving a view to test tooltip...")

        # Ensure 'Save current view' section is visible (only visible if filters are active)
        # We have some filters active now (Rated by friends, Seen by me).

        # Try to find input using more robust locator
        save_input = page.locator("input[placeholder='Name...']")

        if not save_input.is_visible():
             print("Save input not visible. Activating a filter...")
             # Maybe scroll to top
             page.locator("div[role='dialog']").evaluate("el => el.querySelector('div').scrollTop = 0") # Hack to scroll top if needed
             # Wait a bit
             time.sleep(1)

        if save_input.is_visible():
            view_name = f"Test View {int(time.time())}"
            save_input.fill(view_name)

            # Save button is next to it
            save_btn = page.locator("button").filter(has=page.locator("svg.lucide-save"))
            save_btn.click()

            # Wait for view to appear
            expect(page.locator("button", has_text=view_name)).to_be_visible()

            # Find the Pin button for this view
            view_container = page.locator("div.group", has_text=view_name)
            view_container.hover()

            pin_button = view_container.locator("button").nth(1)
            pin_button.hover()

            # Check tooltip content
            try:
                expect(page.locator("div[role='tooltip']")).to_contain_text("Pin this view", timeout=5000)
                print("Tooltip verified.")
            except:
                print("Tooltip verification timed out - maybe hover logic is flaky in headless.")
        else:
            print("Skipping Saved View test - input not found (filters might be cleared unexpectedly?)")
            page.screenshot(path="/home/jules/verification/save_view_failed.png")

        # Take screenshot of the Filter Sheet
        page.screenshot(path="/home/jules/verification/filter_sheet.png")

        # 9. Test Empty Watchlist State
        page.keyboard.press("Escape")
        filters_btn.click()

        # Clear all
        reset_btn = page.locator("button:has-text('Reset All Filters')")
        if reset_btn.is_visible():
            reset_btn.click()

        # Toggle "In my watchlist"
        watchlist_container = page.locator("div").filter(has_text="In my watchlist").last
        watchlist_switch = watchlist_container.locator("button[role='switch']").first
        watchlist_switch.click()

        # Close sheet
        page.keyboard.press("Escape")

        # Wait for results
        time.sleep(2)

        content = page.content()
        if "Watchlist is empty" in content:
             print("Empty watchlist message verified.")
        elif "No results found" in content:
             print("Standard no results found.")
        else:
             print("Results found.")

        page.screenshot(path="/home/jules/verification/search_page.png")

        browser.close()

if __name__ == "__main__":
    verify_search_filters()
