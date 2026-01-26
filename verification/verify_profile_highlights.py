from playwright.sync_api import sync_playwright, expect
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    # Mock Profile Data
    mock_profile_data = [{
        "id": "mock-user-id",
        "username": "ArchitectureFan",
        "avatar_url": None,
        "bio": "I love architecture",
        "favorites": [
            {"id": "s1", "title": "Brutalism", "type": "style"},
            {"id": "q1", "title": "Less is More", "type": "quote", "quote_source": "Mies"},
            {"id": "a1", "title": "Le Corbusier", "type": "architect", "image_url": None}
        ]
    }]

    # Intercept Supabase requests
    def handle_route(route):
        url = route.request.url
        if "profiles" in url and "select" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(mock_profile_data)
            )
        elif "user_buildings" in url:
             route.fulfill(status=200, content_type="application/json", body='[]')
        elif "follows" in url:
             route.fulfill(status=200, content_type="application/json", body='[]')
        elif "likes" in url:
             route.fulfill(status=200, content_type="application/json", body='[]')
        elif "comments" in url:
             route.fulfill(status=200, content_type="application/json", body='[]')
        elif "image_likes" in url:
             route.fulfill(status=200, content_type="application/json", body='[]')
        elif "review_images" in url:
             route.fulfill(status=200, content_type="application/json", body='[]')
        else:
            route.continue_()

    page.route("**/rest/v1/**", handle_route)

    # Navigate to profile
    try:
        page.goto("http://localhost:8080/profile/ArchitectureFan")

        # Wait for page content
        page.wait_for_selector("text=ArchitectureFan", timeout=10000)
        page.wait_for_selector("text=Highlights", timeout=10000)

        # Verify Order via Bounding Box
        styles_header = page.locator("text=Favorite Styles")
        quotes_header = page.locator("text=Favorite Quotes")
        architects_header = page.locator("text=Favorite Architects")

        expect(styles_header).to_be_visible()
        expect(quotes_header).to_be_visible()
        expect(architects_header).to_be_visible()

        styles_box = styles_header.bounding_box()
        quotes_box = quotes_header.bounding_box()
        architects_box = architects_header.bounding_box()

        print(f"Styles Y: {styles_box['y']}")
        print(f"Quotes Y: {quotes_box['y']}")
        print(f"Architects Y: {architects_box['y']}")

        if styles_box['y'] < quotes_box['y'] and quotes_box['y'] < architects_box['y']:
            print("SUCCESS: Order is correct (Styles -> Quotes -> Architects)")
        else:
            print("FAILURE: Order is incorrect")

        page.screenshot(path="verification/verification.png", full_page=True)
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
