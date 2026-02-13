
from playwright.sync_api import Page, expect, sync_playwright

def test_building_form(page: Page):
    print("Navigating to test page...")
    page.goto("http://localhost:8080/test-building-form")

    # Wait for the form to be visible
    page.wait_for_selector("form")
    print("Form loaded.")

    # Check Name Input
    name_input = page.locator("#name")
    required_attr = name_input.get_attribute("required")
    if required_attr is not None:
        raise AssertionError(f"Name input has required attribute: {required_attr}")
    print("Name input is not required.")

    # Check Name Label
    name_label = page.locator("label[for='name']")
    expect(name_label).to_have_text("Name")
    print("Name label is correct.")

    # Check Category Label
    category_label = page.locator("label[for='category-select']")
    expect(category_label).to_have_text("Category")
    print("Category label is correct.")

    # Submit the form empty
    print("Submitting form...")

    dialog_triggered = False
    def handle_dialog(dialog):
        nonlocal dialog_triggered
        dialog_triggered = True
        print(f"Dialog message: {dialog.message}")
        dialog.accept()

    page.on("dialog", handle_dialog)

    submit_button = page.get_by_role("button", name="Save Building")
    submit_button.click()

    # Wait for potential submission
    page.wait_for_timeout(2000)

    if not dialog_triggered:
        # Check for validation errors (toasts)
        toasts = page.locator("li[role='status']") # Sonner toast selector might vary
        if toasts.count() > 0:
             print(f"Toast appeared: {toasts.first.text_content()}")
             raise AssertionError("Validation error toast appeared instead of success dialog")
        else:
             print("Warning: No dialog triggered, but no error toast found either.")
    else:
        print("Success dialog triggered!")

    # Screenshot
    page.screenshot(path="/home/jules/verification/building_form.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_building_form(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            try:
                page.screenshot(path="/home/jules/verification/failure.png")
            except:
                pass
            exit(1)
        finally:
            browser.close()
