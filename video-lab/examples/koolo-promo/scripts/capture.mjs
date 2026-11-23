import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

import { WORK, ASSETS, BASE as IMPORTED_BASE, CHROME } from './paths.mjs';
const OUT = process.env.CAPTURE_OUT || (WORK + '/raw');
const STILL = process.env.STILL_OUT || (WORK + '/stills_capture');
const BASE = IMPORTED_BASE;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(STILL, { recursive: true });

function log(...a) { console.log(new Date().toISOString().slice(11, 23), ...a); }

async function dismiss(page) {
  for (let i = 0; i < 3; i++) {
    const skip = page.locator('button, a, [role="button"]').filter({ hasText: /跳過引導/ });
    try {
      if (await skip.count() && await skip.first().isVisible({ timeout: 400 })) {
        await skip.first().click({ timeout: 1500 });
        await page.waitForTimeout(400);
        continue;
      }
    } catch {}
    break;
  }
}

async function waitReady(page, ms = 1200) {
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
  await page.waitForTimeout(ms);
  await dismiss(page);
}

function attach(page, tag) {
  page.on('pageerror', e => log('PAGEERROR', tag, e.message));
  page.on('dialog', async d => { await d.dismiss(); });
}

async function makeContext(browser, { video, dpr = 2 } = {}) {
  const opts = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: dpr,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  };
  if (video) {
    opts.recordVideo = { dir: OUT, size: { width: 1080, height: 1920 } };
  }
  const context = await browser.newContext(opts);
  await context.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: false, effectiveType: '4g' }) });
    } catch {}
  });
  await context.grantPermissions([], { origin: BASE });
  return context;
}

const notes = { clips: {}, stills: [], events: [] };

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});

