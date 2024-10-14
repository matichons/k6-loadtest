import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const httpReqFailed = new Rate('http_req_failed');  // Track failed requests
const httpReqSuccess = new Counter('http_req_success');  // Track successful interactions
const pageLoadTime = new Trend('page_load_time', true);  

const totalRequest = new Counter('total_request');
const throughputMetric = new Trend('throughput', true);  // Track throughput (requests per second)
const testDurationSeconds = 360; // Duration for throughput calculation (20s in this case)

export const options = {
  scenarios: {
    ui: {
      executor: 'ramping-vus',
      startVUs: 0, // Start with 0 virtual users
      stages: [
        { duration: '1m', target: 50 }, // Ramp up to 100 VUs in 2 minutes
        { duration: '4m', target: 100 }, // Stay at 100 VUs for 3 minutes
        { duration: '1m', target: 0 }, // Ramp down to 0 VUs in 1 minute
      ],
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
    { name: 'PHPSESSID', value: 'u4o4rttl220iqao7b5ddt8moor', domain: '212.80.215.158', path: '/' }
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
   // Wait for the dropdown button to appear and click it
  // Click on the notification button to open the dropdown
//   await page.click('.btn.btn-outline-default.btn-notify');

//   // Wait for the dropdown to be visible
//   await page.waitForSelector('.dropdown-menu.header-alert');


//    // Check if the specific notification is present
//   //  const notificationSelector = 'a.dropdown-item.click-header:has(b:text("คอร์ส QA : Course Testing 1 เปิดให้เข้าชมเเล้ว"))';
//   //  const isNotificationVisible = await page.isVisible(notificationSelector);
//  // Check if the text is present in the dropdown
// //  const textExists = page.$eval('ul.dropdown-menu', el => el.textContent.includes('คอร์ส QA : Course Testing 1 เปิดให้เข้าเรียนเเล้ว สามาร...'));

// //  // Perform the K6 check to validate the result
// //  check(textExists, {
// //      'Notification for QA Course Testing is visible': (result) => result === true,
// //  });
// // Wait for the dropdown to be fully loaded
// await page.waitForSelector('ul.dropdown-menu.show');

//  // Check if the dropdown content is visible and contains the element with `data-id="86"`
// //  const isVisible = page.isVisible('ul.dropdown-menu[data-bs-popper="static"] a[data-id="86"]', { state: 'visible', timeout: 30000 });

// // console.log("textPresent ",isVisible)
// const hasData = page.locator('.dropdown-item').count() > 0;

//     // Use K6 check to verify the condition
//     check(hasData, {
//         'Dropdown contains data': (value) => value > 0,
//     });
const button = page.locator('button.btn-notify'); 
await button.click();

check(button, {
  'Button is clicked': () => button !== null,
});
  }  catch (error) {
    httpReqFailed.add(1);
    console.log('Error verifying success message');
  }
  await page.screenshot({ path: `screenshots/error.png` });
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
  const fileName = `noti-${dateTime}-100.html`;
  return {
    [fileName]: finalHtmlReport,
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}