from playwright.sync_api import sync_playwright
import time
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Mock Auth Token
    auth_token = {
        "access_token": "fake.token.part",
        "refresh_token": "fake-refresh",
        "expires_at": int(time.time()) + 3600,
        "expires_in": 3600,
        "token_type": "bearer",
        "user": {
            "id": "user-uuid",
            "email": "test@example.com",
            "aud": "authenticated",
            "role": "authenticated",
            "user_metadata": {
                "onboarding_completed": True
            }
        }
    }

    # Inject token before navigation
    page.add_init_script(f"""
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({json.dumps(auth_token)}));
    """)

    # Mock User
    page.route('**/auth/v1/user', lambda route: route.fulfill(
        status=200,
        content_type='application/json',
        body=json.dumps({
            "id": "user-uuid",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
             "user_metadata": {
                "onboarding_completed": True
            }
        })
    ))

    # Mock Feed
    # We want a cluster.
    feed_data = [
        {
            "id": 'review-1',
            "content": 'Nice',
            "rating": 5,
            "created_at": "2023-10-27T10:00:00Z",
            "user_id": 'user-1',
            "user_data": { "username": 'ClusterUser', "avatar_url": None },
            "building_data": { "id": 'b-1', "name": 'Building 1', "city": 'Paris' },
            "review_images": []
        },
        {
            "id": 'review-2',
            "content": 'Good',
            "rating": 4,
            "created_at": "2023-10-27T09:50:00Z",
            "user_id": 'user-1',
            "user_data": { "username": 'ClusterUser', "avatar_url": None },
            "building_data": { "id": 'b-2', "name": 'Building 2', "city": 'Paris' },
            "review_images": []
        },
        {
            "id": 'review-3',
            "content": 'Great',
            "rating": 3,
            "created_at": "2023-10-27T09:40:00Z",
            "user_id": 'user-1',
            "user_data": { "username": 'ClusterUser', "avatar_url": None },
            "building_data": { "id": 'b-3', "name": 'Building 3', "city": 'Paris' },
            "review_images": []
        },
        {
            "id": 'review-4',
            "content": 'Wow',
            "rating": 5,
            "created_at": "2023-10-27T09:30:00Z",
            "user_id": 'user-1',
            "user_data": { "username": 'ClusterUser', "avatar_url": None },
            "building_data": { "id": 'b-4', "name": 'Building 4', "city": 'Paris' },
            "review_images": []
        },
    ]

    page.route('**/rest/v1/rpc/get_feed', lambda route: route.fulfill(
        status=200,
        content_type='application/json',
        body=json.dumps(feed_data)
    ))

    # Mock other calls to avoid errors
    page.route('**/*.png', lambda route: route.fulfill(status=200, body=b''))
    page.route('**/rest/v1/rpc/get_unread_notifications_count', lambda route: route.fulfill(status=200, body='0'))


    page.goto("http://localhost:8080/")

    # Wait for the element
    try:
        page.wait_for_selector("text=ClusterUser", timeout=10000)
        # Wait a bit more for rendering
        time.sleep(1)

        # Take screenshot
        page.screenshot(path="verification/cluster_feed.png", full_page=True)
        print("Screenshot saved to verification/cluster_feed.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
