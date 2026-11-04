import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateEditorialReview } from '../src/editorial-review.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sample = JSON.parse(await readFile(resolve(root, 'content/editorial/reviews/2026-11-04-crew-play.json'), 'utf8'));

test('dated sample records six evidence-backed candidates and a draft-only example', () => {
  const result = validateEditorialReview(sample, { repoRoot: root });
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.candidates, 6);
  assert.equal(result.summary.selected, 1);
  assert.equal(result.summary.queueReady, 0);
});

test('daily review rejects fewer than six candidates and more than two selections', () => {
  const tooFew = structuredClone(sample);
  tooFew.candidates = tooFew.candidates.slice(0, 5);
  assert.ok(validateEditorialReview(tooFew, { repoRoot: root }).errors.some(message => message.includes('at least six')));
  const tooMany = structuredClone(sample);
  const extra = structuredClone(tooMany.candidates[0]);
  extra.id = 'candidate-extra';
  tooMany.candidates.push(extra);
  const extra2 = structuredClone(extra);
  extra2.id = 'candidate-extra-2';
  tooMany.candidates.push(extra2);
  assert.ok(validateEditorialReview(tooMany, { repoRoot: root }).errors.some(message => message.includes('cap is two')));
});

test('selected drafts need independent copy and specific reasons for all six review dimensions', () => {
  const broken = structuredClone(sample);
  broken.candidates[0].quality_review.media_fit.reason = 'ok';
  broken.candidates[0].drafts.threads.text = broken.candidates[0].drafts.facebook.text;
  const result = validateEditorialReview(broken, { repoRoot: root });
  assert.ok(result.errors.some(message => message.includes('quality_review.media_fit.reason')));
  assert.ok(result.errors.some(message => message.includes('must be separately edited')));
});

test('Queue-ready draft cannot bypass unresolved review, source replies, or authorization', () => {
  const broken = structuredClone(sample);
  const post = broken.candidates[0];
  post.handoff.status = 'ready_for_local_agent';
  post.handoff.publish_permitted = true;
  post.handoff.authorization_basis = 'standing authorization';
  post.handoff.schedule = { date: broken.date, time: '19:00' };
  post.handoff.queue_path = 'content/queue/new.json';
  post.handoff.media_verified = true;
  const result = validateEditorialReview(broken, { repoRoot: root });
  assert.ok(result.errors.some(message => message.includes('media_fit')));
  assert.ok(result.errors.some(message => message.includes('first_replies.facebook')));
  assert.ok(result.errors.some(message => message.includes('media')));
});

test('pilot cap checker catches a repeated selected Threads opener', () => {
  const repeated = structuredClone(sample);
  const second = structuredClone(repeated.candidates[0]);
  second.id = 'candidate-second';
  second.drafts.threads.text = repeated.candidates[0].drafts.threads.text;
  repeated.candidates.push(second);
  const result = validateEditorialReview(repeated, { repoRoot: root });
  assert.ok(result.errors.some(message => message.includes('repeats the selected opener')));
});
