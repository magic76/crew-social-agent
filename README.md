# Crew Social Agent

本 repo 提供本機 GitHub Queue 同步器、排程器、Facebook Page／Threads 官方 API publisher，以及本地發布紀錄。Node.js >=22，沒有 npm runtime dependencies；不使用 Metricool、Cloudflare Worker 或 D1。

## 安全預設與發布條件

Agent 預設 `SOCIAL_AGENT_MODE=dry_run`。只有以下條件全部成立才會呼叫 Meta 發文 API：

1. 本機 `SOCIAL_AGENT_MODE=live`。
2. Queue 項目 `mode=live`、`status=ready_for_local_agent`、`safety.publish_permitted=true`。
3. 排程已到且未超過 `SOCIAL_MAX_LATE_MINUTES`（預設三小時）。
4. 附圖貼文需驗證圖片 SHA-256、實際格式和尺寸（短邊至少 1080px）；明確指定 image:null 的純文字貼文則走 TEXT 發布流程。
5. 每個目標平台各自有必要的 Meta 憑證。

影片使用獨立的 `content/video-handoffs/` 契約，不放入 image/text Queue。必須同時符合本機 `SOCIAL_AGENT_MODE=live`、交接稿 `status=ready_for_video_publisher`、`publish_permitted=true`、有效排程及平台憑證。Facebook 走 Page Reels 上傳流程；Threads 建立 VIDEO container，等待 Meta 處理完成後才發布。任何不確定結果進入 `needs_reconciliation`，不會重送，也不會把影片靜默降級成圖文或純文字。

圖文稿缺圖或圖片驗證失敗時，不會自行降級成純文字。現有 Android Studio Queue 使用 1254×1254 正式圖片；實際發文依排程、帳號憑證及本地去重紀錄執行。

## 安裝與憑證

在專案目錄建立本機 `.env`：

```sh
cp .env.example .env
chmod 600 .env
```

`.env.example` 的 `SOCIAL_AGENT_POCKET_VAULT_DIR` 預設指向 `~/.crew-pocket/social`，可直接沿用 Crew Pocket 的 AES-256-GCM 加密帳號庫，不必複製 token。Agent 只在記憶體解密，使用已選粉專的 Page token 和 Threads token；設為 `off` 可停用。非空的 `.env` token 欄位會優先於帳號庫。Token 不可提交、貼進對話或放進 Queue。Facebook Page token 可由有權限的使用者 token 呼叫 `/me/accounts?fields=name,access_token,tasks` 取得；確認目標 Page 有內容建立權限。Threads 發文需 Meta Threads API App、`threads_basic` 與 `threads_content_publish` 權限。實際審核及可用權限依 Meta App 狀態而定。

Threads 長效 token 通常約 60 天有效，Meta 允許在到期前 refresh。設定它的過期時間後，Live Agent 會在剩餘七天內嘗試 refresh。更新後的 token 會用 AES-GCM 加密在忽略的 `.crew-social-agent/credentials.enc`，金鑰權限為 0600，且不會輸出。若沒有設定過期時間，`status` 會顯示 expiry unknown，不會推測或自行刷新。手動設定：

```sh
node --env-file=.env scripts/social-agent.mjs token-expiry threads 2026-12-01T12:00:00Z
node --env-file=.env scripts/social-agent.mjs refresh-threads
```

Facebook Page token 被撤銷、失效或權限變動時，Agent 會記錄阻擋原因；需重新在 Crew Pocket 連接粉專或更新 `.env`。Graph API 版本由 `META_GRAPH_API_VERSION` 固定，升級前先核對 Meta 的版本變更。

## Queue 契約

每篇 Queue JSON 需要唯一 `id`、`created_date`、`category`、`status`、`mode`、`networks`、平台文案及各平台固定 UUID `requestId`、圖片 `path`／`format`／尺寸／SHA-256、`schedule.date`／`time`／`timezone` 和 `safety.publish_permitted`。新聞類還需要來源 publisher、HTTPS URL 與來源日期。有參考來源的文章需在 `first_replies` 為每個 network 提供首則留言、包含完整來源 URL，並使用獨立 UUID v4 `requestId`；多筆來源可使用 `references` 陣列。Threads 文案與回覆最多 500 字，Facebook 回覆最多 1000 字。

