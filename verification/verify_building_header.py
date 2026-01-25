import json
import time
from playwright.sync_api import sync_playwright, Page, expect

def run(page: Page):
    # Mock data
    building_id = "123e4567-e89b-12d3-a456-426614174000"

    mock_building = {
        "id": building_id,
        "name": "The Shard",
        "location": "POINT(-0.0865 51.5045)",
        "location_precision": "exact",
        "address": "32 London Bridge St, London SE1 9SG",
        "architects": ["Renzo Piano"],
        "year_completed": 2012,
        "styles": ["Neo-futurism"],
        "main_image_url": "https://example.com/shard.jpg",
        "created_by": "user123"
    }

    mock_architects = [
        {"architect": {"id": "arch1", "name": "Renzo Piano"}}
    ]

    # Intercept requests
    def handle_route(route):
        url = route.request.url
        if f"buildings?select=*&id=eq.{building_id}" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps([mock_building]))
        elif "building_architects" in url:
             route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_architects))
        elif "get_building_top_links" in url:
             route.fulfill(status=200, content_type="application/json", body="[]")
        elif "user_buildings" in url:
             route.fulfill(status=200, content_type="application/json", body="[]")
        else:
            route.continue_()

    page.route("**/*", handle_route)

    # 1. Mobile View
    print("Verifying Mobile View...")
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"http://localhost:8080/building/{building_id}")

    # We expect the mobile header to be visible.
    # The mobile header has class "lg:hidden".
    mobile_header_title = page.locator(".lg\\:hidden").get_by_text("The Shard")
    expect(mobile_header_title).to_be_visible(timeout=10000)

    time.sleep(2)
    page.screenshot(path="verification/mobile_building_details_after.png")
    print("Mobile screenshot saved.")

    # 2. Desktop View
    print("Verifying Desktop View...")
    page.set_viewport_size({"width": 1280, "height": 800})
    page.reload()

    # We expect the desktop header to be visible.
    # The desktop header has class "hidden lg:block".
    # Note: locator matches CSS selectors. Spaces in class names mean descendant in CSS selector syntax if dot is missing,
    # but here we want element with both classes. .hidden.lg\:block
    desktop_header_title = page.locator(".hidden.lg\\:block").get_by_text("The Shard")
    expect(desktop_header_title).to_be_visible(timeout=10000)

    time.sleep(2)
    page.screenshot(path="verification/desktop_building_details_after.png")
    print("Desktop screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run(page)
        finally:
            browser.close()
