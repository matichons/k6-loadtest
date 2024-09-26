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
    const savedCookies = [
      { name: 'PHPSESSID', value: '1v7t4rsikkuo1shipmfpvbt3kj', domain: '212.80.215.158', path: '/' }
    ];
  
    await context.addCookies(savedCookies);
    await context.addCookies(savedCookies);
    const startTime = new Date().getTime();  // Start time for page load tracking
    const response =  await page.goto('http://212.80.215.158/main.php?cat_id=3&tab=available&section=watch_video&state=FF1M&course_id=%27ODk=%27', { timeout: 60000 });
    totalRequest.add(1);
    const endTime = new Date().getTime();  // End time for page load tracking
  
    // Track page load time
    pageLoadTime.add(endTime - startTime);
    check(response, {
      'Page loaded successfully': (res) => res.status() === 200,
    }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
    await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
    const closeButton = await page.$('button.osano-cm-dialog__close.osano-cm-close');
    if (closeButton) {
      await closeButton.click();
  
      await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
    } else {
      console.log('Close button not found');
    }

    await page.waitForSelector('input[name="q[1]"][value="a"]', {
      state: 'visible',
      timeout: 5000,
    });
    await page.waitForSelector('input[name="q[2]"][value="b"]', {
      state: 'visible',
      timeout: 5000,
    });
    // Click on the first radio button (question 1, answer A)
    const radio1 = await page.$('input[name="q[1]"][value="a"]');
    if (radio1) {
      await radio1.click();
      console.log('Selected answer A for question 1.');
    } 
    // Click on the second radio button (question 2, answer B)
    const buttonLocator = page.locator('button[id="btn-test-submit"]');
    const radio2 = await page.$('input[name="q[2]"][value="b"]');
    if (radio2) {
      await radio2.click();
      console.log('Selected answer B for question 2.');
    } 
  
    const isButtonEnabled = await buttonLocator.isEnabled();

    if (isButtonEnabled) {
      await buttonLocator.click();
    } 
    await page.waitForSelector('h1.font-bold.text-white.text-center.p-5', {
      state: 'visible',
      timeout: 5000,
    });

    // Check the heading's text content
    const successHeading = await page.$('h1.font-bold.text-white.text-center.p-5');
    if (successHeading) {
      const headingText = await successHeading.textContent();
      const isSuccess = check(headingText.trim(), {
        'Heading text is correct (สำเร็จ)': (text) => text === 'สำเร็จ',
      });

   
    } else {
      console.error(`VU ${__VU} Iteration ${__ITER}: Heading element not found.`);
    }


  } catch (error) {
    httpReqFailed.add(1);
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

  // Output final report with throughput included
  return {
    'testing.html': finalHtmlReport,  // Generate HTML report with throughput
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}