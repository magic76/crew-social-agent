# Crew Social Agent — 私人社群收件匣（P1）

**獨立於 Crew Web 的專案**。Cloudflare Worker + 原生靜態管理頁面 + D1，接 Threads 官方 API / Facebook Pages Graph API / Gemini（可選）。沒有 Metricool 依賴，也不會修改 `magic76/magic76.github.io`。

> 狀態：原始碼已提交到 GitHub；目前仍須部署 Worker、完成 Meta 帳號授權與真實社群驗證。沒有執行任何真實發布。

## 已實作

- 管理員介面：切換 Threads / Facebook，新建文字貼文或附公開 HTTPS 圖片網址，列近期本人貼文、留言與回覆，AI 擬稿，可修改並確認發布。
- 真實 API adapter（不使用假社群資料）。後端從 Cloudflare Secrets 取得 Token；管理員頁面不載入 Token。
- Gemini 擬稿：原貼文+指定留言作為上下文，輸出可編輯繁中草稿。
- 發布前確認；驗證貼文確屬設定的帳號，留言確屬該貼文；D1 唯一鎖防重複（留言回覆依目標留言鎖定，新貼文依請求 UUID 鎖定）。
- D1 紀錄 `sending` / `published` / `needs_reconciliation`，遠端結果不明時**不重發**。
- 分離兩組管理密鑰：`SOCIAL_ADMIN_KEY` 給網頁介面用（可發布）；`SOCIAL_AGENT_KEY` 給 `/mcp`（僅查詢、擬稿）。
- `/mcp`：Streamable HTTP、stateless、讀取與擬稿 MCP tools；不提供發布工具（P1 人工批准）。
- `skills/crew-social-agent/SKILL.md` 可複製到 Agent 專案當操作規範；不是拿 Skill 取代 API 授權。

**P1 限制**：只讀取自己 Threads 帳號、Facebook 粉專近期 30 篇貼文及有限筆留言（僅一頁資料）；尚無 Facebook 個人帳號權限、第三方貼文搜尋、私訊、Webhook、OAuth 授權 UI、排程、圖片檔案上傳（目前僅支援公開 HTTPS 圖片網址）、Token 自動續期或已核准的自動回覆。Facebook 嵌套回覆目前只讀一層，完整分頁後續擴充。權限不足時會明確顯示錯誤。

## GitHub Repo

專案：`magic76/crew-social-agent`。請將 Repo Visibility 改為 **Private**。本專案未儲存實際 Token 或其他密鑰，僅保留 `.dev.vars.example` 作為範本。

## Cloudflare 設定

```bash
npm install
npx wrangler login
npm run db:create
```

1. 將建立 D1 時回傳的 database_id，填到 `wrangler.jsonc` 的 `d1_databases[0].database_id`，代替 `REPLACE_WITH_YOUR_D1_DATABASE_ID`。
2. 套用資料庫 migration：

```bash
npm run db:migrate:remote
```

3. 設定必要 Secrets，每一個命令都會安全地提示你在終端機輸入值，不要直接加進 Git：

```bash
npx wrangler secret put SOCIAL_ADMIN_KEY
npx wrangler secret put SOCIAL_AGENT_KEY
npx wrangler secret put THREADS_ACCESS_TOKEN
npx wrangler secret put FACEBOOK_PAGE_TOKEN
npx wrangler secret put FACEBOOK_PAGE_ID
# Gemini AI 擬稿需要時才設定：
npx wrangler secret put SOCIAL_GEMINI_KEY
```

**重要**：`SOCIAL_ADMIN_KEY` 和 `SOCIAL_AGENT_KEY` 必須是**不同**的高熵隨機值，各至少 32 字元。可分別產生 `openssl rand -hex 32`；不要提供給 AI 聊天、不要放進前端 bundle。Threads 和 Facebook 可以各自獨立設定，若只設定其中一組，另一個平台會顯示未設定。

4. `npm test`，然後 `npm run deploy`。開啟部署後的 Worker 網址、輸入**管理員金鑰**，按連線。應先看到哪些網路已設定；有發文權限後才能取得真正留言。

**安全性**：公開 Worker 網址的靜態登入介面不是秘密；所有 `/api/*` 與 `/mcp` 都有 bearer 驗證。建議額外把 Worker 自訂網域設於 Cloudflare Access 保護下（需另行設置服務憑證，Agent 流量另授權）。Key 只停留在網頁當次執行的記憶體，刷新即失效；不要在不受信任的裝置輸入管理員金鑰。

