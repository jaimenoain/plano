from playwright.sync_api import sync_playwright, Page, expect
import json
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    # Mock Auth
    user_id = "user-uuid"
    auth_state = {
        "access_token": "fake-token",
        "refresh_token": "fake-refresh",
        "expires_at": int(time.time()) + 3600,
        "expires_in": 3600,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": "test@example.com",
            "aud": "authenticated",
            "role": "authenticated"
        }
    }
    page.add_init_script(f"""
        window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({json.dumps(auth_state)}));
    """)

    # Mock Google Maps
    page.add_init_script("""
        window.google = {
            maps: {
                places: { AutocompleteService: class {}, PlacesService: class { findPlaceFromQuery() {} } },
                Geocoder: class { geocode(req, cb) { cb([{ formatted_address: "123 Test St", address_components: [], geometry: { location: { lat: () => 51.5, lng: () => -0.1 } } }], "OK"); } },
                Map: class { setCenter() {} setZoom() {} addListener() {} },
                Marker: class { setMap() {} setPosition() {} },
                ControlPosition: { TOP_RIGHT: 1 },
                importLibrary: async () => ({})
            }
        };
    """)

    # Mock Data
    building_id = "11111111-1111-1111-1111-111111111111"
    category_id = "00000000-0000-0000-0000-000000000001"

    # Fetch building
    # Note: query parameters order might vary, so usage of glob ** is important or regex
    # The code uses .select('*').eq('id', id).single()
    # URL likely: /rest/v1/buildings?select=*&id=eq.UUID
    # But .single() might add headers or change params.
    # It usually expects Accept: application/vnd.pgrst.object+json

    def handle_building_get(route):
        print(f"GET building: {route.request.url}")
        route.fulfill(status=200, json={
            "id": building_id,
            "name": "Original Name",
            "year_completed": 2020,
            "created_by": user_id,
            "functional_category_id": category_id,
            "main_image_url": "http://example.com/image.jpg",
            "address": "123 Test St",
            "city": "Test City",
            "country": "Test Country",
            "location": "POINT(-0.1 51.5)",
            "location_precision": "exact"
        }) # Return object directly for .single() usually

    # If the client uses .maybeSingle() or .single(), it expects one object or array depending on headers.
    # Supabase JS .single() sets Accept header.
    # If I return an object, it should be fine if status is 200.

    page.route(f"**/rest/v1/buildings?select=*&id=eq.{building_id}*", handle_building_get)


    # Relations
    page.route("**/rest/v1/building_architects*", lambda route: route.fulfill(status=200, json=[]))
    page.route("**/rest/v1/building_styles*", lambda route: route.fulfill(status=200, json=[]))
    page.route("**/rest/v1/building_functional_typologies*", lambda route: route.fulfill(status=200, json=[]))
    page.route("**/rest/v1/building_attributes*", lambda route: route.fulfill(status=200, json=[]))

    # Taxonomy
    page.route("**/rest/v1/functional_categories*", lambda route: route.fulfill(status=200, json=[{"id": category_id, "name": "Residential", "slug": "residential"}]))
    page.route("**/rest/v1/functional_typologies*", lambda route: route.fulfill(status=200, json=[]))
    page.route("**/rest/v1/attribute_groups*", lambda route: route.fulfill(status=200, json=[]))
    page.route("**/rest/v1/attributes*", lambda route: route.fulfill(status=200, json=[]))

    # RPCs
    page.route("**/rest/v1/rpc/find_nearby_buildings", lambda route: route.fulfill(status=200, json=[]))

    # Mock Update (PATCH)
    def handle_patch(route):
        print(f"PATCH request body: {route.request.post_data}")
        route.fulfill(status=200, json={})

    page.route(f"**/rest/v1/buildings?id=eq.{building_id}", handle_patch)

    # Catch-all for other building queries to avoid 404s if I missed something
    # page.route("**/rest/v1/buildings*", lambda route: route.continue_()) # Or log it

    # Navigate
    print("Navigating to Edit Building...")
    try:
        page.goto(f"http://localhost:8080/building/{building_id}/edit")

        # Wait for form
        print("Waiting for form...")
        # Increase timeout
        expect(page.get_by_text("Edit Building Details")).to_be_visible(timeout=10000)

        # Verify Name label has no asterisk
        name_label = page.locator("label[for='name']")
        expect(name_label).to_be_visible()
        # Check text content explicitly
        text = name_label.text_content()
        if "*" in text:
            raise Exception(f"Name label contains asterisk: {text}")
        print("Verified Name label has no asterisk.")

        # Clear Name
        print("Clearing Name...")
        page.fill("#name", "")

        # Verify Category label has no asterisk
        # Find label by text "Category"
        category_label = page.locator("label", has_text="Category").first
        expect(category_label).to_be_visible()
        cat_text = category_label.text_content()
        if "*" in cat_text:
            raise Exception(f"Category label contains asterisk: {cat_text}")
        print("Verified Category label has no asterisk.")

        # Submit
        print("Submitting form...")
        page.get_by_role("button", name="Update Building").click()

        # Wait a bit
        page.wait_for_timeout(2000)

        # Screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/verify_edit_optional.png", full_page=True)
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error_screenshot.png", full_page=True)
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
