import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { Counter, Rate, Trend } from 'k6/metrics';

const httpReqFailed = new Rate('http_req_failed');  // Track failed requests
const httpReqSuccess = new Counter('http_req_success');  // Track successful interactions
const pageLoadTime = new Trend('page_load_time', true);  

const totalRequest = new Counter('total_request');
const throughputMetric = new Trend('throughput', true);  // Track throughput (requests per second)
const testDurationSeconds = 120; // Updated duration for throughput calculation (2 minutes in this case)

export const options = {
  scenarios: {
    ui: {
      executor: 'constant-vus', // This executor maintains a constant number of virtual users
      vus: 50, // 20 concurrent virtual users
      duration: '1m', // Run the test for 2 minutes
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    'http_req_duration': ['p(99)<500'], // 99% of requests must complete below 0.5s
    'http_req_failed': ['rate<0.01'],   // Less than 1% of requests should fail
  },
};

export default async function () {
  // Initialize the browser context
  const context = await browser.newContext();
  const page = await context.newPage();

  // Function to handle errors
  async function handleError(error, page) {
    console.error('Error during test execution:', error);
    httpReqFailed.add(1);

    // Take screenshot with a timestamp to avoid overwriting
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Replace colon and period for safe file names
    await page.screenshot({ path: `screenshots/error-${timestamp}.png` });
  }

  try {
    // Load saved cookies into the context
    const savedCookies = [
      { name: 'PHPSESSID', value: 'hi1n7p4ck6apmo5be4pjdo3hfo', domain: '212.80.215.158', path: '/' }
    ];
    await context.addCookies(savedCookies);

    // Start timing for page load
    const startTime = Date.now();

    // Navigate to the specified page
    const response = await page.goto('http://212.80.215.158/milestone.php?cat_id=all&tab=available&section=milestone',  { waitUntil: 'networkidle', timeout: 60000 });

    // Track page load time
    pageLoadTime.add(Date.now() - startTime);

    // Check if the page loaded successfully
    const isPageLoaded = check(response, {
      'Page loaded successfully': (res) => res.status() === 200,
    });

    // Increment counters based on page load status
    if (isPageLoaded) httpReqSuccess.add(1);
    else httpReqFailed.add(1);

    

  //   await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 10000 });

  //   // Locate the close button using its classes and click it
  //   const closeButton = page.locator('button.osano-cm-dialog__close.osano-cm-close');
  //   await closeButton.click();

  //   // Click the specific element
  //   await page.locator('.planet.planet9step-lock1').click();

  //   // Close the cookie dialog
  //   // await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
  //   // await page.click('button.osano-cm-dialog__close.osano-cm-close');
  //   // await sleep(1.4)
  //   // // Wait for the cookie dialog to disappear
  //   // await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
  //   await sleep(3)
  //   // // Confirm the alert box
  //   await page.waitForSelector('div.ajs-confirm', { state: 'visible', timeout: 5000 });
  //   await page.click('div.ajs-confirm');
  //  await sleep(3)
  //   // Check for success message
  //   await page.waitForSelector('div.ajs-dialog h3', { state: 'visible', timeout: 5000 });
  //   const h3Element = await page.$('div.ajs-dialog h3');
  //   const successMessage = await h3Element.textContent();
  //   const isSuccessMessageCorrect = check(successMessage.trim(), {
  //     'Success message is correct = สำเร็จ': (text) => text === 'สำเร็จ',
  //   });

  //   // Increment counters based on success message validation
  //   if (isSuccessMessageCorrect) httpReqSuccess.add(1);
  //   else httpReqFailed.add(1);
    await sleep(1)
  } catch (error) {
    await handleError(error, page);
  } finally {
    // Close the page and context
    await page.close();
  }
}


// Optional summary handler for HTML report generation
export function handleSummary(data) {
  const totalRequests = data.metrics['total_request'] ? data.metrics['total_request'].values.count : 0;
  const throughput = totalRequests / testDurationSeconds;  // Calculate throughput (requests per second)

  // Generate HTML report with throughput
  const reportData = htmlReport(data);
  const customThroughputContent = `<h2>Throughput: ${throughput.toFixed(2)} requests per second</h2>\n`;
  const finalHtmlReport = reportData.replace('</body>', customThroughputContent + '</body>');
  const dateTime = new Date().toISOString().replace(/:/g, '-'); // Replace ':' with '-' to avoid issues in filenames
  const fileName = `milestone-${dateTime}-50.html`;
  return {
    [fileName]: finalHtmlReport,
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}