Live 項目另需 `image.public_url`：Meta 伺服器要能直接以 HTTPS 讀取該圖片。預設只允許 `raw.githubusercontent.com`；若使用自己控制的公開 HTTPS 主機，將其 hostname 加到 `.env` 的 `SOCIAL_IMAGE_HOSTS`。附圖稿的圖片 Base64 SHA 必須正確，不能只交 URL。圖片不可讀、損毀、太小或 URL 缺少時，該平台保持 pending／blocked，不會降級成文字文。要發純文字必須明確使用 image:null。

### 影片交接

影片另放在 `content/video-handoffs/<日期>-<slug>.json`，媒體放在 `content/video-handoffs/assets/`。交接稿需要穩定 `id`、`status`、`publish_permitted`、`schedule`、`platforms`、各平台含固定 UUID `requestId` 的文案，以及 MP4 的 `path`、`public_url`、`size_bytes`、SHA-256、實際寬高、fps 和秒數。發布器會解析 MP4、比對 SHA，再抓取公開 HTTPS URL 核對內容；預設只接受 `raw.githubusercontent.com`，自有主機需加到 `.env` 的 `SOCIAL_VIDEO_HOSTS`。

目前同時發 FB Page Reels 和 Threads 的安全範圍是 MP4、直式 9:16、至少 540×960、23–60 fps、4–60 秒、影片編碼 H.264 或 HEVC；本地 publisher 為單次驗證設 1 GB 上限。日後擴充規格時先更新平台驗證與測試。`draft_handoff_only` 不會自動升級成可發布狀態。

台灣每日預設時段為 12:00、19:00、21:00，可由每篇 `schedule` 設定；Agent 預設每 30 分鐘輪詢一次，可用 `.env` 的 `SOCIAL_POLL_INTERVAL_MS` 調整。超過三小時的稿件標記 `skipped_expired`，需重新排程才可處理。圖文稿 reschedule 只寫入本機 override，不改 GitHub Queue。

## 執行指令

```sh
npm test
node scripts/check-social-queue.mjs
node scripts/check-video-handoffs.mjs
node --env-file=.env scripts/social-agent.mjs sync
node --env-file=.env scripts/social-agent.mjs run-once
node --env-file=.env scripts/social-agent.mjs status
node --env-file=.env scripts/social-agent.mjs show crew-lab-20261030-android-studio-agents
node --env-file=.env scripts/social-agent.mjs show-video crew-video-handoff-2026-10-30-permissions-101
```

`sync` 從 GitHub `main` 抓 image/text Queue 和獨立 video handoffs，不切換本地 branch。`run-once` 也會先同步遠端；加 `--offline` 可只讀工作目錄。Dry-run 只建立 pending 任務並輸出模擬結果，不呼叫 Meta API。`show` 和 `show-video` 可查看文案及媒體快取路徑。

管理指令：

```sh
node --env-file=.env scripts/social-agent.mjs pause
node --env-file=.env scripts/social-agent.mjs resume
node --env-file=.env scripts/social-agent.mjs skip <post-id> <facebook|threads>
node --env-file=.env scripts/social-agent.mjs reschedule <post-id> YYYY-MM-DD HH:mm [facebook|threads]
node --env-file=.env scripts/social-agent.mjs reconcile [post-id] [facebook|threads]
node --env-file=.env scripts/social-agent.mjs reconcile-video [handoff-id] [facebook|threads]
node --env-file=.env scripts/social-agent.mjs retry <post-id> <facebook|threads> --confirm-not-published
node --env-file=.env scripts/social-agent.mjs retry-video <handoff-id> <facebook|threads> --confirm-not-published
node --env-file=.env scripts/social-agent.mjs history
```

`reconcile` 和 `reconcile-video` 只查 Meta 狀態，不會重新發布；狀態不明時保留人工核對。只有人工確認遠端未發布後，才能用對應的 `retry ... --confirm-not-published` 重設該平台任務。狀態資料、同步快取、圖片／影片和加密的 refresh token 都放在 `.crew-social-agent/`，此目錄已忽略且採本機權限保護。以固定目錄執行，避免刪除狀態而失去防重紀錄。

## Termux 常駐與開機恢復

