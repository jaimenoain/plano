import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Desktop Search Page...');
  // Desktop View
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:8080/search');

  // Wait for search input to be visible
  try {
      // specifically target the one in the sidebar which should be visible
      // Or just use :visible
      await page.waitForSelector('input[placeholder="Search buildings or places..."]:visible', { timeout: 10000 });
      console.log('✅ Search input found on desktop');
  } catch (e) {
      console.error('❌ Search input NOT found on desktop', e);
  }

  await page.screenshot({ path: 'verification/desktop_search.png' });
  console.log('Screenshot saved: verification/desktop_search.png');

  console.log('Navigating to Mobile Search Page...');
  // Mobile View
  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload();

  try {
      await page.waitForSelector('input[placeholder="Search buildings or places..."]:visible', { timeout: 10000 });
       console.log('✅ Search input found on mobile');
  } catch (e) {
      console.error('❌ Search input NOT found on mobile', e);
  }

  await page.screenshot({ path: 'verification/mobile_search.png' });
  console.log('Screenshot saved: verification/mobile_search.png');

  await browser.close();
})();
