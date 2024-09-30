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
      // Add saved cookies for session management
      const savedCookies = [
          { name: 'PHPSESSID', value: '5f8evo8h2ci034h8m1kvm0nsvr', domain: '212.80.215.158', path: '/' }
      ];
      await context.addCookies(savedCookies);

      const startTime = new Date().getTime();
      const response = await page.goto('http://212.80.215.158/cms/index.php?r=edit-course-step1&id=152&lang=th', { timeout: 60000 });
      const endTime = new Date().getTime();
      totalRequest.add(1);

      check(response, {
          'Page loaded successfully': (res) => res.status() === 200,
      }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
      await sleep(2);
      
      const inputField = page.locator('#txt_subject');
      await inputField.waitFor({ state: 'visible', timeout: 10000 });
      await inputField.fill('');

      const textToInput = 'loadtest'; 
      await inputField.type(textToInput);
        //  await page.screenshot({ path: `screenshots/222-${new Date().getTime()}.png` });
      const buttonLocator = page.locator('button[id="btn-save-all"]');
      buttonLocator.waitFor({ state: 'visible', timeout: 10000 });
      buttonLocator.click()
      await sleep(1);
     
      // await sleep(1);
   // Wait for the modal to be visible
   const modal = page.locator('#confirmModal');
   await modal.waitFor({ state: 'visible', timeout: 10000 });
   await page.screenshot({ path: `screenshots/confirmModal-${new Date().getTime()}.png` });
   // Locate the element containing the text "สำเร็จ"
   const successText = page.locator('#confirm1');
   await successText.waitFor({ state: 'visible', timeout: 10000 });
   check(await successText.textContent(), {
    'Modal contains text = "สำเร็จ"': (text) => text.trim() === 'สำเร็จ',
});
// await page.screenshot({ path: `screenshots/confirm1-${new Date().getTime()}.png` });
const confirmButton = page.locator('#modal-confirm');
await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
await confirmButton.click();


   // Verify that the text content is as expected

   // Optional sleep to observe the modal
   await sleep(4);
   await page.screenshot({ path: `screenshots/end-${new Date().getTime()}.png` });
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
    'edit-course.html': finalHtmlReport,  // Generate HTML report with throughput
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}
