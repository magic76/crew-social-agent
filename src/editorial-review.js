import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const DIMENSIONS = ['truth', 'interest', 'personal_relevance', 'opening', 'template_risk', 'media_fit'];
const OUTCOMES = new Set(['selected', 'rejected', 'hold']);
const REVIEW_STATES = new Set(['pass', 'revise', 'fail', 'hold', 'not_applicable']);
const HANDOFF_STATES = new Set(['not_created', 'draft_handoff_only', 'ready_for_local_agent']);
const MEDIA_TYPES = new Set(['real_screenshot', 'real_photo', 'real_output', 'story_comic', 'diagram', 'original_illustration', 'text_only', 'other']);
const DAILY_SIX_POLICY_START = '2026-11-05';
const STOCK_PHRASES = [
  /最近.{0,12}發布/, /這讓我想到/, /真正重要的不是.{0,30}而是/, /這不代表.{0,30}但值得關注/, /你怎麼看[？?]/
];

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function duplicateOpening(text) {
  return text.trim().split(/[。！？!?\n]/, 1)[0].trim().replace(/\s+/g, '').toLowerCase();
}

export function validateEditorialReview(review, { repoRoot = process.cwd() } = {}) {
  const errors = [];
  const error = (where, message) => errors.push(`${where}: ${message}`);

  if (review?.schema_version !== 1) error('schema_version', 'must be 1');
  if (!isIsoDate(review?.date)) error('date', 'must be YYYY-MM-DD');
  if (typeof review?.review_id !== 'string' || !/^[a-z0-9-]{8,100}$/.test(review.review_id)) error('review_id', 'must be a stable lowercase id');
  if (!Array.isArray(review?.candidates) || review.candidates.length < 6) error('candidates', 'record at least six candidates, including rejected and held topics');
  const dailySixPolicy = isIsoDate(review?.date) && review.date >= DAILY_SIX_POLICY_START;
  if (dailySixPolicy && (review?.selection_policy?.minimum_selected !== 6 || review?.selection_policy?.target_selected !== 6 || review?.selection_policy?.unit !== 'distinct_topics_not_platform_copies')) {
    error('selection_policy', 'from 2026-11-05, record a six-topic minimum and target; platform copies count as one topic');
  }

  const candidates = Array.isArray(review?.candidates) ? review.candidates : [];
  const ids = new Set();
  const selected = [];
  for (const [index, candidate] of candidates.entries()) {
    const where = `candidates[${index}]`;
    if (!candidate || typeof candidate !== 'object') { error(where, 'must be an object'); continue; }
    if (typeof candidate.id !== 'string' || !/^[a-z0-9-]{3,80}$/.test(candidate.id)) error(`${where}.id`, 'must be a stable lowercase id');
    else if (ids.has(candidate.id)) error(`${where}.id`, 'duplicates another candidate id');
    else ids.add(candidate.id);
    if (typeof candidate.topic !== 'string' || candidate.topic.trim().length < 8) error(`${where}.topic`, 'must name a specific topic');
    if (typeof candidate.class !== 'string' || !['development', 'practical', 'discussion', 'ai_news', 'research', 'other'].includes(candidate.class)) error(`${where}.class`, 'use a documented topic class');
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) error(`${where}.evidence`, 'at least one verifiable source is required');
    const evidenceIds = new Set();
    for (const [eIndex, source] of (Array.isArray(candidate.evidence) ? candidate.evidence : []).entries()) {
      const sourceWhere = `${where}.evidence[${eIndex}]`;
      if (typeof source?.id !== 'string' || !/^[a-z0-9-]{3,80}$/.test(source.id)) error(`${sourceWhere}.id`, 'must be stable');
      else if (evidenceIds.has(source.id)) error(`${sourceWhere}.id`, 'duplicates an evidence id');
      else evidenceIds.add(source.id);
      if (typeof source?.label !== 'string' || source.label.trim().length < 4) error(`${sourceWhere}.label`, 'name the source');
      if (typeof source?.url !== 'string' || !/^https:\/\//.test(source.url)) error(`${sourceWhere}.url`, 'must be a complete HTTPS URL');
      if (!isIsoDate(source?.checked_at)) error(`${sourceWhere}.checked_at`, 'must record the verification date');
    }
    if (!Array.isArray(candidate.claims) || candidate.claims.length === 0) error(`${where}.claims`, 'list the claims this story would make');
    for (const [cIndex, claim] of (Array.isArray(candidate.claims) ? candidate.claims : []).entries()) {
      if (typeof claim?.text !== 'string' || claim.text.trim().length < 8) error(`${where}.claims[${cIndex}].text`, 'must be a factual claim');
      if (!Array.isArray(claim?.evidence_ids) || claim.evidence_ids.length === 0 || claim.evidence_ids.some(id => !evidenceIds.has(id))) error(`${where}.claims[${cIndex}].evidence_ids`, 'must point to existing evidence IDs');
    }
    if (typeof candidate.reader_context !== 'string' || candidate.reader_context.trim().length < 15) error(`${where}.reader_context`, 'explain the product, feature or activity for someone who has not seen it before');
    if (typeof candidate.story_spine !== 'string' || candidate.story_spine.trim().length < 20) error(`${where}.story_spine`, 'state event, friction/choice and reader value, or explain what is missing');
    if (!OUTCOMES.has(candidate.decision?.outcome)) error(`${where}.decision.outcome`, 'must be selected, rejected or hold');
    if (typeof candidate.decision?.reason_code !== 'string' || candidate.decision.reason_code.trim().length < 3) error(`${where}.decision.reason_code`, 'use a trackable reason code');
    if (typeof candidate.decision?.reason !== 'string' || candidate.decision.reason.trim().length < 15) error(`${where}.decision.reason`, 'explain the concrete editorial decision');
    if (!candidate.quality_review || typeof candidate.quality_review !== 'object') error(`${where}.quality_review`, 'six concrete reasons are required');
    for (const dimension of DIMENSIONS) {
      const result = candidate.quality_review?.[dimension];
      if (!REVIEW_STATES.has(result?.status)) error(`${where}.quality_review.${dimension}.status`, 'use pass, revise, fail, hold or not_applicable');
      if (typeof result?.reason !== 'string' || result.reason.trim().length < 12) error(`${where}.quality_review.${dimension}.reason`, 'give a concrete, traceable reason');
    }
    if (!candidate.template_scan || !Array.isArray(candidate.template_scan.compared_review_ids) || !Array.isArray(candidate.template_scan.repeated_openers) || !Array.isArray(candidate.template_scan.stock_phrase_hits) || typeof candidate.template_scan.note !== 'string' || candidate.template_scan.note.trim().length < 12) error(`${where}.template_scan`, 'record comparison, repeated hooks/phrases and a note');
    if (!MEDIA_TYPES.has(candidate.media?.type)) error(`${where}.media.type`, 'choose an explicit medium including text_only');
    if (typeof candidate.media?.reason !== 'string' || candidate.media.reason.trim().length < 12) error(`${where}.media.reason`, 'explain how the medium serves this story');
    if (!['available', 'not_available', 'not_needed'].includes(candidate.media?.asset?.status)) error(`${where}.media.asset.status`, 'state whether a real asset exists');
    if (candidate.media?.type !== 'text_only' && candidate.media?.asset?.status === 'not_needed') error(`${where}.media.asset.status`, 'an asset type requires an asset or an explicit missing-asset state');
    if (candidate.media?.type === 'text_only' && candidate.media?.asset?.status !== 'not_needed') error(`${where}.media.asset.status`, 'text_only should be marked not_needed');
    if (candidate.media?.asset?.status === 'available') {
      if (typeof candidate.media.asset.path !== 'string') error(`${where}.media.asset.path`, 'record the real asset path');
      else {
        const asset = resolve(repoRoot, candidate.media.asset.path);
        if (!asset.startsWith(`${resolve(repoRoot)}${sep}`) || !existsSync(asset)) error(`${where}.media.asset.path`, 'asset must exist inside the repository');
      }
      if (typeof candidate.media.asset.provenance !== 'string' || candidate.media.asset.provenance.trim().length < 8) error(`${where}.media.asset.provenance`, 'record the actual source/creator and permission');
    }
    if (!HANDOFF_STATES.has(candidate.handoff?.status)) error(`${where}.handoff.status`, 'use not_created, draft_handoff_only or ready_for_local_agent');
    if (candidate.handoff?.status === 'ready_for_local_agent') {
      const unresolved = DIMENSIONS.filter(key => !['pass', 'not_applicable'].includes(candidate.quality_review?.[key]?.status));
      if (unresolved.length) error(`${where}.handoff.status`, `cannot be Queue-ready with unresolved review dimensions: ${unresolved.join(', ')}`);
      if (candidate.handoff.publish_permitted !== true || typeof candidate.handoff.authorization_basis !== 'string' || candidate.handoff.authorization_basis.trim().length < 8) error(`${where}.handoff`, 'Queue-ready requires a separate, explicit applicable authorization basis');
      if (candidate.media?.type !== 'text_only' && candidate.media?.asset?.status !== 'available') error(`${where}.handoff`, 'Queue-ready media must be a verified real asset');
      if (candidate.handoff.media_verified !== true) error(`${where}.handoff.media_verified`, 'must be true only after the real asset passes normal Queue checks');
      const replies = candidate.drafts?.first_replies;
      if (candidate.evidence.some(source => /^https:\/\//.test(source.url))) {
        for (const platform of ['facebook', 'threads']) {
          const reply = replies?.[platform];
          if (typeof reply?.text !== 'string' || !candidate.evidence.every(source => reply.text.includes(source.url) && reply.text.includes(source.label))) error(`${where}.drafts.first_replies.${platform}`, 'must contain each source name and full URL');
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reply?.requestId ?? '')) error(`${where}.drafts.first_replies.${platform}.requestId`, 'must be a UUID v4');
        }
        if (replies?.facebook?.requestId && replies.facebook.requestId === replies?.threads?.requestId) error(`${where}.drafts.first_replies`, 'platform request IDs must be independent');
      }
      if (candidate.drafts?.threads?.text?.length > 500) error(`${where}.drafts.threads`, 'exceeds the 500-character Threads limit');
      if (candidate.drafts?.facebook?.text?.length > 5000) error(`${where}.drafts.facebook`, 'exceeds the 5000-character Facebook limit');
      const copy = `${candidate.drafts?.facebook?.text ?? ''}\n${candidate.drafts?.threads?.text ?? ''}`;
      if (STOCK_PHRASES.some(pattern => pattern.test(copy))) error(`${where}.drafts`, 'contains a recurring stock phrase; rewrite or keep draft-only with an explicit reason');
      if (!candidate.handoff.schedule || candidate.handoff.schedule.date !== review.date || typeof candidate.handoff.schedule.time !== 'string') error(`${where}.handoff.schedule`, 'Queue-ready schedule must be same-day and recorded');
      if (candidate.handoff.status === 'ready_for_local_agent' && typeof candidate.handoff.queue_path !== 'string') error(`${where}.handoff.queue_path`, 'record the exact Queue path');
    }
    if (candidate.decision?.outcome === 'selected') {
      selected.push({ candidate, where });
      if (typeof candidate.drafts?.facebook?.text !== 'string' || !candidate.drafts.facebook.text.trim()) error(`${where}.drafts.facebook.text`, 'selected topic needs complete Facebook copy');
      if (typeof candidate.drafts?.threads?.text !== 'string' || !candidate.drafts.threads.text.trim()) error(`${where}.drafts.threads.text`, 'selected topic needs independently edited Threads copy');
      if (candidate.drafts?.facebook?.text?.trim() === candidate.drafts?.threads?.text?.trim()) error(`${where}.drafts`, 'Facebook and Threads copy must be separately edited');
    }
  }
  if (dailySixPolicy && selected.length < 6) error('candidates', `daily minimum is six selected topics, found ${selected.length}`);
  const openingMap = new Map();
  for (const { candidate, where } of selected) {
    const opening = duplicateOpening(candidate.drafts?.threads?.text ?? '');
    if (!opening) continue;
    if (openingMap.has(opening)) error(`${where}.drafts.threads.text`, `repeats the selected opener from ${openingMap.get(opening)}`);
    else openingMap.set(opening, where);
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: { date: review?.date ?? null, candidates: candidates.length, selected: selected.length, rejected: candidates.filter(c => c?.decision?.outcome === 'rejected').length, held: candidates.filter(c => c?.decision?.outcome === 'hold').length, queueReady: candidates.filter(c => c?.handoff?.status === 'ready_for_local_agent').length }
  };
}