先保持 `.env` 的 `SOCIAL_AGENT_MODE=dry_run`，確認 `status`、Queue、影片、媒體網址與排程都正確。正式自動發布圖文稿需要各篇 Queue live 欄位；影片則由授權者逐篇將 handoff 設成 `ready_for_video_publisher` 並明確設定 `publish_permitted=true`。不要把測試稿升級。

安裝 PM2 並建立 daemon：

```sh
npm install --global pm2
mkdir -p .crew-social-agent/logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

若使用 Termux:Boot，在 `~/.termux/boot/` 建立啟動腳本：

```sh
#!/data/data/com.termux/files/usr/bin/sh
cd /data/data/com.termux/files/home/crew-social-agent || exit 1
termux-wake-lock
pm2 resurrect
```

確保 Termux:Boot 已安裝並允許 Android 背景執行。停止服務：`pm2 stop crew-social-agent`；恢復：`pm2 restart crew-social-agent`。沒有 PM2 時可前景執行 `npm run agent:daemon`，但終端關閉或系統回收程序後不會自動重啟。

## 本地狀態與錯誤處理

- 每個 `(post.id, network)` 有獨立持久紀錄；原子建立單一 publisher lock，避免同一工作目錄的多個程序併發發布。主文發布成功後，若 Queue 有 `first_replies[network]`，Agent 會立即發布首則留言。留言同樣先落盤 `sending`；若程序中斷或 Meta 回應不明，後續只核對遠端留言，不自動重送。
- 發文呼叫前先落盤 `sending`。程序中斷或 API 結果不明會進入 `needs_reconciliation`，不自動重試。
- FB 成功、Threads 失敗時只處理 Threads 的結果；Facebook 不會重發。
- Token 缺少、過期、權限不足、rate limit、排程過期、圖片不合格會保留清楚的狀態與原因。
- Agent 會保存遠端貼文 ID、可取得的 permalink 與發布時間；若 Meta 回傳成功但讀不到 permalink，仍保存已發布 ID並標註 `PUBLISHED_URL_LOOKUP_UNAVAILABLE`，避免重發。
- Meta API 未提供跨本機與平台的交易式 exactly-once 保證；本地 outbox journal 對可恢復的任務採 fail-closed，結果不明一律人工核對。

## 其他既有 CLI

`scripts/social.mjs` 保留單篇手動發文、讀文與回覆工具。它和 Queue Agent 共用 `.crew-social/attempts`，適合人工操作；定時 Queue publisher 使用 `.crew-social-agent/` 狀態。

## 測試

`npm test` 使用本機檔案和 mock API，不會建立真實 Meta 貼文。真實發布仍需 Meta App 權限、Facebook Page／Threads token、公開圖片 URL，以及逐篇明確開啟的 live Queue。

## Crew Video Lab：HTML 科普動畫／教學短片

已加入共用 Agent Skills 和可修改的 1080×1920、30fps、24 秒 HTML 動畫範例。入口：[video-lab/README.md](video-lab/README.md) 與 [skills/crew-video-lab/SKILL.md](skills/crew-video-lab/SKILL.md)。

~~~sh
node scripts/video-lab.mjs validate video-lab/examples/permissions-101
node scripts/video-lab.mjs check video-lab/examples/permissions-101
node scripts/video-lab.mjs preview video-lab/examples/permissions-101
node scripts/video-lab.mjs render video-lab/examples/permissions-101
~~~

validate 是 Node.js 內建語法／分鏡檢查；check、preview、render 需要安裝 HyperFrames 的瀏覽器／FFmpeg 環境。範例仍為**靜音 HTML 動畫原始專案**，不能聲稱已配音、已輸出 MP4 或已發布。影片媒體維持獨立 handoff，不放進 image/text Queue。

### Video Lab 中文配音

Gemini 3.8 TTS（使用者自行設定 `GEMINI_API_KEY`）或 eSpeak 離線測試語音，支援依場景產音、超時阻擋、音量混合、SRT 字幕軌。參考 [video-lab/README.md](video-lab/README.md)。

```sh
node scripts/video-voice.mjs video-lab/examples/permissions-101 --provider=gemini --video=/absolute/path/original.mp4 --out=/absolute/path/narrated.mp4
```

注意：必須先存在真正的原始 MP4；此 Repo 的示範 HTML 不含預渲染影片。請勿將 API Key 或生成音訊提交到 Git。
