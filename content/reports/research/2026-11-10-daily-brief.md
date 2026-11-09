# Crew Lab SI 研究報告｜2026-11-10

- 研究時間：2026-11-10 07:14（Asia/Taipei；2026-11-09 23:14 UTC）。來源頁只公開日期，故不推算精確發布小時。
- 基準 repo：`magic76/crew-social-agent` `main`，HEAD `baee45ff9e0554c31434aa8328e1a7c638604cc2`。
- 唯一正式編輯規範：該 HEAD 的 [`docs/editorial-guidelines.md`](https://github.com/magic76/crew-social-agent/blob/baee45ff9e0554c31434aa8328e1a7c638604cc2/docs/editorial-guidelines.md)。其餘規則只用於查證、流程、格式、安全及排程。
- 研究與發文分開；可用新聞沒有轉成篇數配額。

## 最近 24–72 小時的一手 AI 來源

本次找到 3 項於 2026-11-09 發布的官方／原始來源，落在本輪近期窗口；未為湊到 5 則加入較弱來源。

1. **Google Research — “Exploring the world’s languages with Language Explorer”**（2026-11-09）  
   https://research.google/blog/exploring-the-worlds-languages-with-language-explorer/  
   介紹視覺化語言多樣性的互動探索工具，提及開源 LinguaMeta 與 Project Vaani、WAXAL 等社群合作。讀者價值是多語 AI 的資料來源與在地合作；不擴寫為各語種都有同等品質語音資料，也不是新模型。入選 19:00。

2. **Anthropic — “Claude Fable 5.2 and Mythos 5.2”**（2026-11-09）  
   https://www.anthropic.com/claude-fable-and-mythos-5-2  
   Anthropic 稱兩者使用相同底層模型，但 Fable 對所有使用者開放並套用 cyber/bio safeguards，Mythos 透過專案申請取得。基準數字標明為公司自述，未外推成獨立比較。入選 21:00。

3. **NVIDIA — “Practice Makes Precise: At CoRL, NVIDIA and Partners Reveal How Robots Rehearse Delicate Work in Simulation”**（2026-11-09）  
   https://blogs.nvidia.com/blog/robotics-simulation-advancements-corl/  
   官方文章談機器人在模擬中練習精細工作的研究與合作案例。成績仍為廠商及合作方描述，沒有找到獨立對照，也沒有足夠 Crew／讀者故事；淘汰，不改成泛泛新聞摘要。

## 實際開發素材

日期取自 GitHub PR／commit；程式碼變更不等於測試通過或正式站部署。

- **Crew Web PR #573（2026-11-09）**：BYOK 文字聊天改走 Gemini Live WebSocket，鍵盤輸入、輸出轉錄；textOnly 不開麥克風或瀏覽器播放，但 response modality 仍是 AUDIO，PR 明示尚未完成真實 BYOK 金鑰端到端驗證。https://github.com/magic76/magic76.github.io/pull/573
- **Crew Web PR #579（2026-11-09）**：浮點例子 `3.3999999999999995`；prompt 加權值正規化到兩位小數，舊解說清理明顯浮點尾數，加入預期值為 3.4 的回歸案例。PR 不是 CI 通過證明。https://github.com/magic76/magic76.github.io/pull/579
- **Crew Web PR #578（2026-11-09）**：Friend chat 區分 Turnstile 驗證中與正在回覆，驗證時切換模式時保留未送出的草稿。PR 描述列 390／1280 寬度驗收，本輪未重操作正式站。https://github.com/magic76/magic76.github.io/pull/578
- **Crew Web commit e05bfa9（2026-11-09）**：未翻譯的英文 research detail 301 導向中文 canonical 路徑，英文 hub 保留；不代表 Google 已重新收錄。https://github.com/magic76/magic76.github.io/commit/e05bfa9df100a516c2fb5a7e61f456738b9ec2a6
- **Crew Pocket commit d5da11d（2026-11-05）**：Role DNA 低風險技能限定測試驗證、不同回合證據與失敗撤銷；commit 不證明 CI 通過。因近三日 Pocket／Agent 管理題材重疊且約四日之前，暫緩。https://github.com/magic76/crew-pocket/commit/d5da11d006e36434e428a85a1bc22bc3ae9d7699
- **Crew Car commit c147414（2026-11-06）**：camera UDP 控制回覆與影像片段分流；近三日已有 Car／UDP 題材，本輪無真實封包輸出，暫緩。https://github.com/magic76/crew-car/commit/c147414c25123434cb09d778c6af4faffb9e04d6
- 其他可見 repo 最新紀錄：crew-teacher 2026-10-26、pocket-game 2026-08-26、lg-tv-companion 2026-11-01、Crew Mate／Crew Agent Harness 2026-09。這些近期沒有明顯可用故事。Object Soul 沒有在可存取清單找到獨立 repo，沒有把它記成近期事件。

## 今日候選與裁決

`content/editorial/reviews/2026-11-10-daily-review.json` 留下 9 個候選，含逐項 claim→evidence、reader_context、故事脈絡、裁決、六項具體質量理由、近三日模板檢查、平台稿、媒體方向和 handoff 狀態。

- **入選 6**：10:00 Live 鍵盤聊天的音訊模態界線；12:00 浮點尾數；14:00 聊天驗證狀態；16:00 英文研究深層連結；19:00 Language Explorer；21:00 Fable／Mythos 存取與安全分層。
- **暫緩 2**：Crew Pocket 技能驗證（近期同生態系題材重疊）；Crew Car UDP（近期相近題材，缺真實封包輸出）。
- **淘汰 1**：NVIDIA 機器人模擬（廠商主張缺獨立脈絡，沒有足夠具體讀者收穫）。
- 六篇都選純文字：沒有可公開的真實截圖、錯誤輸出或產品畫面；不生成概念圖、不製造假 UI。Review 中逐篇記錄 `media.type=text_only`、理由與 `alt_text=null`。

## Queue、授權與 Publisher

- 新增 6 個當日 Queue 草稿，排程台北時間 10:00、12:00、14:00、16:00、19:00、21:00。每篇為 `status=draft`、`mode=dry_run`、`safety.publish_permitted=false`、`image=null`；主文與兩平台來源回覆皆是獨立 UUID v4。每個來源回覆有來源名稱、日期、完整 URL。
- 開始檢查時沒有既有 11/10 Queue 檔。11/7–11/9 的 13 個已授權項目維持原樣；排程日期已過，不重排不補發。因本輪無法取得本機 Publisher journal 的逐篇遠端核對結果，這些舊貼文的實際發佈狀態是未知。
- 已檢查 Local Publisher `core.js`／`github.js` 發布條件。repo 沒有 `.env`，`SOCIAL_AGENT_MODE` 未設定，環境變數未見 Facebook／Threads 發布憑證；本輪不符合 live 條件，也未呼叫 Meta、Threads 或 Metricool API。

## 未完成影片恢復

- 延續 `crew-video-2026-11-06-agile-deliberation-retry`，不建立第二支，不重送同一 TTS ID。結果 URL 單次 GET 回傳 HTTP 200、`audio/wav`。取得的 WAV 是 RIFF/WAVE、PCM s16le、單聲道 24 kHz、1,336,676 bytes、27.72 秒，SHA-256 `6e961a14f4089e52dc678b94d121e79fb4e3808d87d2200cbdf0fce6a336058e`，與既有 QA／handoff 記錄吻合。低於 31 秒與 1.6 MB 門檻，不需切段或再次付費請求。
- `ffprobe` 可讀 WAV；`ffmpeg silencedetect` 的停頓與原 13 個字幕 cue 大致吻合。既有 MP4 規格為 1080×1920、30fps、30.507 秒，舊 QA 記錄完整解碼與畫面抽查通過。
- **仍未達可發布門檻**：本輪無法接收音訊播放的聽感回饋，逐字聽音核對未執行；舊 QA 也把字幕逐字與人工聲畫同步留作未驗證。原 handoff 繼續為 `draft_handoff_only`、`publish_permitted=false`。下一步：人工聽完整 WAV 對照 13 個 cue，按實際語速調整字幕，完成影音 QA；再確認影片 Publisher 能否派送來源回覆。

## 14 天實驗資料

`content/experiments/2026-11-05-to-18/metrics.csv` 目前只有欄位列，沒有可核實發布觀察。未讀到平台數據就留白，不估觸及或轉換；待 Local Publisher journal 與平台實際觀察可核實後再新增資料並標記缺漏。

## 本輪檢查

- `npm run editorial:check`：新增前的基準版本 6 份既有 review 通過；新增今日稿後需再執行全量檢查並逐條修正。
- `npm run queue:check`：新增草稿後再執行，只檢查 schema、來源、UUID 和排程，不發布。
- `npm run video:handoffs`：新增前 6 份 handoff 結構檢查通過；本輪未修改影片發佈欄位。
