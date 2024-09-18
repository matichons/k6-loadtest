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
    await page.goto('http://merz-ph2.duckdns.org/q-a.php?cat_id=all&tab=available&section=qa');
  
     await page.waitForSelector('h1.headers', {
      state: 'visible',
      timeout: 5000,
    });
    await page.waitForSelector('h1.headers', {
      state: 'visible',
      timeout: 5000,
    });
    await page.screenshot({ path: 'screenshots/qa-reward.png' });
    const h1Element = await page.$('h1.headers');
    if (h1Element) {
      // Get the text content of the <b> element inside the <h1>
      const bElement = await h1Element.$('b.font-bold');
      if (bElement) {
        const headerText = await bElement.textContent();
        const isHeaderCorrect = check(headerText.trim(), {
          'Header text is correct': (text) => text === 'คำถาม',
        });

        if (isHeaderCorrect) {
          successCount.add(1);
        } else {
      
          failureCount.add(1);
        }
      } else {
    
        failureCount.add(1);
      }
    } else {
  
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