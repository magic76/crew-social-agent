import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

import { SITE_OUT as OUT, BASE, CHROME } from './paths.mjs';
const LAUNCH = {
  executablePath: CHROME,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
};

function log(...a){ console.log(new Date().toISOString().slice(11,23), ...a); }

async function ctx(browser, vp) {
  return browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 2,
    isMobile: vp.w < 800,
    hasTouch: vp.w < 800,
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    userAgent: vp.w < 800
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
}

const browser = await chromium.launch(LAUNCH);

// 1) First-paint / onboarding on home (do NOT skip)
{
  const context = await ctx(browser, { w: 390, h: 844 });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 45000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '390-home-onboarding-early.png'), type: 'png' });
  log('early onboarding shot');
  await page.waitForTimeout(800);
  const text = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g,' ').slice(0,2000));
  fs.writeFileSync(path.join(OUT, 'home-early-text.txt'), text);
  log('early text has Crew?', /Crew|歡迎來到/.test(text), text.slice(0,400));
  await page.screenshot({ path: path.join(OUT, '390-home-onboarding.png'), type: 'png' });
  await context.close();
}

// 2) Learn after dismissing language gate only
{
  const context = await ctx(browser, { w: 390, h: 844 });
  const page = await context.newPage();
  await page.goto(BASE + '/learn', { waitUntil: 'domcontentloaded', timeout: 45000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  await page.waitForTimeout(800);
  const skip = page.getByText('先使用預設語言', { exact: true });
  if (await skip.count()) {
    await skip.first().click({ timeout: 2000 });
    log('clicked 先使用預設語言');
  } else {
    const start = page.getByRole('button', { name: /開始學習/ });
    if (await start.count()) await start.first().click({ timeout: 2000 });
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '390-learn-open.png'), type: 'png' });
  log('learn-open');
  await context.close();
}

// 3) Home mid: scroll until Shorts / 朋友最新動態 is near top
{
  const context = await ctx(browser, { w: 390, h: 844 });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2,h1,section,div')].find(e => /朋友最新動態|Koolo SHORTS|推薦遊戲|想玩什麼/.test(e.innerText||''));
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 520);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '390-home-mid.png'), type: 'png' });
  log('home-mid');

  // swipe/click hero dots or next if visible at top after scrollTo 0
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  // try clicking pagination or a next control in the hero
  const next = page.locator('button[aria-label*="下一"], button[aria-label*="next" i], [class*="dot"]').nth(1);
  try {
    if (await next.count() && await next.isVisible()) {
      await next.click({ timeout: 1500 });
      await page.waitForTimeout(900);
    }
  } catch {}
  await page.screenshot({ path: path.join(OUT, '390-home-slide2.png'), type: 'png' });
  log('home-slide2');
  await context.close();
}

// 4) Explore scrolled to lower cards (iStock check)
{
  const context = await ctx(browser, { w: 390, h: 844 });
  const page = await context.newPage();
  await page.goto(BASE + '/explore', { waitUntil: 'domcontentloaded', timeout: 45000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '390-explore-scroll.png'), type: 'png' });
  log('explore-scroll');
  await context.close();
}

await browser.close();
log('FOLLOWUP DONE');
