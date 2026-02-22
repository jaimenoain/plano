from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Load local HTML file
        file_path = os.path.abspath("tests/repro/repro.html")
        page.goto(f"file://{file_path}")

        # Take screenshot
        output_path = "tests/repro/screenshot.png"
        page.screenshot(path=output_path, full_page=True)
        print(f"Screenshot saved to {output_path}")
        browser.close()

if __name__ == "__main__":
    run()
