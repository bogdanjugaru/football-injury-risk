const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, 'screenshots');

const PAGES = [
  { route: '/',               file: 'dashboard.png',        wait: 4000 },
  { route: '/players',        file: 'players.png',          wait: 4000 },
  { route: '/prediction',     file: 'prediction_empty.png', wait: 3000 },
  { route: '/statistics',     file: 'statistics.png',       wait: 5000 },
  { route: '/compare',       file: 'compare.png',          wait: 3000 },
  { route: '/squad',          file: 'squad.png',            wait: 4000 },
  { route: '/injury-timeline',file: 'timeline.png',         wait: 3000 },
  { route: '/model-comparison',file:'model_comparison.png', wait: 5000 },
  { route: '/model',          file: 'model_info.png',       wait: 4000 },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  for (const p of PAGES) {
    console.log(`Capturing ${p.file}...`);
    try {
      await page.goto(BASE + p.route, { waitUntil: 'networkidle0', timeout: 10000 });
    } catch (e) {
      // networkidle0 timed out – still try to screenshot
    }
    await sleep(p.wait);
    await page.screenshot({ path: path.join(OUT, p.file) });
    console.log(`  OK: ${p.file}`);
  }

  await browser.close();
  console.log('All screenshots done!');
})();
