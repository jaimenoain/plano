import json
import time
from playwright.sync_api import sync_playwright, Page, expect

def verify_building_details(page: Page):
    # Setup Data
    building_id = "123e4567-e89b-12d3-a456-426614174000"
    user_id = "user-123"

    building_data = {
        "id": building_id,
        "name": "The Shard",
        "location": "POINT(-0.0865 51.5045)",
        "address": "32 London Bridge St, London SE1 9SG",
        "architects": ["Renzo Piano"],
        "year_completed": 2012,
        "styles": ["Neo-futurism"],
        "main_image_url": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        "description": "A 72-storey skyscraper, designed by the Italian architect Renzo Piano.",
        "created_by": "admin"
    }

    entries_data = [
        {
            "id": "review-1",
            "content": "Amazing view!",
            "rating": 5,
            "status": "visited",
            "tags": ["View", "Height"],
            "created_at": "2023-10-26T12:00:00Z",
            "user": {
                "username": "arch_lover",
                "avatar_url": None
            },
            "building_id": building_id
        }
    ]

    # Handle Routes
    def handle_route(route):
        url = route.request.url

        if "user_buildings" in url:
           print(f"UserBuildings Request: {url}")

        # 1. Mock Auth User Check
        if "/auth/v1/user" in url:
            print("Intercepting Auth User Check")
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "id": user_id,
                    "aud": "authenticated",
                    "role": "authenticated",
                    "email": "test@example.com",
                    "app_metadata": { "provider": "email" },
                    "user_metadata": {}
                })
            )
            return

        # 2. Mock Building Fetch
        if "/rest/v1/buildings" in url and f"id=eq.{building_id}" in url:
            print("Intercepting Building Fetch")
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(building_data)
            )
            return

        # 3. Mock Feed Fetch
        if "user_buildings" in url and "select=" in url and f"building_id=eq.{building_id}" in url and "order=" in url:
            print("Intercepting Feed Fetch")
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(entries_data)
            )
            return

        # 4. Mock Current User Status Fetch (maybeSingle)
        # Query likely has user_id=eq.user-123
        if "user_buildings" in url and f"user_id=eq.{user_id}" in url:
            print("Intercepting User Status Fetch")
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(None) # No prior status
            )
            return

        route.continue_()

    page.route("**/*", handle_route)

    # Listen to console logs
    page.on("console", lambda msg: print(f"PAGE CONSOLE: {msg.text}"))

    # Inject Session
    print("Injecting Session...")
    page.goto("http://localhost:8080/") # Load app to set storage
    page.evaluate("""() => {
        localStorage.setItem('sb-gyxspsuctbrxhwiyfvlj-auth-token', JSON.stringify({
            access_token: 'fake-jwt',
            refresh_token: 'fake-refresh',
            expires_at: 9999999999,
            expires_in: 3600,
            token_type: 'bearer',
            user: {
                id: 'user-123',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'test@example.com'
            }
        }))
    }""")

    # Navigate to Building Page
    print(f"Navigating to building {building_id}...")
    page.goto(f"http://localhost:8080/building/{building_id}")

    # Wait for Content
    try:
        page.wait_for_selector("h1", timeout=10000)
    except:
        print("Wait for h1 timed out. Taking error screenshot.")
        page.screenshot(path="verification/failed_load_h1.png")
        return

    # Check if we see the building name
    if page.get_by_text("The Shard").is_visible():
        print("Building name visible.")
    else:
        print("Building name NOT visible.")

    # Assert Action Center UI
    print("Checking Action Center...")
    expect(page.get_by_text("Your Interest")).to_be_visible()
    expect(page.get_by_text("Rate this building")).to_be_visible()

    # Assert ReviewCard UI (Community Notes)
    print("Checking Review Card...")
    expect(page.get_by_text("arch_lover")).to_be_visible()

    # Screenshot
    page.screenshot(path="verification/building_details_authenticated.png", full_page=True)
    print("Verification screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_building_details(page)
        browser.close()
