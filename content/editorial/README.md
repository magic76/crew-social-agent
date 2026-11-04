# Social editorial workspace

This directory stores the new editorial decisions and learning records. It is separate from both the daily research report and the publishing Queue.

## Daily files

- `reviews/YYYY-MM-DD-<slug>.json` records at least six candidates, evidence, a plain-language `reader_context`, selection or rejection reasons, six concrete quality notes, the chosen copy, media direction, and handoff readiness. Use `templates/daily-review.template.json` as a shape guide.
- Run `npm run editorial:check` after adding or editing a review. A valid file is structurally complete; it is not automatically suitable or authorized for publication.
- Keep the original research report in `content/reports/` or `content/research/`; do not count a research finding as a social post.
- Keep owner feedback in `feedback/events.jsonl`. Append, never rewrite prior events. Use the schema and instructions in that folder.
- Keep pilot design and actual-post metrics under `content/experiments/2026-11-05-to-18/`.

The pilot allows at most two posts on a day and explicitly allows zero. The approximate 60/30/10 mix is evaluated over the 14 days, not enforced as a daily quota. A held or rejected candidate is retained for learning but must not be copied into Queue.

## Reasons and evidence

Every factual claim points to a candidate evidence ID. Prefer owned-repository commits/PRs/issues and original product or research sources. For a claim about an actual test, provide the actual test output or link; a commit message is not proof that CI passed. The validator checks structure and safety properties, while a human-readable reason explains the editorial decision.

`selected` means selected for an editorial draft. The `handoff.status` field separately states draft-only or Queue readiness. Queue readiness requires a complete asset or explicit text-only choice, all six dimensions resolved, source-reply validation for sourced posts, a current schedule, and an independently valid authorization basis.
