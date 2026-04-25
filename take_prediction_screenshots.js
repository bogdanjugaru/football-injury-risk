const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, 'screenshots');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  console.log('Navigating to /prediction...');
  try {
    await page.goto(BASE + '/prediction', { waitUntil: 'networkidle0', timeout: 15000 });
  } catch (e) { console.log('Load timeout, continuing...'); }
  await sleep(3000);

  // Type in search
  const input = await page.$('input[placeholder*="Cauta"], input[placeholder*="cauta"], input[type="text"]');
  if (!input) { console.log('No input found!'); await browser.close(); return; }

  await input.click({ clickCount: 3 });
  await sleep(300);
  await input.type('Neymar', { delay: 80 });
  await sleep(2500);

  // Wait for dropdown button elements to appear
  console.log('Looking for dropdown buttons...');
  try {
    await page.waitForFunction(
      () => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent.includes('Neymar Jr'));
      },
      { timeout: 6000 }
    );
    console.log('Dropdown buttons found');
  } catch(e) {
    console.log('Timeout waiting for buttons, trying anyway...');
  }
  await sleep(300);

  // Use Puppeteer XPath to find the button with "Neymar Jr" text, then use ElementHandle.click()
  // This uses Puppeteer's click which properly dispatches events in the page context
  let clicked = false;
  try {
    const [btn] = await page.$x('//button[contains(., "Neymar Jr")]');
    if (btn) {
      console.log('Found button via XPath, clicking...');
      await btn.click();
      clicked = true;
      console.log('Button clicked!');
    }
  } catch(e) {
    console.log('XPath button error:', e.message);
  }

  if (!clicked) {
    // Fallback: get button bounding box and use mouse.click at coordinates
    const box = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        if (b.textContent.includes('Neymar Jr')) {
          const r = b.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, found: true };
        }
      }
      return { found: false };
    });
    if (box.found) {
      console.log(`Mouse click at (${box.x.toFixed(0)}, ${box.y.toFixed(0)})`);
      await page.mouse.click(box.x, box.y);
      clicked = true;
    }
  }

  if (!clicked) {
    console.log('Could not find Neymar Jr button at all!');
  }

  // Wait for prediction result - look for risk gauge or score percentage
  console.log('Waiting for prediction to load...');
  try {
    await page.waitForFunction(
      () => {
        // Look for the actual prediction result elements, not just any text with %
        const text = document.body.innerText;
        return (
          text.includes('Risc Accidentare') &&
          text.includes('Neymar Jr') &&
          // The gauge shows something like "77.7%" followed by risk level
          /\d{1,2}\.\d%/.test(text)
        );
      },
      { timeout: 15000 }
    );
    console.log('Prediction loaded!');
  } catch(e) {
    console.log('Timeout waiting for prediction result, proceeding anyway...');
    // Check what's on the page
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Page text preview:', pageText);
  }
  await sleep(2000);

  // Scroll to top and screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, 'prediction_result.png') });
  console.log('prediction_result.png saved');

  // Scroll down ~550px to see SHAP / Benchmark / What-If
  await page.evaluate(() => window.scrollBy(0, 550));
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, 'prediction_shap.png') });
  console.log('prediction_shap.png saved');

  await browser.close();
  console.log('Done!');
})();