// ---------- High-res stills (dpr 3) ----------
{
  const context = await makeContext(browser, { dpr: 3 });
  const page = await context.newPage();
  attach(page, 'stills');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  log('STILL home zoe');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 2000);
  // Wait for Zoe photo
  try { await page.locator('img.cmh-zoe-photo, .cmh-zoe img').first().waitFor({ state: 'visible', timeout: 8000 }); } catch {}
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(STILL, 'still-home-zoe.png'), type: 'png' });

  // Click carousel dots / buttons to other slides
  const dots = page.locator('.cmh-carousel-dots button, .cmh-carousel [role="tab"]');
  const dotCount = await dots.count();
  log('carousel dots', dotCount);
  notes.events.push({ carouselDots: dotCount });
  for (let i = 0; i < Math.min(dotCount, 4); i++) {
    try {
      await dots.nth(i).click({ timeout: 2000 });
      await page.waitForTimeout(900);
      const name = ['zoe', 'friends', 'game', 'learn'][i] || `slide${i}`;
      await page.screenshot({ path: path.join(STILL, `still-home-${name}.png`), type: 'png' });
      log('still slide', name);
    } catch (e) {
      log('dot click fail', i, e.message);
    }
  }

  log('STILL chat');
  await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  await page.screenshot({ path: path.join(STILL, 'still-chat.png'), type: 'png' });
  // Click next to reveal more friends
  const next = page.locator('button:has-text(""), a:has-text("查看全部")').first();
  const arrows = page.locator('.cmh-friends, [class*="carousel"] button, button[aria-label*="下"], button[aria-label*="next" i]');
  // also the green next buttons we saw on the chat page
  const greenNext = page.getByRole('button').filter({ has: page.locator('svg, span') });
  try {
    // The chat page had visible next/prev circular buttons at the top right
    const topBtns = page.locator('button').filter({ hasText: /^$/ });
    // click the obvious next control near 查看全部
    const allBtns = page.locator('button');
    const n = await allBtns.count();
    // Try clicking a button in the upper right
    for (let i = 0; i < n; i++) {
      const box = await allBtns.nth(i).boundingBox();
      if (box && box.x > 280 && box.y < 220 && box.width < 80) {
        // might be next; click the rightmost
      }
    }
    const rightBtns = [];
    for (let i = 0; i < n; i++) {
      const box = await allBtns.nth(i).boundingBox();
      if (box && box.x > 300 && box.y < 250 && box.width >= 28 && box.width <= 72 && box.height >= 28) {
        rightBtns.push({ i, x: box.x });
      }
    }
    rightBtns.sort((a, b) => b.x - a.x);
    if (rightBtns[0]) {
      await allBtns.nth(rightBtns[0].i).click({ timeout: 1500 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(STILL, 'still-chat-2.png'), type: 'png' });
      log('chat next clicked');
    }
  } catch (e) { log('chat next', e.message); }

  log('STILL shorts feed');
  await page.goto(BASE + '/teacher/shorts', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 2000);
  await page.screenshot({ path: path.join(STILL, 'still-shorts.png'), type: 'png' });

  log('STILL shorts zoe profile');
  await page.goto(BASE + '/teacher/shorts/zoe', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 2500);
  await page.screenshot({ path: path.join(STILL, 'still-shorts-zoe.png'), type: 'png' });
  // If CTA is below fold, scroll it into view
  const cta = page.getByText(/跟 Zoe 聊這張/);
  if (await cta.count()) {
    await cta.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(STILL, 'still-shorts-zoe-cta.png'), type: 'png' });
    log('zoe CTA visible');
  } else {
    log('zoe CTA not found, body sample:');
    const t = await page.evaluate(() => document.body.innerText.slice(0, 500));
    log(t);
  }

  log('STILL explore');
  await page.goto(BASE + '/explore', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  await page.screenshot({ path: path.join(STILL, 'still-explore.png'), type: 'png' });
  await page.evaluate(() => window.scrollTo(0, 620));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(STILL, 'still-explore-2.png'), type: 'png' });

  log('STILL fortune');
  await page.goto(BASE + '/fortune', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  await page.screenshot({ path: path.join(STILL, 'still-fortune.png'), type: 'png' });

  log('STILL games');
  await page.goto(BASE + '/games', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  await page.screenshot({ path: path.join(STILL, 'still-games.png'), type: 'png' });

  log('STILL story');
  await page.goto(BASE + '/story', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  // story shelf was empty — prefer explore story card. Still grab explore story region later.
  await page.screenshot({ path: path.join(STILL, 'still-story.png'), type: 'png' });

  await context.close();
}

// ---------- Clip 1: home carousel + logo blink ----------
{
  const context = await makeContext(browser, { video: true, dpr: 2 });
  const page = await context.newPage();
  attach(page, 'home');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  log('REC home');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  await page.waitForTimeout(2200); // hold Zoe
  // logo blink by tapping the wordmark
  try {
    await page.locator('a.app-brand, .koolo-wordmark-frame, img.app-wordmark').first().click({ timeout: 2000, force: true });
    log('clicked logo');
  } catch (e) { log('logo click', e.message); }
  await page.waitForTimeout(1400);
  // advance carousel
  const dots = page.locator('.cmh-carousel-dots button, .cmh-carousel [role="tab"]');
  const n = await dots.count();
  for (let i = 1; i < Math.min(n, 4); i++) {
    try {
      await dots.nth(i).click({ timeout: 2000 });
      log('rec slide', i);
      await page.waitForTimeout(1600);
      if (i === 1) {
        // second blink while on friends
        try { await page.locator('a.app-brand').first().click({ timeout: 1000, force: true }); } catch {}
        await page.waitForTimeout(900);
      }
    } catch (e) { log('rec dot', e.message); }
  }
  await page.waitForTimeout(600);
  const vid = await page.video();
  await page.close();
  const vpath = await vid.path();
  const dest = path.join(OUT, 'clip-home.webm');
  fs.renameSync(vpath, dest);
  notes.clips.home = dest;
  log('saved', dest, fs.statSync(dest).size);
  await context.close();
}

// ---------- Clip 2: chat friend portraits, arrow through ----------
{
  const context = await makeContext(browser, { video: true, dpr: 2 });
  const page = await context.newPage();
  attach(page, 'chat');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  log('REC chat');
  await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  await page.waitForTimeout(1200);
  // click the right-hand next control a few times
  const allBtns = page.locator('button');
  const n = await allBtns.count();
  const rightBtns = [];
  for (let i = 0; i < n; i++) {
    const box = await allBtns.nth(i).boundingBox();
    if (box && box.x > 300 && box.y < 260 && box.width >= 28 && box.width <= 80 && box.height >= 28) {
      rightBtns.push({ i, x: box.x });
    }
  }
  rightBtns.sort((a, b) => b.x - a.x);
  const nextIdx = rightBtns[0]?.i;
  if (nextIdx != null) {
    for (let k = 0; k < 5; k++) {
      try {
        await allBtns.nth(nextIdx).click({ timeout: 1500 });
        await page.waitForTimeout(900);
      } catch { break; }
    }
  } else {
    log('no next button found');
  }
  await page.waitForTimeout(800);
  const vid = await page.video();
  await page.close();
  const vpath = await vid.path();
  const dest = path.join(OUT, 'clip-chat.webm');
  fs.renameSync(vpath, dest);
  notes.clips.chat = dest;
  log('saved', dest, fs.statSync(dest).size);
  await context.close();
}

// ---------- Clip 3: Zoe shorts + tap CTA (stop if captcha) ----------
{
  const context = await makeContext(browser, { video: true, dpr: 2 });
  const page = await context.newPage();
  attach(page, 'shorts');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  log('REC shorts zoe');
  await page.goto(BASE + '/teacher/shorts/zoe', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 2500);
  await page.waitForTimeout(1500);
  const cta = page.getByText(/跟 Zoe 聊這張/);
  let went = false;
  if (await cta.count()) {
    await cta.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(STILL, 'still-shorts-zoe-pre-tap.png'), type: 'png' });
    await cta.first().click({ timeout: 3000 });
    went = true;
    log('tapped 跟 Zoe 聊這張');
    await page.waitForTimeout(2500);
    const url = page.url();
    const body = await page.evaluate(() => document.body.innerText.slice(0, 800));
    const hasCaptcha = /驗證您是人類|Turnstile|CLOUDFLARE|先完成驗證/.test(body);
    notes.events.push({ afterCtaUrl: url, hasCaptcha, bodyPreview: body.slice(0, 300) });
    log('after CTA', url, 'captcha?', hasCaptcha);
    await page.screenshot({ path: path.join(STILL, 'still-after-zoe-cta.png'), type: 'png' });
    // If captcha, do not interact further. Hold only briefly then leave.
    if (!hasCaptcha) {
      await page.waitForTimeout(2000);
    } else {
      await page.waitForTimeout(400);
    }
  } else {
    log('CTA missing on profile, try main feed scroll');
    await page.goto(BASE + '/teacher/shorts', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitReady(page, 2000);
    // scroll looking for Zoe
    for (let s = 0; s < 8; s++) {
      const hit = page.getByText(/跟 Zoe 聊這張/);
      if (await hit.count()) {
        await hit.first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        await hit.first().click({ timeout: 3000 });
        went = true;
        log('tapped Zoe CTA on feed, scroll', s);
        await page.waitForTimeout(2000);
        break;
      }
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(500);
    }
  }
  const vid = await page.video();
  await page.close();
  const vpath = await vid.path();
  const dest = path.join(OUT, 'clip-shorts.webm');
  fs.renameSync(vpath, dest);
  notes.clips.shorts = dest;
  log('saved', dest, fs.statSync(dest).size, 'went', went);
  await context.close();
}

// ---------- Clip 4: explore / fortune beauty (no empty story page) ----------
{
  const context = await makeContext(browser, { video: true, dpr: 2 });
  const page = await context.newPage();
  attach(page, 'explore');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  log('REC explore-fortune');
  await page.goto(BASE + '/explore', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1800);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(1400);
  await page.goto(BASE + '/fortune', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page, 1600);
  await page.waitForTimeout(1800);
  const vid = await page.video();
  await page.close();
  const vpath = await vid.path();
  const dest = path.join(OUT, 'clip-explore-fortune.webm');
  fs.renameSync(vpath, dest);
  notes.clips.explore = dest;
  log('saved', dest, fs.statSync(dest).size);
  await context.close();
}

// Render official wordmark to PNG via Chrome
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const svg = fs.readFileSync(ASSETS + '/koolo-wordmark-koo-v2.svg', 'utf8');
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent;display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="width:800px">${svg}</div></body></html>`);
  await page.waitForTimeout(200);
  const el = page.locator('svg');
  await el.screenshot({ path: path.join(OUT, 'wordmark.png'), omitBackground: true });
  log('wordmark png');
  await context.close();
}

fs.writeFileSync(path.join(OUT, 'capture-notes.json'), JSON.stringify(notes, null, 2));
await browser.close();
log('CAPTURE DONE', notes);
