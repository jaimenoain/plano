from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 0. Mock LocalStorage for Auth
    page.add_init_script("""
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
            access_token: "fake-token",
            refresh_token: "fake-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user: {
                id: "user-uuid",
                email: "test@example.com",
                aud: "authenticated",
                role: "authenticated"
            }
        }));
    """)

    # Mock Google Maps
    page.add_init_script("""
        window.google = {
          maps: {
            Map: class { setCenter() {} setZoom() {} addListener() {} },
            Marker: class { setMap() {} setPosition() {} },
            ControlPosition: { TOP_RIGHT: 1 },
            importLibrary: async () => ({}),
          }
        };
    """)

    # Mock Building Data
    building_id = 'mock-building-id'
    mock_building = {
        "id": building_id,
        "name": 'Test Architecture Building',
        "location": 'POINT(-0.1278 51.5074)',
        "address": '123 Test St',
        "architects": ['Zaha Hadid'],
        "year_completed": 2020,
        "styles": ['Futurism'],
        "main_image_url": 'http://example.com/img.jpg',
        "description": 'A test building.',
        "created_by": 'other-user-id'
    }

    # Route requests
    def handle_buildings(route):
        if building_id in route.request.url:
             route.fulfill(json=mock_building)
        else:
             route.continue_()

    page.route('**/rest/v1/buildings*', handle_buildings)

    # Mock User Buildings (return empty initially)
    page.route('**/rest/v1/user_buildings*', lambda route: route.fulfill(json=[]))

    # Navigate
    print(f"Navigating to http://localhost:8080/building/{building_id}")
    page.goto(f"http://localhost:8080/building/{building_id}")

    page.wait_for_load_state("networkidle")

    # Click "Visited" to show rating
    try:
        visited_btn = page.get_by_role("button", name="Visited")
        if visited_btn.is_visible():
            visited_btn.click()
            print("Clicked Visited")
        else:
            print("Visited button not visible")
    except Exception as e:
        print(f"Could not find/click Visited button: {e}")

    # Wait a bit for UI update
    page.wait_for_timeout(1000)

    # Locate buttons that have Circle icon.
    # In PersonalRatingButton, circles are used.
    # Selector: svg.lucide-circle

    circles = page.locator("svg.lucide-circle")
    count = circles.count()
    print(f"Found {count} circles")

    # Hover first circle to see if it fills (capture screenshot)
    if count > 0:
        circles.nth(0).hover()
        page.wait_for_timeout(500)

    page.screenshot(path="verification/building_circles.png")
    print("Screenshot saved to verification/building_circles.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
