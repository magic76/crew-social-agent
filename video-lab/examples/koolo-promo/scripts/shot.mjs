import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { SITE_OUT as OUT, BASE, CHROME } from './paths.mjs';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: '1280', width: 1280, height: 800, isMobile: false, hasTouch: false },
];

const PAGES = [
  { id: 'home', path: '/', wait: 2800 },
  { id: 'home-scroll', path: '/', scroll: 'mid', wait: 1800 },
  { id: 'chat', path: '/chat', wait: 2500 },
  { id: 'friend-live', path: '/friend/live?id=zoe', wait: 3500, noClickStart: true },
  { id: 'explore', path: '/explore', wait: 2500 },
  { id: 'discover', path: '/discover', wait: 2000 },
  { id: 'shorts', path: '/teacher/shorts', wait: 2800 },
  { id: 'learn', path: '/learn', wait: 2500 },
  { id: 'tree', path: '/crew-tree-lab/', wait: 3500 },
  { id: 'me', path: '/me', wait: 2200 },
  { id: 'fortune', path: '/fortune', wait: 2500 },
  { id: 'voice-credits', path: '/me/voice-credits', wait: 2000 },
  { id: 'games', path: '/games', wait: 2000 },
  { id: 'teacher', path: '/teacher', wait: 2000 },
  { id: 'story', path: '/story', wait: 2000 },
];

fs.mkdirSync(OUT, { recursive: true });

const notes = {
  startedAt: new Date().toISOString(),
  base: BASE,
  pages: {},
  errors: [],
  httpErrors: [],
};

function log(...args) {
  console.log(new Date().toISOString().slice(11, 23), ...args);
}

async function dismissOverlays(page) {
  const clicked = [];
  for (let round = 0; round < 4; round++) {
    let did = false;
    const candidates = [
      page.getByRole('button', { name: /跳過引導/ }),
      page.getByRole('button', { name: /^跳過$/ }),
      page.getByRole('link', { name: /跳過引導/ }),
      page.getByText('跳過引導', { exact: true }),
      page.locator('button, [role="button"], a').filter({ hasText: /^跳過引導$/ }),
    ];
    for (const loc of candidates) {
      try {
        const first = loc.first();
        if ((await first.count()) && (await first.isVisible({ timeout: 400 }))) {
          await first.click({ timeout: 1500 });
          clicked.push('跳過引導');
          did = true;
          await page.waitForTimeout(400);
          break;
        }
      } catch {}
    }
    if (did) continue;

    // Language / generic modal close only if a dialog is clearly open
    try {
      const dialog = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="onboarding"]').first();
      if (await dialog.isVisible({ timeout: 200 }).catch(() => false)) {
        const closer = dialog.locator('button[aria-label="關閉"], button[aria-label="Close"], button[aria-label="close"]');
        if ((await closer.count()) && (await closer.first().isVisible().catch(() => false))) {
          await closer.first().click({ timeout: 1000 });
          clicked.push('dialog-close');
          did = true;
          await page.waitForTimeout(300);
        }
      }
    } catch {}
    if (!did) break;
  }
  return clicked;
}

async function extract(page) {
  return page.evaluate(() => {
    const text = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const title = document.title;
    const h1 = [...document.querySelectorAll('h1')].map(text).filter(Boolean);
    const h2 = [...document.querySelectorAll('h2')].map(text).filter(Boolean).slice(0, 12);
    const nav = text(document.querySelector('nav.crew-mobile-dock, nav.global-nav, [class*="mobile-dock"]'));
    // visible body snippet
    const body = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
    const ctas = [...document.querySelectorAll('button, a')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 8 && r.height > 8 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight;
      })
      .map((el) => text(el))
      .filter((t) => t && t.length < 40)
      .slice(0, 25);
    const imgs = [...document.querySelectorAll('img')].slice(0, 12).map((img) => ({
      alt: img.alt || '',
      w: img.naturalWidth,
      h: img.naturalHeight,
      src: (img.currentSrc || img.src || '').split('/').pop(),
    }));
    return { title, h1, h2, nav, body, ctas, imgs, url: location.href };
  });
}

async function maybeScroll(page, kind, viewport) {
  if (kind === 'mid') {
    await page.evaluate((h) => window.scrollTo(0, Math.round(h * 0.85)), viewport.height);
    await page.waitForTimeout(600);
  }
}

async function shotOne(browser, vp, item) {
  const tag = `${vp.name}-${item.id}`;
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    userAgent: vp.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    colorScheme: 'light',
  });
  // Do not grant mic/camera; deny if prompted
  await context.grantPermissions([], { origin: BASE });

  const page = await context.newPage();
  page.on('pageerror', (e) => {
    notes.errors.push({ tag, type: 'pageerror', message: e.message });
    log('PAGEERROR', tag, e.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      notes.errors.push({ tag, type: 'console', message: msg.text() });
    }
  });
  page.on('dialog', async (d) => {
    notes.errors.push({ tag, type: 'dialog', message: d.message() });
    await d.dismiss();
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon|oklch|sourcemap/i.test(r.url())) {
      notes.httpErrors.push({ tag, status: r.status(), url: r.url() });
    }
  });

  const url = BASE + item.path;
  log('GOTO', tag, url);
  let navStatus = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    navStatus = resp?.status() ?? null;
  } catch (e) {
    notes.errors.push({ tag, type: 'goto', message: e.message });
    log('GOTO FAIL', tag, e.message);
  }
  try {
    await page.waitForLoadState('networkidle', { timeout: 12000 });
  } catch {}
  await page.waitForTimeout(600);
  const dismissed = await dismissOverlays(page);
  await maybeScroll(page, item.scroll, vp);
  await page.waitForTimeout(item.wait || 2000);
  // Dismiss again in case overlay appeared late
  const dismissed2 = await dismissOverlays(page);

  let info = {};
  try {
    info = await extract(page);
  } catch (e) {
    info = { extractError: e.message };
  }

  const file = path.join(OUT, `${tag}.png`);
  await page.screenshot({ path: file, type: 'png' });
  const stat = fs.statSync(file);
  log('SHOT', tag, file, stat.size);

  notes.pages[tag] = {
    file,
    url: info.url || url,
    navStatus,
    dismissed: [...dismissed, ...dismissed2],
    title: info.title,
    h1: info.h1,
    h2: info.h2,
    nav: info.nav,
    ctas: info.ctas,
    body: info.body,
    imgs: info.imgs,
  };

  await context.close();
  return file;
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});

try {
  // Sequential per viewport to keep load gentle; pages within a viewport sequential
  // because the live site may rate-limit guests.
  for (const vp of VIEWPORTS) {
    for (const item of PAGES) {
      try {
        await shotOne(browser, vp, item);
      } catch (e) {
        notes.errors.push({ tag: `${vp.name}-${item.id}`, type: 'fatal', message: e.message, stack: e.stack });
        log('FATAL', `${vp.name}-${item.id}`, e.message);
      }
    }
  }
} finally {
  await browser.close();
}

notes.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(OUT, 'notes.json'), JSON.stringify(notes, null, 2));
log('DONE', Object.keys(notes.pages).length, 'shots', 'errors', notes.errors.length);
