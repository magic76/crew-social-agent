# Crew Social Queue

此目錄是 ChatGPT 內容與本地 publisher 的 GitHub 交接 Queue。Publisher 只讀取 Queue，不會修改遠端內容。每個 Queue 項目包含 Facebook／Threads 各自的文案與固定 `requestId`；每個平台各自持有發布狀態。

## 目前測試項目

- `2026-10-30-android-studio-agents.json`：Android Studio Agent 新聞測試稿，附來源和排程。
- `assets/2026-10-30-android-studio-agent.webp.base64`：6,426 bytes WebP，256×256，供同步、解碼、SHA-256 驗證。
- 該稿 `mode=dry_run` 且 `safety.publish_permitted=false`。不可改成 live，也不能真實發到 Meta。

## Queue 欄位

每篇需要唯一穩定 `id`、`created_date`、`category`、`status`、`mode`、`networks`、`schedule`、平台獨立文案／UUID `requestId`、圖片 metadata 與 `safety.publish_permitted`。`schedule` 格式：

```json
{"date":"2026-11-01","time":"12:00","timezone":"Asia/Taipei"}
```

每日預設可排 12:00、19:00、21:00。新聞類需填 `source.publisher`、`source.url`、`source.published_date`。Threads 文案不超過 500 字。

正式 Queue 另需 `mode=live`、`status=ready_for_local_agent`、`safety.publish_permitted=true`。單篇需經授權者清楚批准後才設定。發布圖片目標至少 1080px；Queue 需附可供 Meta 直接讀取的公開 HTTPS `image.public_url`，且它指向正式圖片。預設只接受 `raw.githubusercontent.com`；使用其他主機需在本機 `.env` 設定 `SOCIAL_IMAGE_HOSTS`。圖片 Base64 檔案、宣告尺寸與 SHA-256 必須相符；缺圖、壞圖、尺寸不足或 URL 不符就停在 pending／blocked，不會發純文字。

## 本地測試與運作

```sh
node scripts/check-social-queue.mjs
node --env-file=.env scripts/social-agent.mjs sync
node --env-file=.env scripts/social-agent.mjs run-once
node --env-file=.env scripts/social-agent.mjs status
```

`run-once` 先 fetch GitHub `main`，讀取 queue 檔案與 Base64 圖片，但不 checkout、不改動目前 branch。若本機或 queue 還是 dry-run，只建立 `(id, network)` 的 pending 紀錄，不呼叫發文 API。Local publisher 在 `.crew-social-agent/` 保存 journal、同步快取、override 及安全憑證；此資料夾不能提交到 GitHub。

Meta API 不提供本地 agent 與平台間的交易式 exactly-once；所以 `sending` 中斷或 timeout 進入 `needs_reconciliation`，`reconcile` 先查遠端貼文，不自動重送。Facebook 與 Threads 狀態分開，即使一邊成功也不會重送該平台。
