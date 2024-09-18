import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 1,
              // iterations: 200,
              // maxDuration: '30s',
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
    const savedCookies = [
      { name: 'PHPSESSID', value: 'g36eckkk0qfkgsj97a51q0kvgc', domain: 'merz-ph2.duckdns.org', path: '/' }
    ];
    
    await context.addCookies(savedCookies);
    // await context.clearCookies();
    // await context.clearPermissions();
    await page.goto('http://merz-ph2.duckdns.org/cms/index.php?r=milestone');
    await page.screenshot({ path: 'screenshots/milestone.png' });

  } finally {
    await page.close();
  }
}