## Meta App 權限（需要在 Meta Developers 設定）

### Threads

- 建立有 Threads use case 的 Meta App，讓你的 Threads 帳號授權，取得 `THREADS_ACCESS_TOKEN`。
- 所需基本 permissions 通常包含：`threads_basic`、`threads_read_replies`、`threads_manage_replies`、`threads_content_publish`。
- 參考 [Meta 官方 Postman collection](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api)。Token 有到期日，要在期限內以官方流程更新。不同 App 的 token 不會因 Metricool 已獲授權而自動共用。

### Facebook Pages

- 對選定的 Facebook Page 取得 **Page Access Token**（不是個人貼文 token）及頁面 ID，分別放入 `FACEBOOK_PAGE_TOKEN` 與 `FACEBOOK_PAGE_ID`。
- 請依 Meta 當前審核要求取得 Page read/engagement 及管理留言相關 permissions，例如 `pages_show_list`、`pages_read_engagement`、`pages_read_user_content`、`pages_manage_engagement`。完整實際權限會依 App 模式及端點而異。
- 需要在 Meta App Dashboard 完成適用的 App Review / Advanced Access 才能操作非測試角色的資料。

**目前並未內建 OAuth 登入／Token 自動更新**：這是 P1 的人工作業，不會拿 Metricool token 直接重用，也不會要求你把 Meta access token 貼在 ChatGPT。

## MCP / HTTP API

在任何支援遠端 Streamable HTTP MCP 的 Agent 環境中，將 `https://<worker-domain>/mcp` 設為 endpoint，HTTP `Authorization: Bearer <SOCIAL_AGENT_KEY>`，只能查、讀、擬稿。

| 用途 | HTTP（管理員金鑰） | MCP（Agent 金鑰） |
| --- | --- | --- |
| 查服務狀態 | `GET /api/status` | `social_status` |
| 查自己貼文 | `GET /api/posts?network=threads` | `social_list_posts` |
| 查貼文留言 | `GET /api/comments?network=threads&postId=...` | `social_list_comments` |
| AI 擬稿 | `POST /api/draft` | `social_draft_reply` |
| 查發送紀錄 | `GET /api/history` | `social_reply_history` |
| **核准回覆留言** | `POST /api/reply`（`confirmed:true`，網頁有二次確認） | **刻意不提供** |
| **核准發布新貼文** | `POST /api/publish`（文字／可選公開圖片網址） | **刻意不提供** |

`/api/draft` JSON body：`{ "network":"threads", "postId":"...", "commentId":"...", "instructions":"..." }`。

`/api/reply` JSON body：`{ "network":"threads", "postId":"...", "commentId":"...", "text":"你好", "confirmed":true }`。同一平台的同一留言只允許一次發布嘗試；如果不確定是否成功，需到 Meta 平台與 `/api/history` 手動比對，不能無腦重發。

`/api/publish` JSON body：`{ "network":"threads", "text":"新貼文", "imageUrl":"https://example.com/image.jpg", "requestId":"<uuid>", "confirmed":true }`。`imageUrl` 可省略。新貼文必須先由管理頁二次確認；如果發布結果不明，就使用紀錄和平台手動確認，不要直接重試。

MCP 服務屬於自建端點，不等於已在 ChatGPT 安裝。ChatGPT 的遠端 MCP 連線和寫入權限可能受方案限制；Crew Pocket / 自有 Agent 可先使用 HTTP API 或 MCP。密鑰應交給連接器的安全密鑰管理，不放在聊天訊息中。

## 驗證

```bash
npm test      # 使用 mock API，不連 Meta、不發布
npm run dev   # 本地 Worker，需要填妥 .dev.vars 和本地 D1 migration
```

推薦真實環境驗收順序：

1. 對兩個平台只執行 `GET`，確認能列出**你自己的**貼文與留言。
2. 不提供 Gemini key 先手寫草稿，測試未選確認時 API 403。
3. 使用你控制的測試留言核准發出一則，驗證真實平台可見、遠端 ID 存入 D1。
4. 再次發送同一留言，應回 409 並阻止重複；試驗其他 Agent 用 `SOCIAL_AGENT_KEY` 無法調用 `/api/reply`。
5. 最後才加入 AI 擬稿與正式使用。**勿用真實粉絲留言當測試資料。**