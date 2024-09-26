import { browser } from 'k6/browser';
import { check, fail, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { Counter, Rate, Trend } from 'k6/metrics';

const httpReqFailed = new Rate('http_req_failed');  // Track failed requests
const httpReqSuccess = new Counter('http_req_success');  // Track successful interactions
const pageLoadTime = new Trend('page_load_time', true);

const totalRequest = new Counter('total_request');  // Track total number of requests
const throughputMetric = new Trend('throughput', true);  // Track throughput (requests per second)
const testDurationSeconds = 300; // Duration for throughput calculation

export const options = {
  scenarios: {
    ui: {
      executor: 'constant-vus',
      vus: 20, // 40 concurrent virtual users
      duration: '5m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    'http_req_duration': ['p(99)<500'], // 99% of requests must complete below 0.5s
  },
};

async function closeCookieDialog(page) {
  try {
    await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
    const closeButton = await page.$('button.osano-cm-dialog__close.osano-cm-close');
    if (closeButton) {
      await closeButton.click();
      await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
    }
  } catch (error) {
    console.log('Cookie dialog not found or already closed');
  }
}

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await context.clearCookies();
    await context.clearPermissions();

    const startTime = new Date().getTime();
    const response = await page.goto('http://212.80.215.158/index.php', { timeout: 60000 });

    totalRequest.add(1);  // Track each request
    const endTime = new Date().getTime();
    pageLoadTime.add(endTime - startTime);

    if (!check(response, { 'Page loaded successfully': (res) => res.status() === 200 })) {
      httpReqFailed.add(1);
      fail('Page load failed');
    } else {
      httpReqSuccess.add(1);
    }

    await page.locator('input[id="txtemail"]').type('qa_1@hotmail.com');


    await page.locator('input[id="txtpassword"]').type('Merz2024');
 

    const acceptButton = page.locator('button[id="btn-save"]');
    if (!await acceptButton.isEnabled()) {
      fail('Accept button is not enabled');
    }
    await acceptButton.click();

    await closeCookieDialog(page);

    await sleep(3);
    try {
      const targetElement = page.locator('.banner');
      await targetElement.waitFor({ state: 'visible', timeout: 60000 });
    

      const textContent = await targetElement.textContent();
      if (!check(textContent, { 'Text includes "หลักสูตร"': (text) => text.includes('หลักสูตร') })) {
        httpReqFailed.add(1);
        fail('Expected text not found in target element');
      } else {
        httpReqSuccess.add(1);
      }
    } catch (error) {
      httpReqFailed.add(1);
      // Catch execution context errors
      if (error.message.includes('Execution context was destroyed')) {
        fail(`Error: ${error.message} - Likely page reload or navigation issue`);
      } else {
        fail(`Unhandled error: ${error.message}`);
      }
    }
    sleep(1);
  } finally {
    await page.close();
  }
}

export function handleSummary(data) {
  const totalRequests = data.metrics['total_request'] ? data.metrics['total_request'].values.count : 0;
  const throughput = totalRequests / testDurationSeconds;
  const reportData = htmlReport(data);
  const customThroughputContent = `<h2>Throughput: ${throughput.toFixed(2)} requests per second</h2>\n`;
  const finalHtmlReport = reportData.replace('</body>', customThroughputContent + '</body>');

  return {
    'login-20.html': finalHtmlReport,
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}