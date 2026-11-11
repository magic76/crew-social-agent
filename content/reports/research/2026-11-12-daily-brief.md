# Crew Lab SI 研究報告｜2026-11-12

- 研究時間：2026-11-12 07:00 後（Asia/Taipei）；基準 `magic76/crew-social-agent` main `4b099ac36485c83fa403411955f123369cfc0ae3`。先讀 `docs/editorial-guidelines.md`，並核對 AGENTS、編輯與 Publisher 規格、近期 Queue／review 和影片交接。
- 研究與社群選稿分開。以下來源頁面多只公開日期、沒有時間和時區；日期落在 11/10–11/11，無法對每篇精確確認「距執行時已滿 24 小時且不超過 72 小時」。這是時效缺口，不以篇數代替查證。

## 近期一手 AI 來源

1. **AAIF — DevEx for your agents: How AGENTS.md cut token usage and cost**（2026-11-11）
   https://aaif.io/blog/devex-for-your-agents-how-agents-md-cut-token-usage-and-cost
   作者在一個 Hugo 網站以三項任務、每組各三次比較有無 AGENTS.md：符合條件 9/9 對 7/9、平均約 285k 對 447k tokens。這是單站、單一 agent 設定的小樣本。直接開啟頁面回 `DisabledError`，一手來源的搜尋索引可讀到日期、方法及表格，故保留此存取限制。
2. **AWS — UAEF: A framework-agnostic system for closed-loop evaluation of AI agents**（2026-11-11）
   https://aws.amazon.com/blogs/machine-learning/uaef-a-framework-agnostic-system-for-closed-loop-evaluation-of-ai-agents/
   Adapter 將訊息、工具呼叫及交接轉成共同 trace；模型裁判要引用受評內容中的真實片段，找不到證據則拒收分數。AWS 提醒評分不是安全控制決策。這是 AWS 對自身系統的說明。
3. **Microsoft Research — Lazare, veni foras**（2026-11-10）
   https://www.microsoft.com/en-us/research/blog/lazare-veni-foras-reprogramming-dormant-neurons-to-backdoor-ai-agents/
   研究在可改寫模型權重的前提下，以少於十個休眠神經元植入觸發行為；不需重訓。掃描並不保證無後門。直接開啟回 `DisabledError`，搜尋索引有作者文章與研究前提。
4. **Google Open Source — Scaling AI agents with open standards: MCP and Agent Skills**（2026-11-11）
   https://opensource.googleblog.com/2026/11/scaling-ai-agents-open-standards-mcp-aaif.html
   訪談將 MCP 的工具與資料連接、Skills 按需載入程序指引分開說明。僅是來源對規範及實作的描述，不能宣稱所有環境相容或必定省 token；今日因 Agent 題密度暫緩。
5. **OpenAI Alignment — What affects chain-of-thought monitorability across the model lifecycle?**（2026-11-10）
   https://alignment.openai.com/cot-monitorability-model-lifecycle/
   研究以 no-CoT 能力及 CoT controllability 作監控迴避的代理指標；作者亦討論代理指標與實際風險的局限。今日先暫緩，避免把代理量測當直接安全結論。

## 可核實的開發故事

- **PR #609**（2026-11-11 合併）：縫收納袋的貼文被附帶的 lunch break 字詞誤判成食物；改為看高信心主要活動，判不出則用通用問題。PR 中 Playwright 使用模擬驗證，不代表真實讀者成效。https://github.com/magic76/magic76.github.io/pull/609
- **PR #616**（2026-11-11 合併）：原本 6,000 字元邊界保留前 4,800 與後 1,100，貼文背景在中段被截掉；修正保護貼文及首輪指示。PR 的正式站前態檢查攔截 request，沒有呼叫模型。https://github.com/magic76/magic76.github.io/pull/616
- **PR #610**（2026-11-11 合併）：固定腿與動作腿重疊；新步態拆四拍並補償身體上下位移。PR 自述本地檢查；本輪未驗證手機實機手感。https://github.com/magic76/magic76.github.io/pull/610
- **PR #627**（2026-11-12 台北 06:49 合併）：以階段 HP 下限和裝甲避免高傷害跳過 Boss 階段；仍需手機真人試玩。今日已有遊戲動作稿，暫緩。https://github.com/magic76/magic76.github.io/pull/627

## 選題與素材

完整逐項 claim→evidence、六項審核理由、雙平台稿、來源留言及 UUID 均在 `content/editorial/reviews/2026-11-12-daily-review.json`。10 個候選：6 入選、4 暫緩。六題分別是錯誤分類 fallback、prompt 中段截斷、跑步著地、AGENTS.md 對照實驗、AI 裁判證據、模型權重後門。每個平台版本都含具體讀者行動；沒有以低品質題材湊數。

