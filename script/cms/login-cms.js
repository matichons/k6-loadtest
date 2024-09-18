import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 1,
              iterations: 1,
              maxDuration: '30s',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // await context.clearCookies();
    // await context.clearPermissions();
    await page.goto('http://merz-ph2.duckdns.org/cms/auth?type=');
   
    const emailLocator = page.locator('input[name="email"]');
    const passwordLocator = page.locator('input[name="password"]');
    const buttonLocator = page.locator('button[id="btn-save"]');

    await emailLocator.type('nisachonbg@hotmail.com');
    await emailLocator.dispatchEvent('change');

    await passwordLocator.type('MerzQA2024');
    await passwordLocator.dispatchEvent('change');
    const isButtonEnabled = await buttonLocator.isEnabled();

    if (isButtonEnabled) {
      await buttonLocator.click();
      console.log('Button clicked!');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await page.screenshot({ path: 'screenshots/Buttonclicked.png' });
    } 
    await page.screenshot({ path: 'screenshots/login.png' });
    const headerLocator = page.locator('h1.header-menu');
    const headerText = await headerLocator.textContent();

    // Check that the text content matches "แผงควบคุม"
    const result = check({ text: headerText }, {
      'Header text is correct': (data) => data.text === 'แผงควบคุม',
    });

    if (!result) {
      console.error('Header text did not match expected value!');
    }

    await page.screenshot({ path: 'screenshots/แผงควบคุม.png' });
  } finally {
    await page.close();
  }
}

