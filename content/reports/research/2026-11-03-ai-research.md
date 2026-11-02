# Crew Lab SI｜2026-11-03 AI 研究摘記

研究時間窗：2026-10-31 至 2026-11-02 UTC；以下四項均於 2026-11-02 發表，符合近 24–72 小時範圍。數字僅描述原始來源報告的結果。

## 1. OpenAI Grid Protectors：把資料中心彈性納入電網安排
發布日期：2026-11-02  
來源：OpenAI — Introducing the Grid Protectors Program  
URL：https://openai.com/index/grid-protectors-program/

OpenAI 表示，計畫將與公用事業及監管單位合作，讓未來園區可在電網吃緊時降低需求；喬治亞州合作包含最高 1,000 MW 的彈性需求回應規劃，文中以約 70 萬戶家庭平均用電量作量級比較。這是未來園區與需求回應的規劃和承諾，並非目前已實現的供電戶數或實際節省量。

## 2. Google GTIG / Mandiant：LLMJacking 造成模型資源與雲端身份遭濫用
發布日期：2026-11-02  
來源：Google Threat Intelligence Group / Mandiant — The Rise of LLMJacking: How Threat Actors Monetize Compromised Cloud and Model Resources  
URL：https://cloud.google.com/blog/topics/threat-intelligence/llmjacking-monetizing-compromised-cloud-models/

報告回顧 2026 年多起事件，說明遭竊或暴露的雲端身份、API 金鑰與權限如何被用來濫用模型額度。作者稱個別事件曾出現單日超過 US$100,000 的異常費用，也有組織在撤銷存取前累積到 US$1 million。這些是事件觀察，不代表一般 API 使用成本。建議包括最小權限、按模型與環境拆分金鑰、secret scanning、配額及預算告警。

## 3. Clinical LLM benchmark overlap：評估分數受訓練語料重疊與流程限制
發布日期：2026-11-02  
來源：Scientific Reports — Agha & Anwar, Training-corpus overlap and evaluation protocol constrain measured gains in a fine-tuned clinical language model  
URL：https://www.nature.com/articles/s41598-026-77367-y

研究檢查 Qwen3-8B QLoRA 微調模型及其 97,041 項訓練語料，並以多種文字比對方式檢視八個基準。作者報告 PubMedQA、MedQA、MMLU Professional Medicine 的 exact-stem 重疊超過 70%；在 1,838 題未被 exact-stem 標記的 MedXpertQA 子集上，微調模型為 20.8%，母模型為 15.6%。這是特定模型、子集和 harness 下的差異，不足以推論醫療模型普遍能力；文章也說訓練語料不能重新分發，因此第三方無法獨立重做該項重疊分析。

## 4. Ontology-constrained multi-LLM 文獻整理：把分歧保留成可檢查結果
發布日期：2026-11-02  
來源：Scientific Reports — Nejat et al., Ontology-constrained multi-LLM scoring of hypothesis support in the predictive processing literature  
URL：https://www.nature.com/articles/s41598-026-77038-y

研究用十個本機語言模型分析 31 篇研究，透過 36 個受控概念和三個假設空間比較研究及模型間的支持程度。作者報告 local oddball 情境的同意程度比 global 情境高。可借鑑之處是先定義 ontology，保留每筆判讀的來源證據和分歧；這只是研究流程示例，並未證明多模型評分可替代專家判讀或適用所有領域。

## 今日工具欄（不列入上述 24–72 小時研究清單）
Google AI for Developers 的 Gemini API Release Notes 標示 Computer Use 工具於 2026-10-30 在 Interactions 與 GenerateContent API 正式 GA。來源：https://ai.google.dev/gemini-api/docs/changelog  
此工具稿只描述公告的 GA 狀態，不宣稱曾在本機測試或替使用者驗證安全性。
