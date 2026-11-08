# Crew Lab SI 每日研究與編輯簡報｜2026-11-08

## 執行範圍與去重

- 研究窗口：台北時間 2026-11-05 09:45 至 2026-11-08 09:45，查核 4 項原始 AI 來源。
- Crew Social Agent main HEAD 起始與寫入前為 `054cbd421bbbab80394d4abee1f31fcb08d4326c`（`docs(editorial): capture owner's social voice`）；檢查時未見競爭中的 main 更新。
- 11/5–11/7 Queue 共 18 篇，近期編輯審核有 11/5、11/6、11/7 三份；11/8 尚無 Queue 檔。舊排程日期都已過，沒有未來排程與今日草稿重複。
- Repo 未找到獨立的已發布貼文紀錄；Queue 的 ready 狀態不等於平台已發布，故不把它當成已核實發布。已讀前 3 日 Queue 和 review 角度，今日沒有重做 Crew Souls、Pocket API、首頁動畫、Agent memory、BioBasicsBench、PDD Kit 等既有題材。
- 今日掃描 Crew Car、Crew Web、Crew Pocket、Crew Teacher、Crew Play、LG TV Companion、Crew Mate、Crew Agent Harness、Crew Fortune。近期可用的新開發故事集中在 Crew Car 與 Crew Web；Pocket 最新相關 commit 為 11/6，Teacher / Play / LG TV Companion / Mate / Agent Harness / Fortune 獨立 repo 在近 3 日無新 commit。Crew Web 的 Fortune 改動則在主站 repo。
- 內容狀態只做編輯草稿交接；使用者 11/7 的可發布授權只涵蓋當日，沒有套用到 11/8 新稿。

## 最近 24–72 小時原始來源

### 1. Google Developers Blog｜Agent Distraction（發布 2026-11-06）

Google 分析數千位工程師與數億個 agent steps 的自家 coding-agent traces。原文稱 13% 的讀檔 session 遇到 TODO(bug/...) 或 FIXME(bug/...)；6% 的遭遇中 Agent 追著 bug ID 採取後續動作，這些後續動作有 83% 沒有使用者要求。作者以多因子回歸估計，未被要求的 bug detour 每個 session 增加 70% steps、77% tokens、105% wait time。這些數字來自 Google 自身 traces 與模型估計，TODO 是 proxy，不代表所有 coding Agent 的普遍定律。可用方向：舊註記會不會把 Agent 帶離原任務。
來源：https://developers.googleblog.com/agent-distraction/

### 2. Anthropic｜Teaching AI to build scientific models（發布 2026-11-06，研究者客座文章）

文章由 ELLIS Institute Tübingen 與圖賓根大學研究者撰寫，將建模分為建立、約束參數、解讀三步。文中說明 simulation-based inference 如何回傳可行參數分布；在建立模型時，也應保留多個能解釋資料的候選，而非只交一個最佳擬合，因為候選間的共識與分歧能指出證據穩固處和下一個實驗方向。作者也說，目前這類系統多在重現已知模型，對未知答案問題的證據仍稀少。這是研究者觀點與既有方法說明，不是新 benchmark。
來源：https://www.anthropic.com/research/teaching-ai-to-build-scientific-models

### 3. Meta AI Research｜Bringing Specialized Models to Muse and Meta AI（發布 2026-11-06）

Meta 表示將 Muse Wonder 訓練出的專用模型帶到 Muse 與 Meta AI。Meta 自報 Active Memory eval 由 76% 到 90%、關鍵資訊遺忘減少 2.4 倍，並稱遇到意外問題時的日常任務完成率提升 67%。全屬公司自家評測與產品說法，不能視為獨立驗證；「記憶」也和 11/7 已選題重疊，因此今天只留研究紀錄、不再發文。
來源：https://research.meta.ai/blog/specialized-models-for-muse-and-metaai

### 4. Google DeepMind｜Gemini Omni 1.2 Flash model card（發布 2026-11-05）

官方模型卡列出文字、圖片、音訊和影片為輸入，含音訊的高解析影片為輸出，並稱支援透過對話編輯影片。它也明說可以改變影片中人物的說話內容，但目前先限制這項能力；分發渠道列出 Gemini app、AI Studio、Gemini API、Google Flow、Vertex AI 和 Workspace 等。模型卡不能證明各地區或帳號目前都已開放，所以貼文不寫成親自實測或普遍可用。
來源：https://deepmind.google/models/model-cards/gemini-omni-1-2-flash/

本日研究來源足夠支撐摘要與社群題材；不以新聞數量補配額。AWS 的候選搜尋頁無法由目前瀏覽工具打開，未納入正式報告。

## Crew 開發素材

