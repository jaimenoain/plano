from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Mock the search_buildings RPC
    def handle_search(route):
        print("Intercepted search_buildings")
        route.fulfill(
            status=200,
            content_type="application/json",
            body='''[{
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "The Shard",
                "main_image_url": "https://example.com/shard.jpg",
                "architects": [{"id": "a1", "name": "Renzo Piano"}],
                "year_completed": 2012,
                "city": "London",
                "country": "UK",
                "location_lat": 51.5,
                "location_lng": -0.1,
                "social_score": 100
            }]'''
        )

    # Intercept Supabase RPC call
    page.route("**/rest/v1/rpc/search_buildings**", handle_search)

    try:
        # Navigate to search page
        page.goto("http://localhost:8080/search")

        # Wait for any result card
        page.wait_for_selector("h3", timeout=10000)

        # Check for Building Name
        expect(page.get_by_text("The Shard").first).to_be_visible()

        # Check for Architect Name
        expect(page.get_by_text("Renzo Piano").first).to_be_visible()

        # Take screenshot
        page.screenshot(path="verification/search_architects.png")
        print("Verification complete: verification/search_architects.png")

    except Exception as e:
        print(f"Verification failed: {e}")
        page.screenshot(path="verification/search_failure.png")
        # print(page.content())

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
