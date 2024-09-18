import { browser } from 'k6/browser';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
export const options = {
  scenarios: {
    ui: {
      // executor: 'shared-iterations',
      executor: 'constant-vus',
      vus: 1, // 10 concurrent users
      duration: '10s', //
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0']
  },
};
const successCount = new Counter('successes');
const failureCount = new Counter('failures');
export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const savedCookies = [
      { name: 'PHPSESSID', value: '1g0k1ofrqqrmr4oslsgp1e0f3p', domain: 'merz-ph2.duckdns.org', path: '/' }
    ];
  
    await context.addCookies(savedCookies);
    await page.goto('http://merz-ph2.duckdns.org/main.php?cat_id=3&tab=available&section=watch_video&state=watch&course_id=89');
    const confirmButton = await page.$('button#modal-confirm');

    if (confirmButton) {
      // Click the confirm button
      await confirmButton.click();}
      await new Promise(resolve => setTimeout(resolve, 10000));

    await page.screenshot({ path: 'screenshots/testse111.png' });

    await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
    const closeButton = await page.$('button.osano-cm-dialog__close.osano-cm-close');
    if (closeButton) {
      await closeButton.click();
  
      await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
    } else {
      console.log('Close button not found');
    }


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

      if (playSuccess) {
        successCount.add(1);
        console.log(`VU ${__VU} Iteration ${__ITER}: Successfully played the video.`);
      } else {
        console.error(`VU ${__VU} Iteration ${__ITER}: Video failed to play.`);
        failureCount.add(1);
      }

    } else {
      console.error(`VU ${__VU} Iteration ${__ITER}: Video element not found.`);
      failureCount.add(1);
    }


  } catch (error) {
    console.error('Error during test execution:', error);
  } finally {
    // Close the page and browser context
    page.close();
    
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }), // Show the text summary to stdout
    'results.json': JSON.stringify(data), // Save the data to a JSON file
  };
}