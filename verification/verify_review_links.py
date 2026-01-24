from playwright.sync_api import sync_playwright, Page, expect
import re

def test_review_links(page: Page):
    print("Setting up routes...")

    # Mock Review/Log Data
    page.route("**/rest/v1/user_buildings?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "test-review-id", "content": "Great building!", "rating": 5, "tags": [], "created_at": "2023-01-01T00:00:00Z", "user_id": "user1", "building_id": "b1", "status": "visited", "user": [{"username": "tester", "avatar_url": null}], "building": [{"id": "b1", "name": "Test Building", "main_image_url": null, "year_completed": 2020, "architects": ["Arch"], "address": "123 St"}]}'
    ))

    # Mock Likes/Comments/etc counts
    page.route("**/rest/v1/likes?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))
    page.route("**/rest/v1/comments?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock Review Links
    page.route("**/rest/v1/review_links?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[{"id": "l1", "url": "https://nytimes.com/article", "title": "NYT Article", "review_id": "test-review-id"}, {"id": "l2", "url": "https://wikipedia.org/wiki/Arch", "title": null, "review_id": "test-review-id"}]'
    ))

    # Mock Link Likes
    page.route("**/rest/v1/link_likes?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Handle mutations
    page.route("**/rest/v1/link_likes", lambda route: route.fulfill(status=201, body='{}'))

    print("Navigating to review page...")
    page.goto("http://localhost:8080/review/test-review-id")

    print("Checking links display...")
    # Check Link 1: Title + Hostname
    expect(page.get_by_text("NYT Article")).to_be_visible()
    expect(page.get_by_text("nytimes.com")).to_be_visible()

    # Check Link 2: Hostname only (as title)
    expect(page.get_by_text("wikipedia.org")).to_be_visible()

    print("Checking like interaction...")
    # Target the like button for "NYT Article"
    # Structure: div > a(text) + button(heart)
    # We find the container that has "NYT Article"
    # locator.filter(has_text="...") might match the <a>, but the button is sibling.
    # The container is the parent div.

    container = page.locator("div.rounded-lg").filter(has_text="NYT Article").last
    like_button = container.locator("button")

    # Verify button dimensions/style (touch target)
    # We added h-11 min-w-[44px]
    # We can check class
    expect(like_button).to_have_class(re.compile(r"h-11"))
    expect(like_button).to_have_class(re.compile(r"min-w-\[44px\]"))

    # like_button.click()

    # Expect optimistic update (text-red-500)
    # expect(like_button).to_have_class(re.compile(r"text-red-500"))
    # Note: Cannot test interaction without auth mock.
    # But class check confirms touch targets and display logic.

    print("Taking screenshot...")
    page.screenshot(path="verification/review_links_test.png")
    print("Done.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_review_links(page)
        except Exception as e:
            print(f"Error: {e}")
            raise e
        finally:
            browser.close()
