# Crew Lab SI 研究社｜2026-11-04 AI 情報

研究窗口：2026-11-01 至 2026-11-04。以下五則均取自研究機構或產品公司原始發布；公司自行報告的數字與示範，應視為來源方的陳述，不等同於獨立重現結果。

## 1. OpenAI：AI 輔助實體工程設計
- 發布日期：2026-11-03
- 原始來源：https://openai.com/index/accelerating-engineering-for-the-physical-world/
- 重點：OpenAI 分享 Astra 協助設計裝置外殼、PCB、UI 與韌體的示範，並說內部團隊把模型用於 CAD、製造圖與模擬。
- 限制：文中承認製造公差、裝配細節仍需多輪工程檢查；屬於特定團隊案例，不能推廣成 AI 已能獨立量產。

## 2. OpenAI：LifeVal 日常任務基準
- 發布日期：2026-11-02
- 原始來源：https://openai.com/index/lifeval/
- 重點：基準涵蓋照護、教育、家庭行政、財務、購物與政府服務等真實任務；其任務來源結合時間使用資料與 3,995 位受訪者的調查。
- 限制：這是 OpenAI 自行建立與評估的基準。分數反映該套任務和評測條件，不能單獨代表所有人的實際體驗。

## 3. Anthropic：FlashProve 可驗證推論原型
- 發布日期：2026-11-02
- 原始來源：https://www.anthropic.com/research/provable-inference
- 重點：研究以 zkSNARK 為推論產生證明，目標是讓使用者確認輸出對應特定模型權重，同時不公開權重。Anthropic 報告其 400B、4-bit Llama 4 Maverick 原型在單張 H100 上約 110 tokens/s；每 1,024 tokens 證明約 19 MB。
- 限制：來源估算證明生成約需一般 vLLM 推論 70–95 倍 GPU 時間，並明確定位為研究進度，不是已普及的產品功能。

## 4. OpenAI：為大量並行開發擴展 Git
- 發布日期：2026-11-02
- 原始來源：https://openai.com/index/scaling-git-at-openai/
- 重點：OpenAI 說明自建 Git 相容後端 Pando，支援大型 monorepo 的並行 push 與讀取；公司報告 production 中位 push 延遲約降至原來五分之一，日傳輸量接近 1 PB。
- 限制：Pando 是 OpenAI 內部系統；文中數據由公司提供，並非可下載的通用工具或獨立測試。

## 5. Google DeepMind：Antigravity 化學工作流
- 發布日期：2026-11-03
- 原始來源：https://deepmind.google/blog/agentic-cheminformatics-with-google-antigravity/
- 重點：展示 Agent 整理文獻與化合物資料、執行分子比較與建模，再提出候選與可能的合成路線；流程將模型編排和推理與 RDKit 等化學工具分工。
- 限制：文中明確說候選分子仍是待驗證假說，必須實際合成與實驗測試，不能解讀為已發現有效藥物。

## 今日貼文對應
- 10:00 新聞：OpenAI 實體工程設計
- 12:00 實用技巧：以 LifeVal 引出任務目標、限制、交付格式及核准界線
- 14:00 研究：zkSNARK 可驗證推論
- 16:00 工具：Pando 與大量 Agent 開發的版本控制瓶頸（明示為內部系統）
- 19:00 應用：Antigravity 化學工作流與實驗驗證
- 21:00 開發日常：GA4 collect 請求驗收；此為使用者最近實際處理的網站除錯經驗，沒有外部來源。

## 影片狀態
- 題材：Google DeepMind 的 Antigravity 化學工作流。
- 已排入真正 Gemini TTS Worker 的 Kore 聲音請求：crew-tts-antigravity-chemistry-20261104。
- Worker 會依 main 上的請求佇列處理；目前執行環境沒有本機 GEMINI_API_KEY，且可用讀取路徑無法取回 Worker WAV，因此尚無法測量配音、同步字幕、渲染與驗證 MP4。未建立 video handoff，也未標為可發布。
- 視覺腳本遵循 Crew Light v1：無片頭，前 3 秒問題破題、4 個重點段落、最後結論；Crew Cloud 橘色雲朵主持人、米白底藍紫光暈、圓角卡片、白色膠囊字幕。動作與時序待取得實際 WAV 後決定。

### 配音腳本草稿
AI 一小時整理數千分子？Google DeepMind 在十一月三日展示 Antigravity 的化學工作流程。Agent 從論文與資料庫整理化合物，並記錄來源。接著由 RDKit 等工具執行分子計算，AI 負責串起搜尋、比對、建模和提出候選。示範以肺癌藥物為例，分析數千筆分子資料，提出可能的結構與合成路線。團隊說，這輪分析約一小時。但候選不等於新藥。資料會有誤差，分子仍要合成並做實驗驗證。AI 幫忙找方向，實驗室才會告訴我們答案。
