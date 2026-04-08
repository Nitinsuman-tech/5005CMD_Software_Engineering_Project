import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:5173/');

  // Click Register toggle
  await page.waitForSelector('.auth-toggle-btn:nth-child(2)');
  await page.click('.auth-toggle-btn:nth-child(2)');

  // Fill form
  await page.type('input[type="email"]', 'principal20@test.com');
  await page.type('input[type="password"]', 'password123');
  await page.waitForSelector('input[placeholder="Confirm Password"]');
  await page.type('input[placeholder="Confirm Password"]', 'password123');
  
  await page.select('select', 'principal');

  // Submit
  await page.click('.auth-submit-btn');

  // Wait for navigation to dashboard
  await page.waitForNavigation({ timeout: 10000 }).catch(e => console.log('nav timeout or done via SPA'));
  await page.waitForTimeout(2000);

  // Fill in school profile
  await page.waitForSelector('input[placeholder="Enter school name"]', { timeout: 5000 }).catch(e => console.log('school name input not found'));
  await page.type('input[placeholder="Enter school name"]', 'My Awesome School');
  await page.type('textarea[placeholder="Brief description of the school"]', 'A really cool school');
  await page.type('input[placeholder="e.g. Labuan Bajo, Flores"]', 'Test Location');

  // Click save
  await page.click('.save-school-btn');

  await page.waitForTimeout(3000);
  
  // Try generate access code
  const btn = await page.$('.generate-code-btn');
  if (btn) {
    console.log('Found generate code btn, clicking...');
    await btn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('Generate code btn not found!');
  }

  await browser.close();
})();
