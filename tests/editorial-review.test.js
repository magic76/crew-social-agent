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

test('daily review requires six candidates', () => {
  const tooFew = structuredClone(sample);
  tooFew.candidates = tooFew.candidates.slice(0, 5);
  assert.ok(validateEditorialReview(tooFew, { repoRoot: root }).errors.some(message => message.includes('at least six')));
});

test('daily six-topic policy requires six selected topics and permits six distinct drafts', () => {
  const belowMinimum = structuredClone(sample);
  belowMinimum.date = '2026-11-06';
  belowMinimum.selection_policy = { minimum_selected: 6, target_selected: 6, unit: 'distinct_topics_not_platform_copies' };
  assert.ok(validateEditorialReview(belowMinimum, { repoRoot: root }).errors.some(message => message.includes('daily minimum is six selected topics')));

  const sixTopics = structuredClone(belowMinimum);
  const template = structuredClone(sixTopics.candidates[0]);
  sixTopics.candidates = Array.from({ length: 6 }, (_, index) => {
    const candidate = structuredClone(template);
    candidate.id = `selected-topic-${index + 1}`;
    candidate.topic = `Distinct review fixture topic ${index + 1}`;
    candidate.decision.reason = `This fixture represents a distinct selected topic number ${index + 1} with evidence and a reader payoff.`;
    candidate.drafts.facebook.text = `FB ${index + 1}: ${template.drafts.facebook.text}`;
    candidate.drafts.threads.text = `Threads ${index + 1}: ${template.drafts.threads.text}`;
    return candidate;
  });
  const result = validateEditorialReview(sixTopics, { repoRoot: root });
  assert.equal(result.summary.selected, 6);
  assert.deepEqual(result.errors, []);
});

test('selected drafts need independent copy and specific reasons for all six review dimensions', () => {
  const broken = structuredClone(sample);
  broken.candidates[0].quality_review.media_fit.reason = 'ok';
  broken.candidates[0].drafts.threads.text = broken.candidates[0].drafts.facebook.text;
  const result = validateEditorialReview(broken, { repoRoot: root });
  assert.ok(result.errors.some(message => message.includes('quality_review.media_fit.reason')));
  assert.ok(result.errors.some(message => message.includes('must be separately edited')));
});

test('review requires context that explains a named product or feature to a new reader', () => {
  const missing = structuredClone(sample);
  missing.candidates[0].reader_context = 'Crew Play';
  assert.ok(validateEditorialReview(missing, { repoRoot: root }).errors.some(message => message.includes('reader_context')));
});

test('owner edit feedback log is append-ready JSONL and keeps observation separate from hypothesis', async () => {
  const content = await readFile(resolve(root, 'content/editorial/feedback/events.jsonl'), 'utf8');
  const events = content.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  assert.ok(events.length >= 1);
  assert.ok(events.every(event => typeof event.owner_signal === 'string' && (typeof event.editor_hypothesis === 'string' || event.editor_hypothesis === null) && ['direct_instruction', 'provisional', 'confirmed', 'retired'].includes(event.status)));
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

test('editorial checker catches a repeated selected Threads opener', () => {
  const repeated = structuredClone(sample);
  const second = structuredClone(repeated.candidates[0]);
  second.id = 'candidate-second';
  second.drafts.threads.text = repeated.candidates[0].drafts.threads.text;
  repeated.candidates.push(second);
  const result = validateEditorialReview(repeated, { repoRoot: root });
  assert.ok(result.errors.some(message => message.includes('repeats the selected opener')));
});
