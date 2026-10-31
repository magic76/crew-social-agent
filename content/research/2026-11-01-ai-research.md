# Crew Lab SI AI 研究｜2026-11-01

研究窗：2026-10-28 至 2026-10-30（台灣時間 2026-11-01 發布前 24–72 小時；均採官方或原始來源）。

## 1. 網站的 AI 訓練偏好共同訊號

- OpenAI，2026-10-30：表示未來幾個月會支援 robots.txt 中的共同 AI 訓練偏好訊號；不取代既有 crawler 控制。
- IETF Internet-Draft，2026-10-30：提出 `User-Agent: __usage_ai-training` 搭配 Allow／Disallow 的做法。這是進行中的草案，不是正式 RFC。
- https://openai.com/index/helping-websites-express-ai-training-preferences/
- https://datatracker.ietf.org/doc/html/draft-kelley-aipref-training-preference-signal

## 2. 用評估循環改善 Agent

- Google Developers Blog，2026-10-28：Agents CLI 將評估拆成 generate、grade、compare、analyze、optimize，重點是依失敗樣本改進並排程回歸測試。
- https://developers.googleblog.com/en/hill-climbing-agent-quality-with-agents-cli-evaluation/

## 3. 合成企業資料評估 Copilot

- Microsoft Research，2026-10-30：建立含虛構使用者、郵件、會議和文件的合成 tenant，讓企業情境評估可重複且不碰客戶資料。官方所稱 39% 是特定內部綜合品質指標相對初始方法的改善，不外推成一般模型表現。
- https://www.microsoft.com/en-us/research/blog/from-synthetic-enterprise-data-evaluations-to-real-microsoft-copilot-ai-confidence/

## 4. A2UI：Agent 回傳宣告式介面

- Google Developers Blog，2026-10-29：Agent 以宣告式資料描述 UI，由應用程式的可信元件目錄渲染，支援雙向互動與跨框架整合；不是讓 Agent 直接注入任意可執行程式碼。
- https://developers.googleblog.com/build-generative-ui-apps-with-a2ui-copilotkit-agents/

## 5. 從結果提出自動化改進

- GitHub Changelog，2026-10-28：Copilot Automations 會參考標籤、留言與 PR 合併等結果提出提示詞修改建議；變更仍須人類審核後才套用。
- https://github.blog/changelog/2026-10-28-copilot-automations-now-learn-from-outcomes-and-self-improve/

## 編輯判斷

本日資訊足夠，沒有用常青題材補位。六篇不重複；21:00 開發日常只描述本 repo 已存在並通過驗證的 first-reply 發布契約，不聲稱平台已實際發布。
