import sys
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    # List to store console errors
    errors = []

    def handle_console_error(msg):
        if msg.type == "error":
            print(f"Console error in {msg.location}: {msg.text}")
            errors.append(f"{msg.location}: {msg.text}")

    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console errors
    page.on("console", handle_console_error)

    # Navigate to the solitaire page
    # Since it's a local static file, we use the file:// protocol
    import os
    page.goto(f"file://{os.getcwd()}/sol.html")

    # Wait for a bit to see if any errors pop up on load
    page.wait_for_timeout(2000)

    # Click the VR button to enter the 3D scene
    try:
        vr_button = page.get_by_role("button", name="Start VR")
        expect(vr_button).to_be_visible()
        vr_button.click()
    except Exception as e:
        print(f"Could not find or click the VR button: {e}")
        errors.append("Could not find or click the VR button.")

    # Wait for the VR scene to load and for any potential errors
    page.wait_for_timeout(5000)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

    if errors:
        print("\nTest failed: Console errors were detected.")
        # Exit with a non-zero status code to indicate failure
        sys.exit(1)
    else:
        print("\nTest passed: No console errors were detected.")
        sys.exit(0)


with sync_playwright() as playwright:
    run(playwright)
