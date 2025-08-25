from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(
        headless=True,
        args=[
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--enable-features=WebXR,WebXRARModule',
            '--enable-features=WebXR,WebXRHandInput',
            '--enable-features=WebXR,WebXRGamepadsModule',
            '--enable-features=WebXR,WebXRLayers',
            '--enable-features=WebXR,WebXRDOMOverlay',
        ]
    )
    context = browser.new_context(
        ignore_https_errors=True
    )
    page = context.new_page()

    try:
        # Navigate to the solitaire page
        page.goto("http://localhost:8000/sol.html")

        # Click the "Enter VR" button
        page.click("#btn-vr")

        # Wait for a moment to ensure the VR view is rendered
        page.wait_for_timeout(2000)

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
