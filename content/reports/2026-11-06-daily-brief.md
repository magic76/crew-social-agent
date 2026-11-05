# Crew Lab SI 每日研究簡報｜2026-11-06

研究時段：2026-11-03 07:00 至 2026-11-06 07:00（Asia/Taipei）。以下只使用官方原始來源，記錄來源發布日期、完整 URL、可支持的主張及限制。研究報告與社群選題分開；本日找到四項 24–72 小時內的高價值來源。

## 近期 AI 原始來源

1. **OpenAI｜GPT-6 Cyber: Advancing the frontier of aligned cybersecurity agents**  
   發布日期：2026-11-05  
   URL：https://openai.com/index/introducing-gpt-6-cyber/  
   OpenAI 公布 GPT-6 Cyber，初期僅提供獲准 Daybreak Red 客戶使用。公司報告 ExploitGym 48.5%，並列出受控範圍評估與 Firefox、Linux 漏洞研究成果。這些是 OpenAI 的模型評估與合作案例；昨日 Queue 已使用 Linux exploit 主題，因此今天只收進研究報告，不重複發文。

2. **Anthropic｜AI for scientific discovery: How researchers use Claude**  
   發布日期：2026-11-05  
   URL：https://www.anthropic.com/research/how-researchers-use-claude  
   Anthropic 以隱私保護方式分析 207,000 個 Claude 與 Claude Code 科研工作階段的聚合分類。公司報告資料分析約占 Claude 科研工作階段三分之一、在 Claude Code 接近一半；形式科學使用較多，物理實驗瓶頸較大的領域較少。文中的未來產出增幅是情境模型推估，不是已觀察成效。

3. **Google Research｜Detecting signs of hypertension using wearable sensors**  
   發布日期：2026-11-05  
   URL：https://research.google/blog/detecting-signs-of-hypertension-using-wearable-sensors/  
   Google Research 公布以智慧手錶 PPG 與加速度計聚合多日訊號、篩檢高血壓跡象的研究，並以 196 名參與者的前瞻性多中心研究對照 24 小時動態血壓監測。這是特定研究中的篩檢結果，不是個人診斷工具；因醫療語境需要更完整限制，今天不做社群短稿。

4. **Google Research｜Agile Deliberation: How AI helps humans define the gray areas**  
   發布日期：2026-11-04  
   URL：https://research.google/blog/agile-deliberation-how-ai-helps-humans-define-the-gray-areas/  
   研究提出主觀影像分類的互動流程：先拆出包含與排除範圍，再主動找邊界案例，讓人的回饋持續更新分類規則。Google Research 報告 18 場、每場 1.5 小時的真人研究中，參與者的標記一致性和分類表現提高，手動調提示詞的負擔降低；這仍是兩個主觀分類任務上的研究結果。

## Crew 開發素材

- Crew 首頁驚喜盲盒：新增浮動探索入口後，連續修正 Crew Cloud／禮物混合、結果卡重疊與人物遮字問題。來源：https://github.com/magic76/magic76.github.io/commit/01b7cd41461f366ec13ab8c9f849524183317bf0
- Crew Pocket Skill DNA：低風險技能須在兩個不同回合通過精確 acceptance tests 才能自動驗證，高風險仍由人工審核。來源：https://github.com/magic76/crew-pocket/commit/d5da11d006e36434e428a85a1bc22bc3ae9d7699
- Crew Pocket Browser Bridge：直送訊息加入持久化 outbox、固定 ID、重試和伺服器回執。來源：https://github.com/magic76/crew-pocket/commit/973f3bb296fc1ffe8d3ef34b388470e4e92efcd1
- Crew Social Agent：Local Publisher 新增字面跳脫換行阻擋，避免主文或首則回覆把反斜線 n 原樣送上平台。來源：https://github.com/magic76/crew-social-agent/commit/e2539ffc84362e1d24e19b1fb9dac3c397938d79

## 編輯與交接摘要

八個候選中選出六題：四篇真實開發故事、兩篇研究／討論；GPT-6 Cyber 因與昨日 Linux 安全貼文重複而淘汰，穿戴式高血壓研究因醫療語境需要更完整限制而暫緩。六篇均刻意採純文字：目前沒有可核實且可分享的最新產品截圖、錯誤輸出或測試畫面；不以生成 UI 冒充實際素材。

六個圖文 Queue 依 10:00、12:00、14:00、16:00、19:00、21:00 排程，包含獨立平台 UUIDv4 與兩平台來源首則回覆。Local Publisher 實際發送仍取決於使用者本機 SOCIAL_AGENT_MODE=live、平台憑證與本地 journal；本次雲端環境無法核實平台結果。

影片選用 Agile Deliberation 題材，原目標為 Crew Light v1、Gemini Kore、繁中字幕的 1080×1920 科普短片。TTS 工作 `crew-tts-agile-deliberation-20261106` 已由 Worker 處理，但結果端點回傳 `status: failed`，因此沒有取得真正 Kore WAV，也就不能誠實完成字幕同步、渲染、聽音與影音 QA。本日不建立 MP4 或影片 handoff；不可用替代聲音冒充完成。14 天 metrics.csv 仍只有欄位，因沒有本次可核實的實際發布或平台成效，不新增推測資料。
