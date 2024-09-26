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
      vus: 50, // 1 concurrent virtual user
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
  const savedCookies = [
    { name: 'PHPSESSID', value: '1v7t4rsikkuo1shipmfpvbt3kj', domain: '212.80.215.158', path: '/' }
  ];
  await context.addCookies(savedCookies);
  const startTime = new Date().getTime();  // Start time for page load tracking
  const response =  await page.goto('http://212.80.215.158/main.php?cat_id=all&tab=available&section=benefits&state=index&course_type=available', { timeout: 60000 });
  totalRequest.add(1);
  const endTime = new Date().getTime();  // End time for page load tracking

  // Track page load time
  pageLoadTime.add(endTime - startTime);
  check(response, {
    'Page loaded successfully': (res) => res.status() === 200,
  }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
  await sleep(1)
  try{
    const targetElement = page.locator('.banner');
    await targetElement.waitFor({ state: 'visible', timeout: 10000 });

    // Extract text content from the element
    const textContent = await targetElement.textContent();

    // Verify that the text content includes "หลักสูตร"
    check(textContent, {
      'Text includes "หลักสูตร"': (text) => text.includes('หลักสูตร'),
    });
  }  catch (error) {
    httpReqFailed.add(1);
    console.log('Error verifying success message');
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
    'home-50.html': finalHtmlReport,  // Generate HTML report with throughput
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}