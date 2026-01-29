import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720}
        )

        # Add local storage to simulate logged in state if needed,
        # but better to rely on the app handling the session or mocking if possible.
        # Since I can't easily mock the full Supabase session without a valid JWT in this environment,
        # I will rely on the app's behavior or try to mock the network responses.

        page = await context.new_page()

        # Mock the user session to ensure we are logged in
        # We need to set the local storage with a fake supabase auth token structure
        # or mock the useAuth hook response if possible.
        # Easier strategy: Mock the network requests to return a user session.

        # However, for this specific test, let's try to navigate to a mocked collection map
        # and see if the UI renders.

        await page.route("**/rest/v1/auth/v1/user", lambda route: route.fulfill(
            status=200,
            body='{"id": "user-123", "email": "test@example.com"}',
            headers={"content-type": "application/json"}
        ))

        # Mock fetching the collection
        await page.route("**/rest/v1/collections*", lambda route: route.fulfill(
            status=200,
            body='[{"id": "col-123", "name": "My Cool Map", "description": "A map of cool places", "is_public": true, "user_id": "user-123", "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}]',
            headers={"content-type": "application/json"}
        ))

        # Mock fetching contributors
        await page.route("**/rest/v1/collection_contributors*", lambda route: route.fulfill(
            status=200,
            body='[]',
            headers={"content-type": "application/json"}
        ))

        # Mock fetching profile/user info
        await page.route("**/rest/v1/profiles*", lambda route: route.fulfill(
            status=200,
            body='{"id": "user-123", "username": "testuser", "full_name": "Test User"}',
            headers={"content-type": "application/json"}
        ))

        # Navigate to a collection page
        # The route is usually /map/:username/:slug or similar?
        # Let's check the routes. Based on memory: /map/:username/:slug
        try:
            # We use localhost:3000 assuming the dev server is running or we need to start it.
            # I will assume I need to start it or check if it is running.
            # For now let's assume port 8080 or 3000. Usually 8080 in this env.
            await page.goto("http://localhost:8080/map/testuser/my-cool-map", timeout=60000)

            # Wait for the settings button to appear
            # The settings button is likely an icon or text "Settings"
            # Based on code, it's a Cog icon or "Settings" text.
            # Let's wait for something that looks like the settings button.

            # Taking a screenshot of the map view first
            await asyncio.sleep(5) # Wait for load
            await page.screenshot(path="collection_map_view.png")
            print("Captured collection_map_view.png")

            # Try to find the settings button. It is usually in the header or sidebar.
            # Looking for a button with settings icon or text.
            # In the code it might be an IconButton.

            # Let's try to find the dialog trigger.
            # If the user is the owner (which we mocked), they should see it.

            # Let's look for the Settings dialog trigger
            settings_btn = page.locator("button:has-text('Settings')")
            if await settings_btn.count() == 0:
                 settings_btn = page.locator("button svg.lucide-settings").locator("..")

            if await settings_btn.count() > 0:
                await settings_btn.first.click()
                await asyncio.sleep(2)
                await page.screenshot(path="collection_settings_dialog.png")
                print("Captured collection_settings_dialog.png")

                # Check for the fields
                print("Checking for 'Map Name' input...")
                if await page.locator("input[placeholder='Map Name']").is_visible() or await page.locator("label:has-text('Name')").is_visible():
                     print("Map Name input found.")

                print("Checking for 'Collaborators'...")
                if await page.locator("text=Collaborators").is_visible():
                     print("Collaborators section found.")

            else:
                print("Settings button not found.")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="error_state.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
