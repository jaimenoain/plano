
from playwright.sync_api import sync_playwright

def verify_hide_hidden_option():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use --host argument behavior (0.0.0.0 or localhost)
        page = browser.new_page()

        print("Navigating to search page...")
        # Since auth is likely required to see full results but UI might load, let's try.
        # If redirect to /auth happens, we might need to mock auth or use logic.
        # However, checking SearchPage.tsx, it doesn't redirect immediately.
        # It calls useBuildingSearch -> useAuth.

        page.goto("http://localhost:3001/search")

        # Wait for potential redirects or load
        page.wait_for_timeout(3000)

        if "auth" in page.url:
            print("Redirected to auth. Need to handle login or bypass.")
            # We can try to modify source to bypass auth for verification
            # or just inspect if we can see the filter bar.
            # But DiscoveryFilterBar is in SearchPage.
            # Let's try to mock the local storage token if needed, or see if we can just render the page.
            # Actually, let's just create a dummy user? No that's hard.
            # Memory says: "Bypassing authentication checks directly in the source code... is a recognized strategy".
            pass

        print("Looking for Filter button...")
        # DiscoveryFilterBar has a button with ListFilter icon.
        # It says "Filter" inside the button sometimes? No, icon only?
        # <Button variant="outline" size="icon" ...> <ListFilter ... /> </Button>
        # Let's target by icon class or role.
        # Better: SearchPage -> DiscoveryFilterBar -> SheetTrigger -> Button

        try:
             # Look for button with class 'lucide-list-filter' inside or similar.
             # Or get_by_role('button').
             # Let's use specific selector based on code structure if needed.
             # But let's try generic first.
             filter_btn = page.locator("button:has(.lucide-list-filter)")
             filter_btn.wait_for(state="visible", timeout=10000)
             filter_btn.click()
             print("Clicked filter button.")

             page.wait_for_timeout(1000)

             # Now look for "Hide Hidden"
             print("Looking for 'Hide Hidden'...")
             expect_label = page.get_by_text("Hide Hidden")
             expect_label.wait_for(state="visible", timeout=5000)
             print("Found 'Hide Hidden' label!")

             page.screenshot(path="verification_filter_drawer.png")
             print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error_state.png")

        browser.close()

if __name__ == "__main__":
    verify_hide_hidden_option()
