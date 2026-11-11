# Social editorial workspace

This directory stores the new editorial decisions and learning records. It is separate from both the daily research report and the publishing Queue.

## Daily files

- `reviews/YYYY-MM-DD-<slug>.json` records at least six candidates and at least six selected topics under the daily-six policy, evidence, a plain-language `reader_context`, selection or rejection reasons, six concrete quality notes, the chosen copy, media direction, and handoff readiness. New records use schema v2: each candidate has a `product_mention` record, and the review has a cumulative `weekly_product_mention_tracking` summary. Use `templates/daily-review.template.json` as a shape guide.
- Run `npm run editorial:check` after adding or editing a review. The validator keeps historical v1 reviews readable and checks mention tracking in v2. A valid file is structurally complete; it is not automatically suitable or authorized for publication.
- Keep the original research report in `content/reports/` or `content/research/`; do not count a research finding as a social post.
- Keep owner feedback in `feedback/events.jsonl`. Append, never rewrite prior events. Use the schema and instructions in that folder.
- Keep pilot design and actual-post metrics under `content/experiments/2026-11-05-to-18/`.

The daily target is at least six distinct topic drafts, one for each 10:00, 12:00, 14:00, 16:00, 19:00 and 21:00 Asia/Taipei slot. Each topic has separate Facebook and Threads edits; platform copies do not count as separate topics. If owned-project material is insufficient, research credible original online sources and develop useful research, technique, tool or application topics. Keep the 60/30/10 mix as an aggregate 14-day observation, not a per-day quota. A held or rejected candidate is retained for learning but must not be copied into Queue.

## Reasons and evidence

Every factual claim points to a candidate evidence ID. Prefer owned-repository commits/PRs/issues and original product or research sources. For a claim about an actual test, provide the actual test output or link; a commit message is not proof that CI passed. The validator checks structure and safety properties, while a human-readable reason explains the editorial decision.

`selected` means selected for an editorial draft. The `handoff.status` field separately states draft-only or Queue readiness. Queue readiness requires a complete asset or explicit text-only choice, all six dimensions resolved, source-reply validation for sourced posts, a current schedule, and an independently valid authorization basis.
