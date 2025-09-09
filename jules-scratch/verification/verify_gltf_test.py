from playwright.sync_api import sync_playwright, Page, expect

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == 'error' else None)

        # Navigate to the local HTML file
        page.goto("file:///app/gltf_test.html")

        # Wait for a second to ensure WebGL has time to render
        page.wait_for_timeout(1000)

        # Take a screenshot for visual verification
        screenshot_path = "jules-scratch/verification/verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

        # Check if any console errors were captured
        if console_errors:
            print("\n--- CONSOLE ERRORS DETECTED ---")
            for error in console_errors:
                print(error)
            # Raise an exception to indicate failure
            raise Exception("Console errors were found on the page.")
        else:
            print("\nNo console errors detected.")

if __name__ == "__main__":
    main()