PR #609 的比較圖原始連結下載回 HTTP 404，改用清楚標示的 AI 概念插畫 `content/editorial/assets/2026-11-12-sewing-question-illustration.jpg`，人物縫袋子、橘色雲朵誤以為是食物；並非真實截圖。AAIF 圖 `content/editorial/assets/2026-11-12-agents-md-eval.png` 依原始資料以 Matplotlib 繪製，兩圖均 1080×1350 並已看過 390px 預覽。其餘四題暫用文字，review 記錄如日後取得真實素材可採的方向。

## Queue、授權與每週比例

11/09–11/11 既有 Queue 排程已到期或在過往日期；狀態不等於實際發布，本輪不修改、不補發。11/11 指定四篇的授權只涵蓋當日那四篇，不涵蓋今日新稿。今日六個時段 10:00、12:00、14:00、16:00、19:00、21:00 僅為 review 草稿中的計畫，當日未過期時段以實際交接時間再核對。未建立今日 Queue、未設定 live 或發布許可、未呼叫 Meta／Threads／Metricool 或 Publisher。每篇與兩平台主文／來源回覆均有穩定且不同的 UUIDv4；不改動舊 ID。

本週先前保留的選稿共 14 題：11/09 三題（Rush、ARTEX，以及兩篇合併後保留但使用者指示不入 Queue 的語言稿）、11/10 六題、11/11 五題（含 Anthropic 延後 draft，Pocket 已刪）。其中 11/09 合併語言稿及 11/10 四題正文提及自家產品，共五題；11/09 PWA 與 Fortune 題依後續重審淘汰。加今日六篇，選稿分母為 20，產品提及 5，比例 25%，今日新增 0；已超過後來訂定的每週上限，剩餘額度為 0。這不是實際發布比例。修正 review validator 對歷史超額的誤判：可如實記錄既有超額，額度用完後仍阻擋新增提及。

本機沒有 `.env` 或 Local Publisher state；credentials、live mode、實際發布與平台 journal 均未知。`content/experiments/2026-11-05-to-18/metrics.csv` 目前只有標頭，沒有核實的發布或觸及數據；標記 `manual_data_needed`，未新增資料列，也不能用單篇觀察推因果。

## 影片前案恢復：Agile Deliberation

- 繼續既有 `crew-video-2026-11-06-agile-deliberation-retry`，沒有另建影片或付費 TTS。原 job `crew-tts-agile-deliberation-20261106` 結果 API 回 HTTP 202、`status=failed`、`error_code=bad_audio_payload`。現行 Worker 源碼將多種 base64 格式或長度異常歸為同一代碼；部署版本未確認，不能推斷具體成因。參考 https://github.com/magic76/magic76.github.io/blob/48c85651571a4071d9e1a1c230b72e170a5743d2/workers/guest-trial/video-tts.mjs#L45-L48
- 已有 retry `crew-tts-agile-deliberation-retry-20261106-01` 回 HTTP 200 `audio/wav`，1,336,676 bytes、27.72 秒，SHA-256 `6e961a14f4089e52dc678b94d121e79fb4e3808d87d2200cbdf0fce6a336058e`。既有 MP4 1,541,132 bytes，1080×1920、30fps、30.507 秒，H.264/AAC，SHA-256 `85e2396b3171aabd267c35b31fd9cb655a185fd6bc808bc3a942f0804a106013`，本輪完整解碼無錯。解碼音軌與 WAV 相似度及 SRT 文字一致只能證明訊號／文字比對，不能代替實際聽音及字幕時序 QA。
- 抽幀確認 5.000 秒近乎全空白且字幕消失，5.033 秒開始淡入；SRT 第 4 句從 4.990 秒開始，需修正轉場及逐字同步。`npm run video:check -- video-lab/reports/2026-11-06-agile-deliberation-retry` 回 ENOENT：缺該目錄 `index.html`。工作區與 Library 標題搜尋均未找到可重現 HTML。
- 本環境 Chromium headless 啟動回 `socket() failed: Operation not permitted`；ffplay 報 `cannot find card '0'` 與 `Couldn't open audio device`，因此未完成全片觀看及聽音。現行 `local-publisher/video.js` 也未派送 first_replies。下一步是找回或重建可編輯 HTML、修正 5 秒空白、重渲染後人工逐句聽音及字幕 QA，並在發布前補來源留言能力與取得本片明確授權。handoff 維持 `draft_handoff_only`／`publish_permitted=false`／無排程；不假稱完成。

## 本輪檢查

`npm run editorial:check` 通過：9 個 review 均有效，今日 10 個候選、6 入選、4 暫緩、0 Queue-ready。`node --test tests/editorial-review.test.js` 9/9 通過，包含歷史超額後不新增提及、額度內外邊界；24 個新增 UUIDv4 互不重複且未與現有 Queue requestId 相撞，六個計畫時段於 07:22 均未過期。通過結構檢查不等於編輯或發布授權。
