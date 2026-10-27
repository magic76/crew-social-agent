# Direct Threads + Facebook publishing (no Metricool)

The current `src/` Worker prototype is still present. This is an **independent** GitHub Actions route that uses official Meta Graph APIs and GitHub Issues; it does not require deploying Cloudflare Worker/D1 or paying Metricool.

## One-time account setup

1. Set up your Meta Developers app with the **Threads** use case, and obtain your **own** authorized Threads access token with `threads_basic` / `threads_content_publish`. Obtain a Facebook **Page Access Token** with `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` and permission to create content on the Crew Lab Page. App modes/review rules vary. **Metricool credentials cannot be reused.** Renew/refresh tokens before they expire.
2. In this GitHub repository's **Settings → Secrets and variables → Actions → New repository secret**, enter:
   - `THREADS_ACCESS_TOKEN`
   - `FACEBOOK_PAGE_TOKEN`
   - `FACEBOOK_PAGE_ID`
   Never paste tokens in GitHub Issues, code, ChatGPT, or public logs.
3. Merge the PR containing this workflow into `main`. Run `npm test` (includes the new payload validation test).
4. Prepare an image at a **public HTTPS URL** (PNG/JPG; direct publicly accessible file URL). Meta fetches it server-side, so ChatGPT attachment IDs and private files do **not** work.
5. In this repo create an Issue **as the repository owner**, add the `social-publish` label, and put **only** this JSON in its body:

```json
{
  "threadsText": "A short casual post in Traditional Chinese",
  "facebookText": "A longer natural Facebook post in Traditional Chinese",
  "imageUrl": "https://example.com/public-image.png"
}
```

Adding the `social-publish` label triggers the workflow. You can also manually run `Direct Meta publish` through Actions with an existing Issue number (issue must still be owner-created and have that label). ChatGPT with your connected GitHub account can create that Issue after these prerequisites.

## Safety and operational boundaries

- Owner-created Issues only; an untrusted user cannot trigger a publication by creating an Issue.
- Each platform posts **once per Issue**. The workflow writes an attempt marker as a GitHub Issue comment **before** calling Meta. If a network times out or returns an uncertain result, it does not retry. Inspect the original platform and Issue comments manually to reconcile. If Facebook succeeds but Threads fails, the workflow does not delete Facebook.
- Text-only posts are intentionally rejected. `threadsText` must be <=500 characters.
- The workflow never calls Metricool and does not run automatically every day; a separate scheduling/content generator is needed for unattended daily content.
- A `PUBLISHED` response is evidence Meta accepted the post, but always inspect the real public post or returned permalink when checking delivery.
- This integration cannot post until Meta authorization and GitHub repository secrets are set.

Official API references: [Threads API](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api) and [Facebook Pages API](https://developers.facebook.com/docs/pages-api/).