| 日期（來源紀錄） | 素材 | 可核實內容與限制 |
|---|---|---|
| 2026-11-06 | [Crew Car PR #35](https://github.com/magic76/crew-car/pull/35) | 手機熱點 log 每次 START 後只見來源埠 23459 的單一 UDP 封包，與命令回覆相符；PR 分開計數 command reply/video/invalid，並將 STOP 移出 UI thread。PR 明說不保證 Android hotspot NAT 可送 FPV，實機 QA 清單尚未打勾。 |
| 2026-11-07 | [Crew Web PR #543](https://github.com/magic76/magic76.github.io/pull/543) | 5 組分類、32 個直接入口；分類收合／展開改成 +／−，保留 aria-expanded 與 reduced-motion。 |
| 2026-11-07 | [Crew Web PR #549](https://github.com/magic76/magic76.github.io/pull/549) | PWA 圖示路徑改用 crew-teacher-v2-*，保留舊路徑；依 Chrome 144 更新 icon URL 比對方式處理安裝版圖示更新。Android 身分圖示可能仍需使用者確認。 |
| 2026-11-07 | [Crew Web PR #546](https://github.com/magic76/magic76.github.io/pull/546) | 分享命格卡只帶公開身份 DTO、卡片文案與精簡依據，不放出生日期／時間／地點及完整命盤；是自我探索符號，不宣稱科學人格診斷。 |
| 2026-11-07 | [Crew Web PR #545](https://github.com/magic76/magic76.github.io/pull/545) | GA4 修復導流歸因同時建立 UTM allowlist、排除原始 query 和 click ID；暫緩，因外部讀者價值較弱且無法核實部署。 |

PR 描述內有測試計畫或新增測試檔，不等於我們取得了通過結果；本文不宣稱這些修改已部署或實機驗收通過。

## 候選裁決與今日六篇

今日選出六個不同主題：10:00 Crew Car 封包誤判、12:00 Crew Web 分類控制、14:00 PWA 圖示 URL、16:00 Fortune 分享資料最小化、19:00 Google Agent Distraction、21:00 Gemini Omni model card。每篇均有 Facebook／Threads 獨立稿和來源首則回覆；跨平台版本只算一個主題。其餘 GA4 歸因、Anthropic 科學建模先暫緩，Meta 專用模型公告因公司內部評測及與昨日記憶稿重疊淘汰。完整 claim→evidence、六項品質理由、雙平台定稿與媒體決策見 [今日 review](https://github.com/magic76/crew-social-agent/blob/main/content/editorial/reviews/2026-11-08-daily-review.json)。

六篇均選純文字：目前沒有可核實的 Crew Car 實機畫面或 Crew Web 手機前後截圖；研究則沒有可公開 trace 或使用者實測片段。沒有為湊數生成圖。每篇 Queue 都是 `status=draft`、`mode=dry_run`、`safety.publish_permitted=false`，並排在今日尚未過期的台北時間 10:00、12:00、14:00、16:00、19:00、21:00。未送出任何平台 API 或 Local Publisher 任務。

## Local Publisher／結構檢查

- 本次沒有掛載本機 repo checkout，故 `npm run editorial:check` **未執行**；沒有把人工檢查說成官方 validator 通過。
- 手動結構檢查只核對新檔 JSON 可解析、六個 Queue id 不重複、平台 requestId 為互異 UUIDv4、每個來源 URL 都存在於兩平台首則回覆、排程在今天且 Queue 為 draft/dry_run/false。
- Local Publisher 本機環境、SOCIAL_AGENT_MODE、憑證、公網圖片驗證及 run-once **未執行／未知**；新 Queue 為純文字 draft，沒有圖片需要下載。
- 沒有直接呼叫 Facebook、Threads、Metricool API，沒有實際發文；所有平台發布狀態未知。
- 本機無 Node repo 執行環境，沒有執行影音 renderer、ffprobe、音檔播放或真機畫面 QA。

## 未完成影片與 TTS 診斷

今日沒有另起第二支影片，先接續已有的 Agile Deliberation handoff：`content/video-handoffs/crew-video-2026-11-06-agile-deliberation-retry.json`。handoff 記錄已有 1080×1920、30fps、30.507 秒 MP4 與 27.72 秒 WAV metadata，但逐字聽音／字幕 QA 仍未核實；目前環境不能讀取 binary、播放 WAV 或做 ffprobe，不能把影片標成 ready，也沒有發布授權。

讀取 Worker 原始碼 `workers/guest-trial/video-tts.mjs` 後確認：結果 API 的失敗回應會提供 allowlisted `error_code`；D1 表名為 `crew_video_tts_jobs`，欄位包含 `id,created_day,created_at,status,seconds,wav,error`，失敗 job 是 terminal，不會自動重試。結果 API URL 在目前瀏覽工具回覆「URL ... is not accessible via this tool」，又沒有 Cloudflare D1／Worker log connector；因此沒有取得該單筆實際 error code，不猜 Gemini、憑證、額度或音檔原因，也不建立新的付費 TTS ID。

需在具 Cloudflare 單筆查詢權限的環境檢查：
```sql
SELECT id, created_day, created_at, status, seconds,
       length(wav) AS wav_bytes, error
FROM crew_video_tts_jobs
WHERE id = 'crew-tts-agile-deliberation-retry-20261106-01';
```
同時取得該日使用量以核對配額：
```sql
SELECT created_day, COUNT(*) AS jobs
FROM crew_video_tts_jobs
WHERE created_day = '2026-11-08'
GROUP BY created_day;
```
下一步是先取該 ID 的安全 `error_code`／D1 row，再依分類決定是否安全復原；若為 `bad_wav_length` 或 `audio_too_large` 才將旁白切成遠低於 31 秒與 1.6 MB 的連續段。拿到 WAV 後仍須逐段檢查 RIFF、大小、時長、試聽，再同步字幕、渲染並完成畫面／聽音 QA。今日沒有盲目重送，也沒有新影片 handoff。

## 14 天觀察資料

`content/experiments/2026-11-05-to-18/metrics.csv` 目前只有表頭；沒有已核實的 11/8 平台發布、remote URL 或平台數據，因此不新增資料列、不估 reach／互動率。發布與成效欄位維持空白，需在 Local Publisher 實際發布後人工補資料並標記 `manual_data_needed`。
