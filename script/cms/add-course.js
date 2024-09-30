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

      // Track request timings
      const startTime = new Date().getTime();
      const response = await page.goto('http://212.80.215.158/cms/index.php?r=add-course-step1&lang=th', { timeout: 60000 });
      const endTime = new Date().getTime();
      totalRequest.add(1);

      // Check if the page is loaded successfully
      check(response, {
          'Page loaded successfully': (res) => res.status() === 200,
      }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
      // await sleep(5);
      await page.screenshot({ path: `screenshots/222-${new Date().getTime()}.png` });
// Wait for and click the upload button
const uploadButton = page.locator('#btn-upload');
await uploadButton.waitFor({ state: 'visible', timeout: 10000 });
await uploadButton.click();
await page.screenshot({ path: `screenshots/123-${new Date().getTime()}.png` });
// Wait for file input and attach a file
const fileInput = page.locator('#img_header');
await fileInput.waitFor({ state: 'visible', timeout: 10000 });

// Provide the file path and read its contents
const filePath = path.resolve(__dirname, './sample-image.png'); // Replace with your local image path
const fileContents = readFileSync(filePath);

// Set the file to the input element
await fileInput.setInputFiles({ name: 'sample-image.jpg', mimeType: 'image/png', buffer: fileContents });

// Wait for the progress bar to become visible (if applicable)
const progressBar = page.locator('#divLoad');
await progressBar.waitFor({ state: 'visible', timeout: 10000 });

// Wait until the upload completes (you might need to adjust the sleep duration)
await sleep(5);
await page.screenshot({ path: `screenshots/1111-${new Date().getTime()}.png` });
// You can add more checks here to verify the successful upload
check(page, {
    'Image upload initiated': () => progressBar.isVisible(),
    // Add more checks as necessary
});

      await page.screenshot({ path: `screenshots/error-${new Date().getTime()}.png` });
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
