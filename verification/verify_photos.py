from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock the RPC call for heatmap data
        page.route("**/rest/v1/rpc/get_photo_heatmap_data", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"lat": 40.7128, "lng": -74.0060, "weight": 50}, {"lat": 51.5074, "lng": -0.1278, "weight": 30}]'
        ))

        # Mock other calls if necessary (e.g. for NoPhotosMapZone which fetches 'buildings')
        # NoPhotosMapZone calls supabase.from('buildings')... which is /rest/v1/buildings?...
        # Note: The query string might be complex. Matching broadly.
        page.route("**/rest/v1/buildings?*", lambda route: route.fulfill(
             status=200,
             content_type="application/json",
             # Mock one building at 0,0
             body='[{"id": "1", "name": "Building No Photo", "location": "0101000020E610000000000000000000000000000000000000", "hero_image_url": null, "community_preview_url": null, "is_deleted": false}]'
        ))

        try:
            page.goto("http://localhost:8080/test-photos", timeout=60000)

            # Wait for content to load
            expect(page.get_by_text("Photo Analytics")).to_be_visible()
            expect(page.get_by_text("Global Photo Distribution")).to_be_visible()
            expect(page.get_by_text("Buildings Missing Photos")).to_be_visible()

            # Wait a bit for maps to render (they might take a moment)
            page.wait_for_timeout(5000)

            page.screenshot(path="verification/verification_photos.png")
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
