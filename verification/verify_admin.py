import json
import time
from playwright.sync_api import sync_playwright, Page, expect

def test_admin_dashboard(page: Page):
    # Enable console logging
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

    # Mock specific RPC calls

    # Generic mock for RPCs - Return null so the frontend falls back to default empty objects
    page.route("**/rest/v1/rpc/*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body="null"
    ))

    # Mock get_photo_heatmap_data specifically
    page.route("**/rest/v1/rpc/get_photo_heatmap_data", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([
            {"lat": 40.7128, "lng": -74.0060, "weight": 50},
            {"lat": 51.5074, "lng": -0.1278, "weight": 30}
        ])
    ))

    # Mock pulse data
    page.route("**/rest/v1/rpc/get_admin_pulse", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "total_users": 100,
            "new_users_30d": 10,
            "new_users_24h": 5,
            "active_users_24h": 5,
            "active_users_30d": 50,
            "network_density": 0.5,
            "total_buildings": 200,
            "total_reviews": 500,
            "total_photos": 300,
            "pending_reports": 0
        })
    ))

    # Mock the No Photos Buildings Query
    page.route("**/rest/v1/buildings?select=id%2Cname%2Clocation*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([
            {
                "id": "1",
                "name": "Building Without Photos 1",
                "location": {"type": "Point", "coordinates": [-0.1278, 51.5074]} # London
            },
            {
                "id": "2",
                "name": "Building Without Photos 2",
                "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]} # NYC
            }
        ])
    ))

    # Mocking count requests
    page.route("**/rest/v1/*?select=%2A&count=exact*", lambda route: route.fulfill(
        status=200,
        headers={"content-range": "0-0/100"},
        content_type="application/json",
        body=json.dumps([])
    ))


    # Navigate to Admin Dashboard
    print("Navigating to Admin Dashboard...")
    page.goto("http://localhost:3000/admin")

    # Wait for Dashboard to load
    print("Waiting for Dashboard...")
    try:
        expect(page.get_by_text("Admin Dashboard")).to_be_visible(timeout=5000)
    except Exception as e:
        print("Admin Dashboard header not found. Checking for error messages...")
        if page.get_by_text("Failed to load dashboard data.").is_visible():
            print("Found 'Failed to load dashboard data.' message.")
        if page.get_by_text("Loading dashboard...").is_visible():
            print("Still loading...")
        page.screenshot(path="verification/debug_dashboard_fail.png")
        raise e

    # Click on "Photos" tab
    print("Clicking Photos tab...")
    page.get_by_role("tab", name="Photos").click()

    # Wait for the map to appear
    print("Waiting for map...")
    expect(page.get_by_text("Buildings Missing Photos")).to_be_visible()

    # Wait a bit for map to render
    page.wait_for_timeout(3000)

    # Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/admin_photos_tab.png", full_page=True)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        try:
            test_admin_dashboard(page)
            print("Verification script finished successfully.")
        except Exception as e:
            print(f"Verification script failed: {e}")
        finally:
            browser.close()
