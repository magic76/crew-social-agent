import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const KIT = process.env.KOLO_KIT_ROOT
  ? path.resolve(process.env.KOLO_KIT_ROOT)
  : path.resolve(HERE, '..');
export const ASSETS = path.join(KIT, 'assets');
export const WORK = path.join(KIT, 'work');
export const OUTPUT = path.join(KIT, 'output');
export const SITE_OUT = process.env.SHOT_OUT || path.join(WORK, 'site');
export const CHROME = process.env.CHROME_PATH
  || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable']
      .find((p) => { try { return fs.existsSync(p); } catch { return false; } })
  || '/usr/bin/google-chrome';
export const BASE = process.env.KOLO_BASE || 'https://koolo.app';

fs.mkdirSync(SITE_OUT, { recursive: true });
