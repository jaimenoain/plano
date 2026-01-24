from playwright.sync_api import sync_playwright, Page, expect

def test_building_resources(page: Page):
    print("Setting up routes...")

    # Mock Building Details - Supabase returns array for select
    page.route("**/rest/v1/buildings?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[{"id": "test-building-id", "name": "Test Building", "address": "123 Test St", "location": "POINT(0 0)", "architects": ["Test Architect"], "year_completed": 2020, "styles": ["Modern"], "main_image_url": null, "created_by": "user1"}]'
    ))

    # Mock Building Architects (Relational)
    page.route("**/rest/v1/building_architects?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock User Building (Status)
    page.route("**/rest/v1/user_buildings?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Top Links RPC
    page.route("**/rest/v1/rpc/get_building_top_links", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[{"link_id": "link1", "url": "https://example.com/1", "title": "Useful Article", "like_count": 10, "user_username": "arch_lover", "user_avatar": null}, {"link_id": "link2", "url": "https://example.com/2", "title": "Gallery", "like_count": 5, "user_username": "photo_guy", "user_avatar": null}]'
    ))

    print("Navigating to page...")
    # Go to page
    page.goto("http://localhost:8080/building/test-building-id")

    print("Waiting for content...")
    # Wait for the section to appear
    expect(page.get_by_text("Top Community Resources")).to_be_visible()

    # Check for content
    expect(page.get_by_text("Useful Article")).to_be_visible()
    expect(page.get_by_text("shared by @arch_lover")).to_be_visible()
    expect(page.get_by_text("10")).to_be_visible() # like count

    print("Taking screenshot...")
    # Take screenshot
    page.screenshot(path="/home/jules/verification/building_resources.png")
    print("Done.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_building_resources(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e
        finally:
            browser.close()
