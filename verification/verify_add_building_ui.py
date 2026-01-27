from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})

    page.goto("http://localhost:8080/add-building")

    # Check if we are redirected to login
    if "auth" in page.url or "login" in page.url:
        print("Redirected to login.")
        return

    page.wait_for_load_state("networkidle")

    # Step 1: Set Location
    print("Step 1: Clicking map...")
    page.mouse.click(640, 360) # Center
    page.wait_for_timeout(1000)

    continue_btn = page.get_by_role("button", name="Continue")
    if continue_btn.is_disabled():
        print("Retrying click...")
        page.mouse.click(640, 360)
        page.wait_for_timeout(1000)

    if not continue_btn.is_disabled():
        continue_btn.click()
        print("Clicked Continue.")
        page.wait_for_timeout(1000)

        # Step 2: Form
        print("Step 2: Verifying fields...")
        expect(page.get_by_text("Building Information")).to_be_visible()
        expect(page.get_by_text("Status", exact=True)).to_be_visible()
        expect(page.get_by_text("Access", exact=True)).to_be_visible()

        # Open Status Dropdown to show options in screenshot
        page.get_by_text("Select status").click()
        page.wait_for_timeout(500)

        print("Taking screenshot...")
        page.screenshot(path="verification/add_building_fields.png")
        print("Screenshot saved.")
    else:
        print("Failed to enable Continue button.")
        page.screenshot(path="verification/failed_step1.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
