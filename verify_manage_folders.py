import time
from playwright.sync_api import sync_playwright

def test_manage_folders(page):
    # --- Mocks ---

    # 1. Auth User
    def handle_auth(route):
        route.fulfill(json={
            "id": "user-1",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "test@example.com",
            "app_metadata": {"provider": "email", "providers": ["email"]},
            "user_metadata": {},
            "created_at": "2023-01-01T00:00:00.000000Z",
            "updated_at": "2023-01-01T00:00:00.000000Z"
        })
    page.route("**/auth/v1/user", handle_auth)

    # 2. Profiles (Target User)
    def handle_profile(route):
        route.fulfill(json={
            "id": "user-1",
            "username": "myuser",
            "full_name": "Test User",
            "avatar_url": None,
            "website": None,
            "bio": "Test Bio"
        })
    # Match specific profile query or generic
    page.route("**/rest/v1/profiles*", handle_profile)

    # 3. Collections (Owned)
    def handle_collections(route):
        # Only return owned for simplicity, others empty
        if "collection_contributors" in route.request.url:
             route.fulfill(json=[])
             return
        if "collection_favorites" in route.request.url:
             route.fulfill(json=[])
             return

        # Main collections query
        route.fulfill(json=[
            {
                "id": "col-1",
                "name": "Paris Trip",
                "slug": "paris-trip",
                "is_public": True,
                "created_at": "2023-01-01T00:00:00+00:00",
                "owner_id": "user-1",
                "collection_items": [{"count": 5}],
                "owner": {"username": "myuser"}
            },
            {
                "id": "col-2",
                "name": "Tokyo Eats",
                "slug": "tokyo-eats",
                "is_public": False,
                "created_at": "2023-02-01T00:00:00+00:00",
                "owner_id": "user-1",
                "collection_items": [{"count": 3}],
                "owner": {"username": "myuser"}
            }
        ])
    page.route("**/rest/v1/collections*", handle_collections)
    page.route("**/rest/v1/collection_contributors*", lambda r: r.fulfill(json=[]))
    page.route("**/rest/v1/collection_favorites*", lambda r: r.fulfill(json=[]))


    # 4. User Folders
    def handle_folders(route):
        route.fulfill(json=[
            {
                "id": "folder-1",
                "owner_id": "user-1",
                "name": "2024 Travels",
                "slug": "2024-travels",
                "description": "My plans for 2024",
                "is_public": True,
                "created_at": "2024-01-01T00:00:00+00:00",
                "items_count": [{"count": 1}],
                "user_folder_items": [] # Simplified for grid view
            }
        ])
    page.route("**/rest/v1/user_folders*", handle_folders)

    # 5. User Folder Items (for Manage View)
    def handle_folder_items(route):
        if route.request.method == "GET":
             route.fulfill(json=[{"collection_id": "col-1"}]) # Paris is already in folder
        else:
             route.continue_()
    page.route("**/rest/v1/user_folder_items*", handle_folder_items)

    # 6. Session Mock (Local Storage)
    page.add_init_script("""
        localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
            access_token: 'fake-jwt-token',
            refresh_token: 'fake-refresh-token',
            user: {
                id: 'user-1',
                email: 'test@example.com',
                app_metadata: { provider: 'email' },
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2023-01-01T00:00:00.000000Z'
            },
            expires_at: Math.floor(Date.now() / 1000) + 3600
        }));
    """)

    # --- Actions ---

    print("Navigating to profile...")
    page.goto("http://localhost:8080/profile/myuser")

    # Wait for loading to finish
    page.wait_for_timeout(2000)

    print("Clicking 'Organize'...")
    page.get_by_role("button", name="Organize").click()

    print("Waiting for dialog...")
    page.wait_for_selector("text=Manage Folders")

    print("Clicking folder '2024 Travels'...")
    # Click the folder row to open manage items
    page.locator("div[role='dialog']").get_by_text("2024 Travels").click()

    print("Waiting for manage view...")
    dialog = page.locator("div[role='dialog']")
    dialog.get_by_text("Manage 2024 Travels").wait_for()

    # Check if collections are listed
    dialog.get_by_text("Paris Trip").wait_for()
    dialog.get_by_text("Tokyo Eats").wait_for()

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/manage_folders.png")
    print("Done.")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    try:
        test_manage_folders(page)
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="/home/jules/verification/error.png")
    finally:
        browser.close()
