// Usage: node capture.cjs stills 1.0 4.2 ...   |   node capture.cjs frames
const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/user/.claude/skills/gstack/node_modules/playwright');

const FPS = 30;
const DURATION = 20;
const here = __dirname;

(async () => {
  const [mode, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto('file:///' + path.join(here, 'index.html').replace(/\\/g, '/'));
  await page.evaluate(() => window.ready);

  const shot = async (t, file) => {
    await page.evaluate((tt) => window.render(tt), t);
    await page.screenshot({ path: file, type: 'png' });
  };

  if (mode === 'stills') {
    fs.mkdirSync(path.join(here, 'stills'), { recursive: true });
    for (const s of rest) await shot(Number(s), path.join(here, 'stills', `t${Number(s).toFixed(2)}.png`));
  } else {
    const dir = path.join(here, 'frames');
    fs.mkdirSync(dir, { recursive: true });
    const n = FPS * DURATION;
    const from = rest[0] ? Number(rest[0]) : 0, to = rest[1] ? Number(rest[1]) : n;
    for (let i = from; i < to; i++) {
      await shot(i / FPS, path.join(dir, `f${String(i).padStart(4, '0')}.png`));
      if (i % 60 === 0) console.log(`frame ${i}/${n}`);
    }
  }
  await browser.close();
})();
