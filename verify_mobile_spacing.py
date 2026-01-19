import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Set viewport to mobile (iPhone SE dimensions)
    context = browser.new_context(viewport={"width": 375, "height": 667})
    page = context.new_page()

    # Define mock data
    mock_films = {
        "results": [
            {
                "id": 1,
                "title": "Inception",
                "original_title": "Inception",
                "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
                "release_date": "2010-07-15",
                "overview": "A thief who steals corporate secrets through the use of dream-sharing technology...",
                "vote_average": 8.8,
                "vote_count": 30000,
                "media_type": "movie",
                "genre_ids": [28, 878, 12]
            },
            {
                "id": 2,
                "title": "Interstellar",
                "original_title": "Interstellar",
                "poster_path": "/gEU2QniL6E8ahYeBU2MpZvLDTpW.jpg",
                "release_date": "2014-11-05",
                "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole...",
                "vote_average": 8.6,
                "vote_count": 28000,
                "media_type": "movie",
                "genre_ids": [12, 18, 878]
            }
        ]
    }

    # Helper to set localStorage
    def set_local_storage(page):
        # Fake JWT: header.payload.signature
        fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjE5OTk5OTk5OTl9.signature"
        session_data = {
            "access_token": fake_jwt,
            "refresh_token": "fake-refresh-token",
            "expires_in": 3600,
            "expires_at": 1999999999,
            "user": {
                "id": "user123",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "test@example.com",
                "confirmed_at": "2023-01-01T00:00:00Z",
                "last_sign_in_at": "2023-01-01T00:00:00Z",
                "app_metadata": { "provider": "email", "providers": ["email"] },
                "user_metadata": { "username": "TestUser" },
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2023-01-01T00:00:00Z"
            }
        }
        import json
        json_data = json.dumps(session_data)
        page.add_init_script(f"""
            localStorage.setItem('sb-gyxspsuctbrxhwiyfvlj-auth-token', '{json_data}');
        """)

    set_local_storage(page)

    # Set up route interception
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "user123", "aud": "authenticated", "role": "authenticated", "email": "test@example.com", "user_metadata": {"username": "TestUser"}}'
    ))

    # Mock search films tiered
    page.route("**/rest/v1/rpc/search_films_tiered", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[{"tmdb_id": 1, "title": "Inception", "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", "tier": 3, "media_type": "movie", "vote_count": 30000}, {"tmdb_id": 2, "title": "Interstellar", "poster_path": "/gEU2QniL6E8ahYeBU2MpZvLDTpW.jpg", "tier": 3, "media_type": "movie", "vote_count": 28000}]'
    ))

    # Mock Profile
    page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "user123", "username": "TestUser", "avatar_url": null, "favorites": []}'
    ))

    # Mock Log for Profile
    page.route("**/rest/v1/log*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[{"id": "r1", "content": "Great movie!", "rating": 9, "created_at": "2023-01-01", "film": {"id": 1, "title": "Inception", "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg"}, "user_id": "user123"}]'
    ))

    # Mock Interactions
    page.route("**/rest/v1/likes*", lambda route: route.fulfill(status=200, body='[]'))
    page.route("**/rest/v1/comments*", lambda route: route.fulfill(status=200, body='[]'))
    page.route("**/rest/v1/follows*", lambda route: route.fulfill(status=200, body='[]'))


    # Go to Search page
    print("Navigating to Search page...")
    page.goto("http://localhost:8080/search")

    # Wait for input
    try:
        page.wait_for_selector("input[placeholder='Search by title...']", timeout=10000)
    except:
        print("Search input not found, taking debug screenshot")
        page.screenshot(path="debug_search.png")
        raise

    # Trigger search
    page.fill("input[placeholder='Search by title...']", "Inception")

    # Wait a bit for debounce and mock response
    time.sleep(2)

    # Take screenshot of Search Grid
    print("Taking Search Grid screenshot...")
    page.screenshot(path="verification_mobile_search.png")

    # Now go to Profile page (mocked)
    print("Navigating to Profile page...")
    page.goto("http://localhost:8080/profile/testuser")

    time.sleep(2)
    # Take screenshot of Profile Grid
    print("Taking Profile Grid screenshot...")
    page.screenshot(path="verification_mobile_profile.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
