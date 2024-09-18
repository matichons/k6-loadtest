import { browser } from 'k6/browser';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
export const options = {
  scenarios: {
    ui: {
      // executor: 'shared-iterations',
      executor: 'constant-vus',
      vus: 10, // 10 concurrent users
      duration: '10s', //
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0']
  },
};
const successCount = new Counter('successes');
const failureCount = new Counter('failures');
export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const savedCookies = [
      { name: 'PHPSESSID', value: '1g0k1ofrqqrmr4oslsgp1e0f3p', domain: 'merz-ph2.duckdns.org', path: '/' }
    ];
  
    await context.addCookies(savedCookies);
    await page.goto('http://merz-ph2.duckdns.org/milestone.php?cat_id=all&tab=available&section=milestone');
    await page.screenshot({ path: 'screenshots/milestone.png' });
    const element = page.locator('.planet.planet9step-lock1');

    await element.click();
    await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
    const closeButton = await page.$('button.osano-cm-dialog__close.osano-cm-close');
    if (closeButton) {
      await closeButton.click();
  
      await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
    } else {
      console.log('Close button not found');
    }
    await page.waitForSelector('div.ajs-confirm', { state: 'visible', timeout: 5000 });
    const confirmButton = await page.$('div.ajs-confirm');
    if (confirmButton) {
      await confirmButton.click();
    } else {
      console.log('Confirm button not found');
    }
    await page.waitForSelector('div.ajs-dialog h3', { state: 'visible', timeout: 5000 });
    const h3Element = await page.$('div.ajs-dialog h3');
    if (h3Element) {
      const successMessage = await h3Element.textContent();
      const isSuccess = check(successMessage.trim(), {
        'Success message is correct': (text) => text === 'สำเร็จ',
      });

      if (isSuccess) {
        successCount.add(1);
      } else {
        console.error(
          `VU ${__VU} Iteration ${__ITER}: Success message incorrect: ${successMessage.trim()}`
        );
        failureCount.add(1);
      }
    } else {
      console.error(
        `VU ${__VU} Iteration ${__ITER}: Success message element not found`
      );
      failureCount.add(1);
    }
  } catch (error) {
    console.error('Error during test execution:', error);
  } finally {
    // Close the page and browser context
    page.close();
    
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }), // Show the text summary to stdout
    'results.json': JSON.stringify(data), // Save the data to a JSON file
  };
}