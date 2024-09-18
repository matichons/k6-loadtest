import { browser } from 'k6/browser';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
export const options = {
  scenarios: {
    ui: {
      // executor: 'shared-iterations',
      executor: 'constant-vus',
      vus: 1, // 10 concurrent users
      duration: '40s', //
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
    await page.goto('http://merz-ph2.duckdns.org/main.php?cat_id=3&tab=available&section=watch_video&state=FF1M&course_id=%27ODk=%27');
    await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
    const closeButton = await page.$('button.osano-cm-dialog__close.osano-cm-close');
    if (closeButton) {
      await closeButton.click();
  
      await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
    } else {
      console.log('Close button not found');
    }

    await page.waitForSelector('input[name="q[1]"][value="a"]', {
      state: 'visible',
      timeout: 5000,
    });
    await page.waitForSelector('input[name="q[2]"][value="b"]', {
      state: 'visible',
      timeout: 5000,
    });
    await page.screenshot({ path: 'screenshots/222.png' });
    // Click on the first radio button (question 1, answer A)
    const radio1 = await page.$('input[name="q[1]"][value="a"]');
    if (radio1) {
      await radio1.click();
      console.log('Selected answer A for question 1.');
    } else {
      console.error('Radio button for question 1 (value="a") not found.');
      failureCount.add(1);
      return;
    }
    await page.screenshot({ path: 'screenshots/3333.png' });
    // Click on the second radio button (question 2, answer B)
    const buttonLocator = page.locator('button[id="btn-test-submit"]');
    const radio2 = await page.$('input[name="q[2]"][value="b"]');
    if (radio2) {
      await radio2.click();
      console.log('Selected answer B for question 2.');
    } else {
      console.error('Radio button for question 2 (value="b") not found.');
      failureCount.add(1);
      return;
    }
    await page.screenshot({ path: 'screenshots/33344.png' });
    // Enable the submit button (simulating that both questions were answered)
    const isButtonEnabled = await buttonLocator.isEnabled();

    if (isButtonEnabled) {
      await buttonLocator.click();
    } 
    await page.waitForSelector('h1.font-bold.text-white.text-center.p-5', {
      state: 'visible',
      timeout: 5000,
    });

    // Check the heading's text content
    const successHeading = await page.$('h1.font-bold.text-white.text-center.p-5');
    if (successHeading) {
      const headingText = await successHeading.textContent();
      const isSuccess = check(headingText.trim(), {
        'Heading text is correct (สำเร็จ)': (text) => text === 'สำเร็จ',
      });

      if (isSuccess) {
        console.log(`VU ${__VU} Iteration ${__ITER}: Test succeeded.`);
        successCount.add(1); // Increment success counter
      } else {
        console.error(`VU ${__VU} Iteration ${__ITER}: Heading text is incorrect.`);
        failureCount.add(1); // Increment failure counter
      }
    } else {
      console.error(`VU ${__VU} Iteration ${__ITER}: Heading element not found.`);
      failureCount.add(1); // Increment failure counter
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