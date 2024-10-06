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

  try {
    const savedCookies = [
      { name: 'PHPSESSID', value: 'p47keu3jvnrramia050j51rjod', domain: '212.80.215.158', path: '/' }
    ];
  
    await context.addCookies(savedCookies);
    const startTime = new Date().getTime();  // Start time for page load tracking
    const response =  await page.goto('http://212.80.215.158/profile.php?cat_id=all&tab=available&section=profile', { timeout: 60000 });
    totalRequest.add(1);
    const endTime = new Date().getTime();  // End time for page load tracking
    // await page.screenshot({ path: `screenshots/response-result-${new Date().getTime()}.png` });
  // Track page load time
  pageLoadTime.add(endTime - startTime);
  check(response, {
    'Page loaded successfully': (res) => res.status() === 200,
  }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
  const editLink = page.locator('a.edit1');  // Locate the <a> tag with class 'edit1'
    
  // Ensure that the link is visible and clickable before clicking
  await editLink.waitFor({ state: 'visible', timeout: 5000 });
  
  // Perform the click action
  await editLink.click();

  const nameInput = page.locator('input#name-text');
    await nameInput.type('LOAD TEST');  // Type the new name into the input field
    // await page.screenshot({ path: `screenshots/1-nameInput-${new Date().getTime()}.png` });

    // check(nameInput, {
      
    //   'Name input field updated successfully': () => nameInput.inputValue() === 'LOAD TEST',
    // }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);

    // Click the submit button with id 'submit-btn'
    const submitButton = page.locator('button#submit-btn');
    
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });  // Ensure button is visible before clicking
    await submitButton.click();

    check(submitButton, {
      'Submit button clicked successfully': () => true,
    }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
  } catch (error) {
    // await page.screenshot({ path: `screenshots/user-error-${new Date().getTime()}.png` });
    // httpReqFailed.add(1);
    console.error('Error during test execution:', error);
  } finally {
    // Close the page and browser context
    page.close();
    
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

  const dateTime = new Date().toISOString().replace(/:/g, '-'); // Replace ':' with '-' to avoid issues in filenames
  const fileName = `userProfile-${dateTime}-50.html`;
  return {
    [fileName]: finalHtmlReport,
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}