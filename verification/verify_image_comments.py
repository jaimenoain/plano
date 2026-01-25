from playwright.sync_api import sync_playwright
import json
import time
import os

def verify_image_comments():
    os.makedirs('verification', exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Mock Data
        building_data = {
            'id': 'b1',
            'name': 'Test Building',
            'location': { 'type': 'Point', 'coordinates': [-0.1278, 51.5074] },
            'address': '123 Test St, London',
            'architects': ['Test Architect'],
            'year_completed': 2020,
            'styles': ['Modern'],
            'main_image_url': 'https://placehold.co/600x400?text=Main+Image',
            'description': 'A test building',
            'created_by': 'user-other'
        }

        feed_entries = [
            {
                'id': 'e1',
                'content': 'Great building!',
                'rating': 5,
                'status': 'visited',
                'tags': ['Design'],
                'created_at': '2023-01-01T12:00:00Z',
                'user': { 'username': 'reviewer1', 'avatar_url': None },
                'images': [{'id': '550e8400-e29b-41d4-a716-446655440000', 'storage_path': 'path/to/img1.jpg', 'likes_count': 5}]
            }
        ]

        comments_data = [
            {
                'id': 'c1',
                'content': 'Nice photo!',
                'created_at': '2023-01-02T12:00:00Z',
                'user': { 'id': 'u2', 'username': 'commenter1', 'avatar_url': None }
            }
        ]

        # Mock Network Routes

        # 1. Building Details
        page.route('**/rest/v1/buildings*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps(building_data)
        ))

        # 2. Architects
        page.route('**/rest/v1/building_architects*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps([])
        ))

        # 3. User Building Status (Current User) - Return null (not visited)
        page.route('**/rest/v1/user_buildings?*user_id=eq.*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps(None)
        ))

        # 4. Feed Entries (Community Notes)
        # The query uses select with join, so matching might be loose
        page.route('**/rest/v1/user_buildings?*select=*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps(feed_entries)
        ))

        # 5. Review Images Likes Count (when opening modal)
        page.route('**/rest/v1/review_images?select=likes_count*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps({'likes_count': 10})
        ))

        # 6. Image Comments
        page.route('**/rest/v1/image_comments*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps(comments_data)
        ))

        # 7. Image Likes (User status)
        page.route('**/rest/v1/image_likes*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps([])
        ))

        # 8. RPC Calls
        page.route('**/rest/v1/rpc/get_building_top_links', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps([])
        ))

        # Navigate
        page.goto('http://localhost:8080/building/b1')

        # Wait for page load
        page.wait_for_load_state('networkidle')

        # Verify Images are present
        # The first image is main image, second should be from feed (img1)
        # Carousel images
        images = page.locator('.w-full.h-full.object-cover.cursor-pointer')
        print(f"Found {images.count()} carousel images")

        # Click the feed image (which should be the second one in the carousel if we mixed them)
        # or check "Community Notes" section images.
        # Let's find an image in "Community Notes"
        community_images = page.locator('div.pt-4.border-t.border-dashed >> img')
        print(f"Found {community_images.count()} community images")

        if community_images.count() > 0:
            community_images.first.click()
        else:
            # Fallback to carousel
            images.nth(1).click()

        # Wait for Modal
        page.wait_for_selector('role=dialog', timeout=5000)
        print("Dialog opened")

        # Verify Modal Content
        # Check for comment
        try:
            page.wait_for_selector('text="Nice photo!"', timeout=5000)
            print("Comment 'Nice photo!' is visible")
        except:
            print("Comment not found")

        # Check for Like button count
        like_btn = page.locator('button:has-text("10")') # Mocked 10 likes
        if like_btn.is_visible():
            print("Like count 10 is visible")
        else:
            print("Like count not found")

        # Take screenshot
        page.screenshot(path='verification/image_comments_modal.png')
        print("Screenshot saved to verification/image_comments_modal.png")

        browser.close()

if __name__ == '__main__':
    verify_image_comments()
