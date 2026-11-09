# Social Editor quality gate

Record one concrete reason for each row for every candidate. Include a `reader_context` sentence that introduces a named product or feature to someone who has never seen it. Do not average ratings or let an AI's numeric self-score approve a story.

| Dimension | Pass asks | Hold or reject when |
|---|---|---|
| Truth | Each factual sentence maps to dated primary or owned-project evidence; uncertainty is stated. | First-person experience, outcome, date, or metric is unsupported. |
| Interest | A specific surprise, friction, trade-off, decision, consequence, or useful payoff is visible. | The item is only a feature list or a generic announcement. |
| Personal relevance | The material connects to the author's real project or a clearly stated point of view. | It could be posted unchanged by any AI news account. |
| Opening | Start with the most concrete situation, reader problem, decision or discovery supported by the evidence. Add a short product explanation where it helps the reader follow. | The opening is vague, unsupported, or leaves the reader unable to understand the stakes; product-first wording is not required. |
| Template risk | The draft has a distinct structure and does not repeat an opener, punchline, or moral from recent posts. | Stock phrases, repeated framing, or an interchangeable AI conclusion dominate. |
| Media fit | The chosen medium adds proof, context, humor, or clarity. An illustration shows the story's key scene/conflict, not just a symbol; it has layered setting/details, one short readable Traditional Chinese headline, 4:5 portrait 1080×1350 output, truthful alt/provenance, and no fake UI/data or ad-like framing. Crew Cloud is optional. Text-only is intentional when enough. | The image is decorative or only symbolic, the scene does not communicate the event, the headline is hard to read on a phone, it implies fake UI/data or results, feels like an ad, or exists only to fill a slot. |

## Image preflight

Before approving an image, confirm the story has a visual reason for one and inspect the image at phone-feed size:

- Does the scene show the story's key situation or conflict with recognizable setting and details?
- Is there one short Traditional Chinese headline, readable at a glance, in a 4:5 portrait 1080×1350 frame?
- Is Crew Cloud secondary or omitted when unnecessary?
- Are all interface-like elements, numbers, and outcomes either genuine and approved or absent?
- Hide the headline or ignore all lettering and ask: **「不看文字，這張圖能讓人猜到主題嗎？」** If not, revise the image or use real evidence/text-only.

## Dispositions

- `selected`: worth drafting. This does not mean Queue-ready.
- `rejected`: a concrete reason explains why it is not worth a post.
- `hold`: the idea may be useful, but a named source, asset, permission or fact must be obtained first.
- A selected draft can remain `draft_handoff_only`. Do not mark it live just because all editorial notes say “pass”.
- Queue-ready copy must have an applicable prior authorization or a clear owner approval, a not-expired slot, no duplicate or old post ID, distinct per-platform request IDs, required source replies, and a valid image or explicit `image:null`.

## Formula scan

Read recent Facebook and Threads copy from the prior three days. Note repeated hooks, structures and endings. Specifically watch the owner's examples (“最近某公司發布……”, “這讓我想到……”, “真正重要的不是 A，而是 B……”, “這不代表……但值得關注……”, “你怎麼看？”); these are not a banned-word list, but repeated use is a reason to edit. Use the validator for duplicate selected openings and preserve the editor's concrete note in the JSON record.
