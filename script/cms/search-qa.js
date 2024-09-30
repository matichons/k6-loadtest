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

function generateRandomEmail() {
  return `${Math.random().toString(36).substring(2, 11)}@example.com`;
}

function generateRandomName() {
  return `cms_User_${Math.random().toString(36).substring(2, 8)}`;
}

// Function to generate a random email address
function generateRandomEmail() {
  const timestamp = new Date().getTime();
  return `user_${timestamp}@example.com`;
}

// Function to generate a random name
function generateRandomName() {
  return `User_${Math.random().toString(36).substring(2, 8)}`;
}


export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Add saved cookies for session management
    const savedCookies = [
      {
        name: 'PHPSESSID',
        value: '5f8evo8h2ci034h8m1kvm0nsvr',
        domain: '212.80.215.158',
        path: '/',
      },
    ];
    await context.addCookies(savedCookies);

    // Navigate to the form page
    const response = await page.goto(
      'http://212.80.215.158/cms/index.php?r=question-list&tab=all-question&clear=1',
      { waitUntil: 'networkidle', timeout: 60000 }
    );

    totalRequest.add(1);

    // Check if the page loaded successfully
    const pageLoadSuccess = check(response, {
      'Page loaded successfully': (res) => res.status() === 200,
    });

    pageLoadSuccess ? httpReqSuccess.add(1) : httpReqFailed.add(1);
      // Wait for and interact with the search input field
      const inputField = page.locator('#txt_clinic');
      await inputField.waitFor({ state: 'visible', timeout: 10000 });
      await inputField.type('Select All');
      await inputField.press('Enter');
      // await sleep(1);
           // Wait for and click the search button
           const searchButton = page.locator('#btnsearch');
           await searchButton.waitFor({ state: 'visible', timeout: 10000 });
           await searchButton.click();
     
    // await page.screenshot({ path: `screenshots/pageLoadSuccess.png` });

//     const searchButton = page.locator('#btnsearch');
//     await searchButton.waitFor({ state: 'visible', timeout: 10000 });
//     await searchButton.click();
// //  await page.screenshot({ path: `screenshots/form_filled.png` });
//     // Give time for table updates
    await sleep(1);

    // Wait for table to be visible and check its content
    const table = page.locator('#myTable tbody');
    await table.waitFor({ state: 'visible', timeout: 10000 });
    const tableText = await table.textContent();

    // Check for expected text in the table
    check(tableText, {
        'Table contains expected text = Question from QA': (text) => text.includes('Question from QA')
    });

    // Optional wait
    await sleep(1);

  } catch (e) {
    // Log the error and increment failed request counter
    console.error('Error during test execution:', e);
    httpReqFailed.add(1);
  } finally {
    // Clean up resources by closing the page and context
    await page.close();
    await context.close();
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
    'search-qa.html': finalHtmlReport,  // Generate HTML report with throughput
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}
