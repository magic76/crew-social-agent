---
name: crew-video-research
description: Fact-check current science, technology, AI, security and product topics before a short educational video or tutorial is scripted.
---
# Video research / sourcing

1. Confirm user topic, intended audience and whether the result is educational, editorial or promotional. Prefer primary documents: original paper, developer docs, disclosure, source code, regulators' public reports. Date the underlying event and the publication separately.
2. Create a claim ledger in story.json.sources (or a sidecar sources.md): URL, publisher, publication date, supported claim, confidence and caveats. Every factual number/date and visually asserted causal relationship needs a source.
3. Label "confirmed", "preliminary", "illustration", "hypothesis" and "opinion" accurately. Never reconstruct unknown incident chains as if proven. On fast-moving events, check corrections/new statements before rendering.
4. Pick ONE useful learning outcome. A 30-second lesson should not become a news dump. Prioritize explanatory mechanism and a practical conclusion.
5. Never fake screenshots, headlines, research charts, AI benchmark numbers, personal tests or user experiences. The repo is a production tool, not a generator of fictional evidence.
6. Save a source summary independent of expiring search citations: title, official URL, published/checked dates, and your own short paraphrase. Source articles and imagery retain their licenses.
7. For topics that can cause harm if reproduced as a tutorial (security exploitation, fraud, etc.), explain defenses and abstract mechanisms rather than actionable attack reproduction.

Output: verified subject, 3–6 scene-worthy factual points, one teachable takeaway, source ledger and unresolved uncertainties. Hand off to crew-video-storyboard.
