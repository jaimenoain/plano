import time
from playwright.sync_api import sync_playwright

def test_search_users_empty_state_with_invite(page):
    # Mock authentication token
    page.context.add_init_script("""
        const token = {
            access_token: 'fake-token',
            refresh_token: 'fake-refresh-token',
            user: {
                id: 'test-user-id',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'test@example.com',
                user_metadata: {
                    username: 'testuser'
                }
            },
            expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        window.localStorage.setItem('sb-gyxspsuctbrxhwiyfvlj-auth-token', JSON.stringify(token));
        console.log("Mock auth token set");
    """)

    # Intercept profile search request to return empty list
    page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body="[]"
    ))

    # Intercept follows request
    page.route("**/rest/v1/follows*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body="[]"
    ))

    # Intercept auth user request to return valid user
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "test-user-id", "aud": "authenticated", "role": "authenticated", "email": "test@example.com", "user_metadata": {"username": "testuser"}}'
    ))

    page.route("**/rest/v1/film_availability*", lambda route: route.fulfill(status=200, body="[]"))
    page.route("**/functions/v1/tmdb-search*", lambda route: route.fulfill(status=200, body='{"results": []}'))

    # Navigate to Search Users tab
    page.goto("http://localhost:8080/search?tab=users&q=nobody")

    # Wait for the invite link
    try:
        page.wait_for_selector("text=Invite a friend:", timeout=5000)
        print("Found 'Invite a friend:' text.")

        # Verify the link
        link = page.get_by_role("link", name="https://cineforum.eu/?invited_by=testuser")
        if link.is_visible():
            print("Link is visible.")
            href = link.get_attribute("href")
            if href == "https://cineforum.eu/?invited_by=testuser":
                print("Link href is correct.")
            else:
                print(f"Link href is incorrect: {href}")
        else:
            print("Link is not visible.")

    except Exception as e:
        print("Did not find invite link.")
        print(e)

    # Take screenshot
    page.screenshot(path="verification_after.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            test_search_users_empty_state_with_invite(page)
        finally:
            browser.close()
