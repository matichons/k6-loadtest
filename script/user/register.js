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
  },
};

// Utility functions to generate random email and name
function generateRandomEmail() {
  return `${Math.random().toString(36).substring(2, 11)}@example.com`;
}

function generateRandomName() {
  return `User_${Math.random().toString(36).substring(2, 8)}`;
}

// Utility function to close the cookie dialog if present
async function closeCookieDialog(page) {
  try {
    await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'visible', timeout: 5000 });
    const closeButton = await page.$('button.osano-cm-dialog__close.osano-cm-close');
    if (closeButton) {
      await closeButton.click();
      await page.waitForSelector('button.osano-cm-dialog__close.osano-cm-close', { state: 'hidden', timeout: 5000 });
    }

  } catch (error) {
    console.log('Cookie dialog not found or already closed');
  
  }
}

// Function to fill the registration form
async function fillRegistrationForm(page) {
  try {

    await page.locator('input[id="txtemail"]').type(generateRandomEmail());


    check(page, {
      'Registration form filled': (p) => p.locator('input[id="txtemail"]').isVisible(),
    });

  } catch (error) {

    console.log('Error filling registration form');
  }
}

// Function to handle button clicks with validation and screenshots
async function clickButtonIfEnabled(page,buttonLocator) {

    if (await buttonLocator.isEnabled()) {
      await buttonLocator.click();
      // console.log(`Button clicked: ${screenshotPath}`);
  
    } else {
      console.log('Button is not enabled');
    }
    // await page.screenshot({ path: `screenshots/error.png` });
}

// Function to fill additional form details
async function fillAdditionalForm(page) {
  try {
    await page.waitForSelector('#txtname', { state: 'visible', timeout: 5000 });
    await page.locator('#txtname').type(generateRandomName());
    await page.waitForSelector('#txtclinic', { state: 'visible', timeout: 5000 });
    await page.locator('#txtclinic').type('a');

    const optionId = 'ui-id-1';
    await page.waitForSelector(`#${optionId}`, { state: 'visible', timeout: 5000 });
    await page.locator(`#${optionId}`).click();

    const saveButton = page.locator('button[id="btn-save"]', { state: 'visible', timeout: 10000 });
    await clickButtonIfEnabled(page,saveButton);

    check(page, {
      'Additional form filled': (p) => p.locator('#txtname').isVisible(),
    });
 
  } catch (error) {

    console.log('Error filling additional form');
  }
  await handleTermsModal(page);
}

// Function to handle the Terms Modal interaction
async function handleTermsModal(page) {
  try {
    console.log('Handling the Terms Modal...');
    // await page.waitForSelector('#termModal', { state: 'visible', timeout: 10000 });
    // await page.evaluate(() => {
    //   const btn = document.getElementById('btn-short');
    //   if (btn) btn.click();
    //   const modalContent = document.getElementById('short-message');
    //    sleep(0.5)
    //   if (modalContent) modalContent.scrollTop = modalContent.scrollHeight;
    // });
    // sleep(2)
    // await page.screenshot({ path: `screenshots/123.png` });
    // const checkbox = page.locator('#chkTerm');
    // await checkbox.click();
    // const acceptButton = page.locator('button[id="btn-accept"]');
    // await clickButtonIfEnabled(page,acceptButton);


    await page.waitForSelector('#termModal');

    // Scroll down inside the modal to reveal the disabled checkbox
    await page.evaluate(() => {
      const modalContent = document.querySelector('#short-message');
      modalContent.scrollTo(0, modalContent.scrollHeight);
    });
  
    // Enable the checkbox (if required by JavaScript logic)
    await page.evaluate(() => {
      const checkbox = document.querySelector('#chkTerm');
      checkbox.disabled = false; // Remove the disabled attribute
    });
  
    // Click the checkbox
    await page.click('#chkTerm');
  
    // Click the accept button
    await page.click('#btn-accept');
  } catch (error) {

    console.log('Error handling Terms Modal:', error);
    console.log('Error type:', typeof error);
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
  }
}

// Function to verify the success message
async function verifySuccessMessage(page) {
  try {
    await page.waitForSelector('h3', { state: 'visible', timeout: 10000 });
    const successMessage = await page.locator('h3').textContent();
    const expectedMessage = 'Successfully applied';

    const successCheck = check(successMessage, {
      'Success message is correct': (msg) => msg.trim() === expectedMessage,
    });

    if (successCheck) {
      console.log('Success message verified: Successfully applied');
    
      console.log(`Unexpected message: ${successMessage}`);
      
    }
  } catch (error) {
    httpReqFailed.add(1);
    console.log('Error verifying success message');
  }
}

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await context.clearCookies();
    await context.clearPermissions();
    try {
      const startTime = new Date().getTime();  // Start time for page load tracking
      const response =  await page.goto('http://212.80.215.158/register.php?step=step1', { timeout: 60000 });
      totalRequest.add(1);
      const endTime = new Date().getTime();  // End time for page load tracking
  
      // Track page load time
      pageLoadTime.add(endTime - startTime);
      check(response, {
        'Page loaded successfully': (res) => res.status() === 200,
      }) ? httpReqSuccess.add(1) : httpReqFailed.add(1);
      // successResponseCounter.add(1);
    } catch (error) {
      console.log('Page navigation timed out:', error);
     
      throw error; // Re-throw the error to ensure the test fails
    }

    // Close cookie dialog if present
    await closeCookieDialog(page);
    await sleep(2)
    // Fill the registration form
    await fillRegistrationForm(page);
    // const password = generatePassword();
    await page.locator('input[id="txtpassword2"]').waitFor({ state: 'visible' });
    await page.locator('input[id="txtpassword1"]').waitFor({ state: 'visible' });

    
    
     const show2 = page.locator('#show_password2');
    await show2.waitFor({ state: 'visible', timeout: 10000 });
    await show2.click()
    const show = page.locator('#show_password1');
    await show.waitFor({ state: 'visible', timeout: 10000 });
    await show.click()
        
    // Focus on the fields before typin 
    await page.locator('input[id="txtpassword1"]').type('AAss0011');
    await page.locator('input[id="txtpassword2"]').type('AAss0011'); 
    // await page.screenshot({ path: `screenshots/Registration.png` });
    await sleep(3)
    // Click 'Next' button
    const nextButton = page.locator('button[id="btn-next"]', { state: 'visible', timeout: 10000 });
    await clickButtonIfEnabled(page,nextButton);
    // await page.screenshot({ path: `screenshots/nextButton.png` });
    await sleep(3)
    // Fill additional form details and complete registration
    await fillAdditionalForm(page);
    // await sleep(3)
    // await page.screenshot({ path: `screenshots/fillAdditionalForm.png` });
    await sleep(3)
    // Verify success message
    await verifySuccessMessage(page);

    await sleep(1)

  } finally {
    await page.close();
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

  const finalHtmlReport = reportData.replace('</body>', customThroughputContent + '</body>');
  const dateTime = new Date().toISOString().replace(/:/g, '-');
  const fileName = `register-${dateTime}-report.html`;

  return {
    [fileName]: finalHtmlReport,
    stdout: JSON.stringify({
      throughput: `${throughput.toFixed(2)} requests per second`,
      totalRequests,
      data,
    }, null, 2),
  };
}