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

    # Mock Google Maps (needed for AddBuilding page usually)
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

    # Mock Taxonomy Data
    page.route("**/rest/v1/functional_categories*", lambda route: route.fulfill(status=200, json=[{"id": "cat1", "name": "Category 1", "slug": "cat-1"}]))
    page.route("**/rest/v1/functional_typologies*", lambda route: route.fulfill(status=200, json=[{"id": "typ1", "name": "Typology 1", "parent_category_id": "cat1"}]))

    # Attributes for Characteristics
    page.route("**/rest/v1/attribute_groups*", lambda route: route.fulfill(status=200, json=[{"id": "group1", "name": "Test Group"}]))
    page.route("**/rest/v1/attributes*", lambda route: route.fulfill(status=200, json=[{"id": "attr1", "group_id": "group1", "name": "Test Attribute"}]))

    # Other mocks to prevent errors
    page.route("**/rest/v1/architects*", lambda route: route.fulfill(status=200, json=[]))
    page.route("**/rest/v1/building_styles*", lambda route: route.fulfill(status=200, json=[]))

    # Navigate to Add Building
    print("Navigating to Add Building...")
    try:
        page.goto("http://localhost:8080/add-building")

        # Set Location
        print("Setting location on map...")
        # Click somewhat centrally on the map canvas
        page.click("canvas", position={"x": 300, "y": 300})

        # Click Continue
        print("Clicking Continue...")
        page.get_by_role("button", name="Continue").click()

        # Wait for "Test Attribute" to appear
        print("Waiting for Test Attribute...")
        attr_locator = page.get_by_role("button", name="Test Attribute")
        expect(attr_locator).to_be_visible(timeout=10000)

        # Get the class attribute
        class_attr = attr_locator.get_attribute("class")
        print(f"Class attribute: {class_attr}")

        # Check for expected classes
        # We want to ensure we verify AFTER the change.
        # But initially we can run this to see failure or current state.

        # Verify it has the primary styling classes
        if "data-[state=on]:bg-primary" in class_attr and "data-[state=on]:text-primary-foreground" in class_attr:
            print("SUCCESS: Found primary styling classes.")
        else:
            print("FAILURE: Did not find primary styling classes.")

        if "data-[state=on]:bg-secondary" in class_attr:
             print("FAILURE: Found secondary styling classes (should be removed).")
        else:
             print("SUCCESS: Did not find secondary styling classes.")

        if "border-input" in class_attr:
             print("FAILURE: Found border-input class (should be removed).")
        else:
             print("SUCCESS: Did not find border-input class.")

        # Take screenshot of the success state
        page.screenshot(path="verification/verify_characteristics_success.png", full_page=True)

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/verify_characteristics_fail.png", full_page=True)
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
