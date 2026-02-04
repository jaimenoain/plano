from playwright.sync_api import sync_playwright

def verify_sidebar(page):
    # Setup mocks similar to the test
    page.route('**/auth/v1/user', lambda route: route.fulfill(
        status=200,
        content_type='application/json',
        body='{"id":"user-123","email":"test@example.com","user_metadata":{"onboarding_completed":true},"app_metadata":{},"aud":"authenticated","created_at":"2023-01-01T00:00:00Z"}'
    ))

    # Inject token
    page.add_init_script("""
        window.localStorage.setItem(
          'sb-lnqxtomyucnnrgeapnzt-auth-token',
          JSON.stringify({
            access_token: 'header.payload.signature',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            expires_at: Date.now() / 1000 + 3600,
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { onboarding_completed: true },
              app_metadata: {},
              aud: 'authenticated',
            },
          })
        );
    """)

    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto("http://localhost:8080/")

    # Wait for sidebar to be visible
    page.wait_for_selector(".group.peer[data-state]")

    # Take screenshot of the sidebar area
    # Sidebar width is usually 18rem (288px).
    # I'll screenshot the top left corner where the logo is.

    page.screenshot(path="/home/jules/verification/sidebar_logo.png", clip={"x": 0, "y": 0, "width": 300, "height": 300})

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_sidebar(page)
        finally:
            browser.close()
