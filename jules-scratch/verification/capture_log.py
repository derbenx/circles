import asyncio
from playwright.async_api import async_playwright
import os
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        debug_info_found = asyncio.Event()

        async def handle_console(msg):
            # In the async API, .type and .text are properties, not methods.
            if msg.type == 'error' and "Unsupported index type" in msg.text:
                print("--- Found target console error ---")
                try:
                    if len(msg.args) > 1:
                        js_handle = msg.args[1]
                        obj = await js_handle.json_value()
                        with open("debug_output.txt", "w") as f:
                            f.write(json.dumps(obj, indent=2))
                        print("--- Successfully wrote debug_output.txt ---")
                        debug_info_found.set()
                    else:
                        print("--- Console error did not have the expected object. ---")
                except Exception as e:
                    print(f"--- Error processing console message: {e} ---")

        page.on("console", handle_console)

        # Step 1: Navigate to index.html to set up the VR background
        index_path = os.path.abspath('index.html')
        await page.goto(f'file://{index_path}')
        print("--- Navigated to index.html ---")

        # Open VR settings
        await page.get_by_role("button", name="-VR Settings-").click()
        print("--- Clicked settings toggle ---")

        # Select 3D Scene mode
        await page.get_by_label("3D Scene").check()
        print("--- Selected 3D Scene mode ---")

        # Upload the glTF file
        file_input = page.locator("#gltf-file-input")
        await file_input.set_input_files('ninja250.glb')
        print("--- Uploaded ninja250.glb ---")

        await page.wait_for_timeout(1000)

        # Step 2: Navigate to the game page to trigger the VR session
        sol_path = os.path.abspath('sol.html')
        await page.goto(f'file://{sol_path}')
        print("--- Navigated to sol.html ---")

        # Click the "Start VR" button. This will trigger the glTF loading in vrxr.js
        await page.get_by_role("button", name="Start VR").click()
        print("--- Clicked Start VR ---")

        # Wait for the console event to be captured or timeout
        try:
            await asyncio.wait_for(debug_info_found.wait(), timeout=10)
        except asyncio.TimeoutError:
            print("--- Timed out waiting for debug info. The error may not have occurred. ---")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
