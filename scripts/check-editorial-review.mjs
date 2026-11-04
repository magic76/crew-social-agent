#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEditorialReview } from '../src/editorial-review.js';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const folder = join(repo, 'content', 'editorial', 'reviews');
const files = (await readdir(folder)).filter(name => /^\d{4}-\d{2}-\d{2}-.+\.json$/.test(name)).sort();
if (!files.length) {
  console.error('No dated editorial review files found.');
  process.exitCode = 1;
} else {
  let invalid = 0;
  for (const file of files) {
    const review = JSON.parse(await readFile(join(folder, file), 'utf8'));
    const result = validateEditorialReview(review, { repoRoot: repo });
    console.log(JSON.stringify({ file, ...result.summary, valid: result.ok }));
    for (const message of result.errors) console.error(`${file}: ${message}`);
    if (!result.ok) invalid++;
  }
  if (invalid) process.exitCode = 1;
  else console.log(`Editorial review files verified: ${files.length}; no Queue or publisher files modified.`);
}
