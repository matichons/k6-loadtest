import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const httpReqFailed = new Rate('http_req_failed');  // Track failed requests
const httpReqSuccess = new Counter('http_req_success');  // Track successful interactions
const pageLoadTime = new Trend('page_load_time', true);  

const totalRequest = new Counter('total_request');
const throughputMetric = new Trend('throughput', true);  // Track throughput (requests per second)
const testDurationSeconds = 300; // Duration for throughput calculation (20s in this case)
export const options = {
  scenarios: {
    ui: {
      executor: 'constant-vus', // This executor maintains a constant number of virtual users
      vus: 10, // 1 concurrent virtual user
      duration: '1m', // Run the test for 1 minute
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
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // await context.clearCookies();
    // await context.clearPermissions();
    const startTime = new Date().getTime();  // Start time for page load tracking
    const response =  await page.goto('http://merz-ph2.duckdns.org/cms/auth?type=', { timeout: 60000 });
    totalRequest.add(1);
    const endTime = new Date().getTime();  // End time for page load tracking
    check(response, {
      'Page loaded successfully': (res) => res.status() === 200,
    }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
    // Track page load time
    pageLoadTime.add(endTime - startTime);
    const emailLocator = page.locator('input[name="email"]');
    const passwordLocator = page.locator('input[name="password"]');
    const buttonLocator = page.locator('button[id="btn-save"]');

    await emailLocator.type('nisachonbg@hotmail.com');
    await emailLocator.dispatchEvent('change');

    await passwordLocator.type('MerzQA2024');
    await passwordLocator.dispatchEvent('change');
    const isButtonEnabled = await buttonLocator.isEnabled();
      await buttonLocator.click();
      console.log('Button clicked!');
      await new Promise(resolve => setTimeout(resolve, 10000));
  
    
   
    const headerLocator = page.locator('h1.header-menu');
    const headerText = await headerLocator.textContent();

    // Check that the text content matches "แผงควบคุม"
    const result = check({ text: headerText }, {
      'Header text is correct': (data) => data.text === 'แผงควบคุม',
    })

    if (!result) {
      console.error('Header text did not match expected value!');
    }
  } finally {
    await page.close();
  }
}

// Optional summary handler for HTML report generation
export function handleSummary(data) {
  // Access total requests from metrics
  const totalRequests = data.metrics['total_request'] ? data.metrics['total_request'].values.count : 0;
  const throughput = totalRequests / testDurationSeconds;  // Calculate throughput (requests per second)

  // Manually add throughput information to HTML report content
  const reportData = htmlReport(data);
  const customThroughputContent = `<h2>Throughput: ${throughput.toFixed(2)} requests per second</h2>\n`;

  // Insert throughput into the HTML content (modify as needed)
  const finalHtmlReport = reportData.replace('</body>', customThroughputContent + '</body>');

  // Output final report with throughput included
  return {
    'login-cms.html': finalHtmlReport,  // Generate HTML report with throughput
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}
