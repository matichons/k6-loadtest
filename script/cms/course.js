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
      vus: 20, // 1 concurrent virtual user
      duration: '5m', // Run the test for 1 minute
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
      // Add saved cookies for session management
      const savedCookies = [
          { name: 'PHPSESSID', value: 'km8h6jgdtbs8g5bb6vse48k235', domain: 'merz-ph2.duckdns.org', path: '/' }
      ];
      await context.addCookies(savedCookies);

      // Track request timings
      const startTime = new Date().getTime();
      const response = await page.goto('http://merz-ph2.duckdns.org/cms/index.php?r=all-course&tab=my-details&clear=1', { timeout: 60000 });
      const endTime = new Date().getTime();
      totalRequest.add(1);

      // Check if the page is loaded successfully
      check(response, {
          'Page loaded successfully': (res) => res.status() === 200,
      }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);

      // Wait for and interact with the search input field
      const inputField = page.locator('#txt_category');
      await inputField.waitFor({ state: 'visible', timeout: 10000 });
      await inputField.type('hi');
      await inputField.press('Enter');

      // Wait for and click the search button
      const searchButton = page.locator('#btnsearch');
      await searchButton.waitFor({ state: 'visible', timeout: 10000 });
      await searchButton.click();

      // Give time for table updates
      await sleep(1);

      // Wait for table to be visible and check its content
      const table = page.locator('#myTable tbody');
      await table.waitFor({ state: 'visible', timeout: 10000 });
      const tableText = await table.textContent();

      // Check for expected text in the table
      check(tableText, {
          'Table contains expected text = TH_CaHA MOA': (text) => text.includes('TH_CaHA MOA')
      });

      // Optional wait
      await sleep(1);

  } catch (error) {
      // Increment failed request counter in case of error
      httpReqFailed.add(1);
  } finally {
      // Clean up resources by closing the page
      await page.close();
  }
}

// Optional summary handler for HTML report generation
export function handleSummary(data) {
  // Access total requests from metrics
  const totalRequests = data.metrics['total_request'] ? data.metrics['total_request'].values.count : 0;
  console.log(totalRequests)
  const throughput = totalRequests / testDurationSeconds;  // Calculate throughput (requests per second)

  // Manually add throughput information to HTML report content
  const reportData = htmlReport(data);
  const customThroughputContent = `<h2>Throughput: ${throughput.toFixed(2)} requests per second</h2>\n`;

  // Insert throughput into the HTML content (modify as needed)
  const finalHtmlReport = reportData.replace('</body>', customThroughputContent + '</body>');

  // Output final report with throughput included
  return {
    'course.html': finalHtmlReport,  // Generate HTML report with throughput
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}
