import time
import json
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})

    # Project Ref from .env grep: gyxspsuctbrxhwiyfvlj
    project_ref = "gyxspsuctbrxhwiyfvlj"
    storage_key = f"sb-{project_ref}-auth-token"

    fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoyNTkxNDQ4NTU5fQ.SIGNATURE"

    session_data = {
        "access_token": fake_jwt,
        "token_type": "bearer",
        "expires_in": 3600,
        "refresh_token": "refresh_token",
        "user": {
            "id": "user123",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "phone": "",
            "app_metadata": {
                "provider": "email",
                "providers": ["email"]
            },
            "user_metadata": {
                "username": "testuser"
            },
            "identities": [],
            "created_at": "2023-01-01T00:00:00.000000Z",
            "updated_at": "2023-01-01T00:00:00.000000Z"
        }
    }

    page = context.new_page()

    # Route Auth User
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(session_data["user"])
    ))

    # Mock user profile
    page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "user123", "username": "testuser", "avatar_url": null, "country": "US"}'
    ))

    # Mock film data
    page.route("**/rest/v1/films*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "film123", "tmdb_id": 550, "media_type": "movie", "title": "Fight Club", "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "release_date": "1999-10-15", "overview": "A ticking-time-bomb insomniac...", "backdrop_path": "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg", "credits": {"crew": [], "cast": []}, "countries": ["US"], "spoken_languages": [{"iso_639_1": "en"}]}'
    ))

    # Mock log entry (Rating exists -> Recommend button SHOULD appear)
    page.route("**/rest/v1/log*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "log123", "user_id": "user123", "film_id": "film123", "rating": 8, "status": "watched", "tags": []}'
    ))

    # Mock follows
    page.route("**/rest/v1/follows*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Pre-set local storage
    page.goto("http://localhost:8080/404")

    page.evaluate(f"""() => {{
        localStorage.setItem('{storage_key}', '{json.dumps(session_data)}');
    }}""")

    # Navigate to the film page
    page.goto("http://localhost:8080/movie/fight-club/550")

    try:
        page.wait_for_selector(".animate-spin", state="hidden", timeout=10000)
    except:
        pass

    page.wait_for_selector("h1:visible", timeout=10000)

    # Check for "Recommend" button
    recommend_btn = page.get_by_role("button", name="Recommend")

    try:
        expect(recommend_btn).to_be_visible(timeout=5000)
        print("Recommend button is visible!")
    except Exception as e:
        print("Recommend button NOT found!")
        print(e)
        if page.get_by_text("Log In").first.is_visible():
            print("User is NOT logged in.")
        else:
            print("User appears logged in.")

    # Take screenshot
    page.screenshot(path="verification_rated.png")

    if recommend_btn.is_visible():
        recommend_btn.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="verification_dialog.png")
        # Verify dialog content
        try:
             expect(page.get_by_text("Recommend this title")).to_be_visible(timeout=2000)
             print("Dialog opened successfully.")
        except:
             print("Dialog did not open or text not found.")
             # Close dialog if open to clean up? Or just continue.
             page.keyboard.press("Escape")


    # ---------------------------------------------------------
    # Test Case 2: No Rating
    # ---------------------------------------------------------
    page2 = context.new_page()

    # Routes
    page2.route("**/auth/v1/user", lambda route: route.fulfill(status=200, body=json.dumps(session_data["user"])))
    page2.route("**/rest/v1/log*", lambda route: route.fulfill(status=200, body='null'))
    page2.route("**/rest/v1/profiles*", lambda route: route.fulfill(status=200, body='{"id": "user123", "username": "testuser", "avatar_url": null, "country": "US"}'))
    page2.route("**/rest/v1/films*", lambda route: route.fulfill(status=200, body='{"id": "film123", "tmdb_id": 550, "media_type": "movie", "title": "Fight Club", "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "release_date": "1999-10-15", "overview": "A ticking-time-bomb insomniac...", "backdrop_path": "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg", "credits": {"crew": [], "cast": []}, "countries": ["US"], "spoken_languages": [{"iso_639_1": "en"}]}' ))
    page2.route("**/rest/v1/follows*", lambda route: route.fulfill(status=200, body='[]'))

    # Set Auth
    page2.goto("http://localhost:8080/404")
    page2.evaluate(f"""() => {{
        localStorage.setItem('{storage_key}', '{json.dumps(session_data)}');
    }}""")

    page2.goto("http://localhost:8080/movie/fight-club/550")

    try:
        page2.wait_for_selector(".animate-spin", state="hidden", timeout=10000)
    except:
        pass
    page2.wait_for_selector("h1:visible", timeout=10000)

    recommend_btn_2 = page2.get_by_role("button", name="Recommend")

    try:
        expect(recommend_btn_2).not_to_be_visible(timeout=5000)
        print("Recommend button is correctly HIDDEN when not rated.")
    except Exception as e:
        print("Recommend button WAS visible when it should not be!")
        print(e)

    page2.screenshot(path="verification_unrated.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
