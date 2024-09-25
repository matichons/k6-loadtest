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
      vus: 1, // 1 concurrent virtual user
      duration: '30s', // Run the test for 1 minute
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
    const savedCookies = [
      { name: 'PHPSESSID', value: 'ved55eufccdvmllijgtu1jfacf', domain: 'merz-ph2.duckdns.org', path: '/' }
    ];
  
    await context.addCookies(savedCookies);
    const startTime = new Date().getTime();  // Start time for page load tracking
    const response =  await page.goto('http://merz-ph2.duckdns.org/cms/index.php?r=all-course&tab=my-details&clear=1', { timeout: 60000 });
    totalRequest.add(1);
    const endTime = new Date().getTime();  // End time for page load tracking
    check(response, {
      'Page loaded successfully': (res) => res.status() === 200,
    }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
     

    // // Verify that "Highlight" is selected
    // const selectedOptions = await selectElement.evaluate(node => Array.from(node.selectedOptions).map(option => option.text));
  
    const inputField = page.locator('#txt_category');
    await inputField.waitFor({ state: 'visible', timeout: 10000 });

    // Type "hi" into the input field
    await inputField.type('hi');

    // Press "Enter" after typing
    await inputField.press('Enter');

    const searchButton = page.locator('#btnsearch');
    await searchButton.waitFor({ state: 'visible', timeout: 10000 });

    // Click the button
    await searchButton.click();
    // After clicking, wait for new content to load or the page to update
    const searchResults = page.locator('.search-result');  // Adjust this selector based on your HTML
    await searchResults.waitFor({ state: 'visible', timeout: 10000 });

    // Verify if results are present after search
    check(searchResults, {
      'Search results are displayed': (results) => results.count() > 0,  // Adjust based on the expected behavior
    });

    // Optionally, check if the URL has changed, if the search modifies the URL
    check(page, {
      'URL contains search query': () => page.url().includes('query=hi'),
    });

  } finally {
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
