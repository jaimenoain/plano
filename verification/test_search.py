from playwright.sync_api import sync_playwright, expect
import time

def test_search_architect(page):
    print("Starting verification test...")

    # Mock Architect Response
    def handle_architects(route):
        print(f"Intercepted architect request: {route.request.url}")
        route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id": "arch_1", "name": "Zaha Hadid", "type": "individual"}, {"id": "arch_2", "name": "Zaha Studio", "type": "studio"}]'
        )

    # We need to handle both the search and any other architect requests
    page.route("**/rest/v1/architects*", handle_architects)

    # Mock Building Response
    def handle_buildings(route):
        print(f"Intercepted buildings request: {route.request.url}")
        # Return empty list initially or simple list
        route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id": "b1", "name": "Test Building", "slug": "test-building", "rating": 5, "lat": 0, "lng": 0, "status": "none", "architects": [], "image_url": null}]'
        )

    page.route("**/rest/v1/rpc/get_buildings_list", handle_buildings)

    # Go to Search Page
    print("Navigating to search page...")
    page.goto("http://localhost:8080/search")

    # Wait for page to load
    print("Waiting for input...")

    # Target the desktop input specifically
    search_input = page.get_by_placeholder("Search buildings, architects...")
    search_input.wait_for(state="visible")

    # Type "Zaha"
    print("Typing search query...")
    search_input.fill("Zaha")

    # Wait for results
    print("Waiting for results...")
    # Architect section should appear
    # Wait for "Architects" header
    page.wait_for_selector("text=Architects", timeout=10000)

    # Take screenshot
    print("Taking screenshot...")
    # Wait a bit for layout
    page.wait_for_timeout(2000)
    page.screenshot(path="/home/jules/verification/verification.png")

    # Verification Logic
    print("Verifying UI elements...")
    expect(page.get_by_text("Zaha Hadid")).to_be_visible()

    # Check order
    content = page.content()
    # Find indices of text
    arch_header = content.find("Architects")
    zaha = content.find("Zaha Hadid")
    building = content.find("Test Building")

    print(f"Indices: Arch Header: {arch_header}, Zaha: {zaha}, Building: {building}")

    if arch_header < building:
        print("PASS: Architects appear before Buildings")
    else:
        print("FAIL: Order is incorrect")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to desktop size to ensure sidebar is visible
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        try:
            test_search_architect(page)
            print("Verification script finished successfully.")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/failure.png")
        finally:
            browser.close()
