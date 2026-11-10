# Crew Lab SI 研究報告｜2026-11-11

- 研究時間：2026-11-11 07:30（Asia/Taipei；2026-11-10 23:30 UTC）。
- 基準 repo：`magic76/crew-social-agent` `main`，HEAD `024aaa44d432798e409562797aa0184dfcd30893`。開始時本機 checkout 與 `git ls-remote origin refs/heads/main` 相同，近期沒有競爭中的 main 更新或此 repo 的開啟中 PR。
- 唯一正式選題與寫作規範：該 HEAD 的 [`docs/editorial-guidelines.md`](https://github.com/magic76/crew-social-agent/blob/024aaa44d432798e409562797aa0184dfcd30893/docs/editorial-guidelines.md)。已閱讀 AGENTS、兩份 Crew skill、Editorial README／Quality Gate／Media Policy、Queue README、Local Publisher `core.js`／`github.js`、影片 handoff 文件，以及 11/08–11/10 Queue、貼文與編輯審核。其他文件只用於流程、查證、格式、安全、媒體和排程。
- 最近三日有 13 篇 Queue，原 ID、requestId、授權和已過排程均未改。11/11 六個時段開始時都未到。

## 最近 24–72 小時的一手 AI 來源

找到四篇官方原始來源，頁面標示發布日均為 2026-11-09：

1. **OpenAI — “Control Room”**（2026-11-09）
   https://openai.com/index/control-room/
   描述以 job ID 管理研究工作、由 inference engine 查核授權並拒絕被停止工作的後續請求；官方說停止指令到不再輸出最長 35 秒，並在 Control Room 失效時 fail closed。適用範圍是 OpenAI 研究基礎設施。
2. **Anthropic — “Testing Claude on real-world electronics design”**（2026-11-09）
   https://www.anthropic.com/research/claude-electronics-design
   與 Diode 合作設計三種硬體原型；人類工程師組裝。原型運作數週，但商業認證及長期耐用性未知；benchmark 數字按公司與合作方自述處理。
3. **Google Research — “Exploring the world’s languages with Language Explorer”**（2026-11-09）
   https://research.google/blog/exploring-the-worlds-languages-with-language-explorer/
   語言多樣性探索工具及社群資料合作。已在 11/10 Queue 使用，今日不重複改寫。
4. **Anthropic — “Introducing Claude Fable 5.2 and Claude Mythos 5.2”**（2026-11-09）
   https://www.anthropic.com/claude-fable-and-mythos-5-2
   模型可用方式、安全政策與公司自述評測；已在 11/10 Queue 使用，今日不重複。

**時效缺口：**四個頁面只公開日期，沒有發布小時或時區；雖其日期落在最近三日，無法精確確認各篇距 2026-11-11 07:30（台北）都已滿 24 小時。故保留四篇日期候選與完整 URL，但不聲稱精確 24–72 小時窗已全部確認。

以下來源日期為 2026-11-10，供今日選題使用，但因同樣無發布時刻，不列入上述嚴格來源數：
- **Google DeepMind — “Introducing AlphaProof Code: a breakthrough in verifying complex software at depth”**（2026-11-10）：https://deepmind.google/blog/introducing-alphaproof-code/ 。對 libsignal 核准規格做 machine-code level 形式驗證；技術論文與 artifacts 可查。結果依賴規格及論文列明假設，不能擴成整個 Signal app 無漏洞。
- **OpenAI Economic Research / Upwork — “Work at the Frontier: AI’s effect on freelance work”**（2026-11-10）：https://openai.com/index/ai-effect-on-freelance-work/ 。Upwork AI 貼文任務組合多樣度從 2023 年初至 2025 年末提高 45%（等量任務約 14.6 增至 21.2），平台貼文不代表整體就業或因果。
- **OpenAI — “Closing the AI guidance gap in education”**（2026-11-10）：https://openai.com/index/closing-ai-guidance-gap-education/ 。文章引述 ThinkYoung 調查：79% 受訪學生表示用 AI 做作業，47% 表示曾被教怎麼用；不外推為台灣學生比例或學習成效。

## Crew 開發素材與去重

- **Crew Pocket commit `1893bfd4d90b174afec236bc49be89a913ae742e`（2026-11-10）**：加入 per-role queue detail，列待處理訊息、自動回應、狀態、時間與 retry reason。https://github.com/magic76/crew-pocket/commit/1893bfd4d90b174afec236bc49be89a913ae742e 。commit/diff 不能證明測試通過或正式部署。
- **Crew Web PR #598（2026-11-10）**：分享流程新增複製文字、純文字原生分享與 fallback、PNG 另存手動附圖，涵蓋 11 語系。https://github.com/magic76/magic76.github.io/pull/598 。
- **Crew Web PR #596（2026-11-10）**：首頁與 Teacher metadata、Open Graph、JSON-LD 對齊並規劃 Search Console 基線；沒有 CTR 成效資料。https://github.com/magic76/magic76.github.io/pull/596 。
- 11/08–11/10 已發／已排內容包括 Crew Car UDP、Fortune 分享隱私、GA4、PWA icon、Agent distraction、11/09 Rush/ARTEX，以及 11/10 Live keyboard、Fortune 浮點、Turnstile、canonical SEO、Language Explorer、Fable/Mythos。全部排程已過期，本輪不改排、不補發。
- Fortune 分享稿暫緩：近三天已有分享隱私和浮點主題，今日再發會令 Fortune 題材過密。SEO metadata 稿暫緩：11/10 才有 canonical redirect，前一日又有 GA4 題。Mic-denial fallback PR #600/#602 暫緩：和 11/10 Live 文字題太近，且缺本輪正式環境端到端素材。Beta 標籤清理淘汰：缺具體讀者故事。Google `/swarm` 預覽與 Pocket 多 Agent 題重疊，暫緩。

## 今日候選與裁決

`content/editorial/reviews/2026-11-11-daily-review.json` 留下 11 題逐項 claim→evidence、reader_context、選淘理由、truth／interest／personal_relevance／opening／template_risk／media_fit 審核。入選 6、暫緩 4、淘汰 1。

入選六題：
1. Crew Pocket 多 Agent 各角色 queue 的可見性（開發）。
2. AlphaProof Code 用 Lean kernel 驗證 AI agents 產生的 libsignal 證明（實務架構）。
3. Claude 設計電路板和三種硬體原型時的反覆改線（研究／應用案例）。
4. OpenAI Control Room 的推理層停止授權與 35 秒延遲（安全實務）。
5. Upwork AI 職缺的任務組合變化（勞動市場研究）。
6. 學生自陳 AI 使用率與使用指引落差（教育討論）。

近期明確不同的 Crew 開發故事只有 Pocket queue 一題；為避免重複，不用近三日 Fortune、SEO、Car 或 mic-permission 題目補足數量。其餘五題採可查核原始 AI 資料，且不包裝成 Crew 實測。六篇均純文字；沒有可公開適用的真實畫面素材，也不需為數量生圖。`alt_text=null`。

## Queue 與 Publisher

六篇新 Queue 使用台北時間 10:00、12:00、14:00、16:00、19:00、21:00。每篇 `status=draft`、`mode=dry_run`、`publish_permitted=false`、`image=null`；主文、Facebook／Threads 首則來源回覆各自使用不同 UUIDv4。AlphaProof 首則回覆附官方文章及技術論文名稱、日期與完整 URL。新稿未取得逐篇發布授權，交 Local Publisher 前仍需核准。

`npm run editorial:check` 通過（今日 review 11 題：6 入選、4 暫緩、1 淘汰）。`npm run queue:check` 驗證 67 個 Queue 項目，六篇新稿均為 `draft`／`dry_run`／`publish_permitted=false`，未呼叫 Meta、Threads 或 Metricool API。`node scripts/social-agent.mjs status` 顯示 Publisher 為 `dry_run`，Facebook 與 Threads 憑證皆未設定、佇列任務數為 0；因此沒有 live 發布條件。

## 未完成影片

今日唯一影片目標續接 `crew-video-2026-11-06-agile-deliberation-retry`，沒有建立第二支。之前結果 API 回 HTTP 200 `audio/wav`，27.72 秒、1,336,676 bytes，非失敗狀態，沒有待處理 `error_code`，不需重試 TTS。既有 MP4 完整 decode／結構檢查通過；但目前環境無法聽音逐字核對 13 個字幕 cue，且 `video-lab/reports/2026-11-06-agile-deliberation-retry/index.html` 不存在，`npm run video:check` 因 `ENOENT` 無法通過。影片維持 `draft_handoff_only`、`publish_permitted=false`、無排程；下一步需人工聽音校字幕、補可檢查的 editable HTML/storyboard source 再做影音 QA。

## 14 天追蹤資料

`content/experiments/2026-11-05-to-18/metrics.csv` 目前只有 header，沒有可核實的發布與實際平台觀察；本輪不新增資料列、不估觸及或推論成效。讀不到的平台數據後續留白並標 `manual_data_needed`。

## 編輯回饋

將 2026-11-09 對 Rush／ARTEX 配圖「太簡易」及新增配圖標準的原始訊號與編輯假設分欄追加到 `content/editorial/feedback/events.jsonl`；既有記錄未改寫，單次回饋沒有擴成所有稿件必須配圖。
