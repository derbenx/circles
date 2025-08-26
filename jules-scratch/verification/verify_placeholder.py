import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('sol.html')

        # Go to the local HTML file
        await page.goto(f'file://{file_path}')

        # Wait for the canvas to be visible
        await page.wait_for_selector('#can')

        # Take a screenshot
        await page.screenshot(path='jules-scratch/verification/placeholder.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
