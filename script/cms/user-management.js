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
    await page.goto('http://merz-ph2.duckdns.org/cms/index.php?r=user-management&tab=&clear=1');
    const dropdown = page.locator('select#txt_clinic');

    // Select the "Select All" option by its value
    await dropdown.selectOption('selectAll');

    // Verify the selection
    const selectedValue = await dropdown.inputValue();
    const result = check({ value: selectedValue }, {
      'Select All option is selected': (data) => data.value === 'selectAll',
    });

    if (!result) {
      console.error('Failed to select the "Select All" option!');
    }
    await page.screenshot({ path: 'screenshots/claim-reward.png' });
 // Locate and click the Search button
 const searchButton = page.locator('button#btnsearch');
 await searchButton.click();
 const link = page.locator('a.page-link[data-dt-idx="13"]');

 // Click the anchor link
 await link.click();
 // Optionally, you can add checks to verify the effect of the button click
 // For example, checking for new content or a navigation change
//  const isSuccess = check(page, {
//    'Redirected or results loaded successfully': () => page.url().includes('expected-part-of-url') || page.content().includes('expected result'),
//  });

//  if (!isSuccess) {
//    console.error('Failed to get the expected result after clicking the Search button!');
//  }


    await page.screenshot({ path: 'screenshots/claim-reward-sc.png' });
  } finally {
    await page.close();
  }
}

