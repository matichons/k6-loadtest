import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const httpReqFailed = new Rate('http_req_failed');  // Track failed requests
const httpReqSuccess = new Counter('http_req_success');  // Track successful interactions
const pageLoadTime = new Trend('page_load_time', true);  

const totalRequest = new Counter('total_request');
const throughputMetric = new Trend('throughput', true);  // Track throughput (requests per second)

// Set duration in seconds manually (for throughput calculation)
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
        const startTime = new Date().getTime();  // Start time for page load tracking
    const response = await page.goto('http://212.80.215.158/main.php?cat_id=3&tab=available&section=watch_video&state=watch&course_id=89', { timeout: 60000 });
    
    totalRequest.add(1);  // Increment total requests immediately after loading the page

    const endTime = new Date().getTime();  // End time for page load tracking
    // Track page load time
    pageLoadTime.add(endTime - startTime);

    // Check if page loaded successfully
    check(response, {
      'Page loaded successfully': (res) => res.status() === 200,
    }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);

    await page.screenshot({ path: 'screenshots/confirmButton.png' });
    const confirmButton = await page.$('button#modal-confirm' ,{ state: 'visible', timeout: 5000 });

      // Click the confirm button
      await confirmButton.click();
      await sleep(2)


    await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
    const closeButton = await page.$('button.osano-cm-dialog__close.osano-cm-close');

      await closeButton.click();
  
      await page.screenshot({ path: 'screenshots/closeButton.png' });
      await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
   


    // Select the video element
    const videoElement = await page.$('video#video-active2');
    if (videoElement) {
      await page.evaluate((video) => video.play(), videoElement);
      console.log(`VU ${__VU} Iteration ${__ITER}: Video is playing.`);
      
      // Verify that the video is playing
      const isPlaying = await page.evaluate((video) => !video.paused, videoElement);
      const playSuccess = check(isPlaying, {
        'Video is playing': (playing) => playing === true,
      });

    } 


    await page.screenshot({ path: 'screenshots/Video.png' });
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
  const throughput = totalRequests / testDurationSeconds;  // Calculate throughput (requests per second)

  // Manually add throughput information to HTML report content
  const reportData = htmlReport(data);
  const customThroughputContent = `<h2>Throughput: ${throughput.toFixed(2)} requests per second</h2>\n`;

  // Insert throughput into the HTML content (modify as needed)
  const finalHtmlReport = reportData.replace('</body>', customThroughputContent + '</body>');

  // Output final report with throughput included
  return {
    'view-video-20.html': finalHtmlReport,  // Generate HTML report with throughput
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests: totalRequests,
      data,
    }, null, 2),
  };
}