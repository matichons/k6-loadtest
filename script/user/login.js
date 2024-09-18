import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
  
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await context.clearCookies();
    await context.clearPermissions();
    await page.goto('http://merz-ph2.duckdns.org/index.php');
    await page.locator('//button[text()="button"]')
    // await page.locator('input[id="txtemail"]').type('qa_1@hotmail.com');
    // await page.locator('input[id="txtpassword"]').type('Merz2024');

    // await Promise.all([page.waitForNavigation(), page.locator('input[type="button"]').click()]);
   
  
    await page.screenshot({ path: 'screenshots/screenshot.png' });
    const header = await page.locator('h2').textContent();
    check(header, {
      header: (h) => h == 'Welcome, admin!',
    });
  } finally {
    await page.close();
  }
}


// export default async function () {
//   const page = await browser.newPage();

//   try {
    
//     // await page.goto('http://merz-ph2.duckdns.org/index.php');
//     await page.goto('http://merz-ph2.duckdns.org/main.php?section=home#home');
//     let cookies = await context.cookies();
//     console.log(cookies.length); // prints: 1
//     // // Enter login credentials
//     // await page.locator('input[name="email"]').type('qa_1@hotmail.com');
//     // await page.locator('input[name="password"]').type('Merz2024');

//   } finally {
//     await page.close();
//   }
// }


// export default async function () {
//   const page = await browser.newPage();

//   try {
//     await page.goto('https://test.k6.io/my_messages.php');

//     // Enter login credentials
//     await page.locator('input[name="login"]').type('admin');
//     await page.locator('input[name="password"]').type('123');

//     await page.screenshot({ path: 'screenshots/screenshot.png' });
//   } finally {
//     await page.close();
//   }
// }