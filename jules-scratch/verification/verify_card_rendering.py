import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # List to store console messages
        console_logs = []

        # Set up a listener for the 'console' event
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda exc: console_logs.append(f"[pageerror] {exc}"))


        # Navigate to the local HTML file
        # Note: We need the full path to the file.
        import os
        file_path = "file://" + os.path.abspath("sol.html")
        await page.goto(file_path)

        # Mock requestSession to avoid "VR not supported" errors in a non-VR environment
        await page.evaluate("""
            if (navigator.xr) {
                navigator.xr.requestSession = async (mode) => {
                    console.log(`Mock-Fired xr.requestSession for mode: ${mode}`);
                    // Simulate a session object to avoid breaking the code that uses it
                    return {
                        requestReferenceSpace: async () => ({}),
                        updateRenderState: () => {},
                        addEventListener: () => {},
                        requestAnimationFrame: () => {},
                        inputSources: [],
                        renderState: { baseLayer: {} }
                    };
                };
            } else {
                console.log("navigator.xr not found, creating mock.");
                navigator.xr = {
                     requestSession: async (mode) => {
                        console.log(`Mock-Fired xr.requestSession for mode: ${mode}`);
                        return {
                            requestReferenceSpace: async () => ({}),
                            updateRenderState: () => {},
                            addEventListener: () => {},
                            requestAnimationFrame: () => {},
                            inputSources: [],
                            renderState: { baseLayer: {} }
                        };
                    },
                    isSessionSupported: async () => true
                }
            }
        """)

        # Click the "Start VR" button
        await page.get_by_role("button", name="Start VR").click()

        # Wait for a moment to let async operations and rendering happen
        await asyncio.sleep(2)

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

        # Print the captured logs
        print("--- Captured Console Logs ---")
        if not console_logs:
            print("No console messages were captured.")
        else:
            for log in console_logs:
                print(log)

if __name__ == "__main__":
    asyncio.run(main())
