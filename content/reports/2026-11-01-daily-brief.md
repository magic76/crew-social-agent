# Crew Lab SI 每日內容交付｜2026-11-01

## 研究精選

完整研究筆記：[`content/research/2026-11-01-ai-research.md`](../research/2026-11-01-ai-research.md)

1. OpenAI／IETF AI 訓練偏好共同訊號（2026-10-30）：仍是草案；OpenAI 表示未來幾個月支援。
2. Google Agents CLI 評估循環（2026-10-28）：依失敗樣本 generate／grade／compare／analyze／optimize。
3. Microsoft 合成企業評估（2026-10-30）：可重複測試且不碰客戶資料；內部 39% 指標不外推。
4. Google A2UI（2026-10-29）：Agent 回傳宣告式資料，由可信元件目錄渲染互動介面。
5. GitHub Copilot Automations（2026-10-28）：依實際結果提出提示詞修改，仍需人類審核。

## 六篇正式 Queue

| 時間 | 類型 | 題目 | Queue |
|---|---|---|---|
| 10:00 | AI 新聞 | 網站的 AI 訓練偏好共同訊號 | `content/queue/2026-11-01-training-preference-signal.json` |
| 12:00 | AI 實用技巧 | Agent 評估先看失敗樣本 | `content/queue/2026-11-01-agent-eval-loop.json` |
| 14:00 | AI 研究 | 用合成企業環境測試 Copilot | `content/queue/2026-11-01-synthetic-enterprise-evals.json` |
| 16:00 | AI 工具 | A2UI 讓 Agent 回傳可控介面 | `content/queue/2026-11-01-a2ui.json` |
| 19:00 | AI 應用 | 從結果改進 Copilot Automations | `content/queue/2026-11-01-self-improving-automations.json` |
| 21:00 | 開發日常 | LG TV Companion：手機遙控器與電視操作 | `content/queue/2026-11-01-source-reply-pipeline.json` |

21:00 開發日常已依後續指示改為 LG TV Companion 手機 App 介紹，介紹 Wi-Fi 喚醒電視、觸控板遙控與手機開網站／找影片，並把三張使用者截圖合成單圖；來源與兩平台首則回覆列於 Queue。

六篇都包含 Facebook 與 Threads 完整文案、平台獨立固定 UUID v4 requestId，並設定 `status=ready_for_local_agent`、`mode=live`、`safety.publish_permitted=true`。

## 首則來源回覆

六篇圖文與影片 handoff 都在 Facebook／Threads 的 `first_replies` 中保存完整來源 URL，各平台留言使用獨立 UUID v4。Local Publisher 應在主文成功後發布來源留言；目前是已授權的 Queue／handoff，**不是平台已發布回執**。

## 六篇正式配圖

| slug | 尺寸 | JPEG SHA-256 |
|---|---:|---|
| training-preference-signal | 1254×1254 | `eca1b1bcda885e43cef025d1c1455fbb252cbda708e160038a0011d6752fe4b7` |
| agent-eval-loop | 1254×1254 | `b8fa4a86bb43c31f9c39cef3f872d0195972ad00b6139d5b57021d37f26e9d2f` |
| synthetic-enterprise-evals | 1254×1254 | `70d35aca4e01c91dfe790ff6312a1e14c632e57e41a71eb1fb854c6ee39a181b` |
| a2ui | 1254×1254 | `438eeea2054a0c2cb9e58a820a63a0aaf38596212f33706f69d4b9947a449d5a` |
| self-improving-automations | 1254×1254 | `ccf8c99608d4cdd69b163a5c7dd35883fbff88be77d97ef942f9fc01a978ad62` |
| lg-tv-companion-app | 2335×1888 | `5dde91ee00d10c7ba20f51d7b4188da7dbf634bd63fc63a55464a648bd8f108a` |

每篇配圖均保存 JPEG、WebP 與無換行 canonical `.jpg.base64`；Queue validator 已確認 Base64 解碼 bytes、尺寸、格式和 SHA-256 一致。五張由 OpenAI 內建 ImageGen 獨立生成；21:00 配圖是使用者提供的三張手機截圖原尺寸合成，prompt／素材紀錄在 `content/reports/2026-11-01-image-prompts.md`。

## 影片

- 題目：測 AI，也可以先開一間假的公司。
- Gemini narration：Crew Web TTS Worker／Kore／zh-TW；原始 WAV 28.08 秒，SHA-256 `8dd3de825b1dbdec42c8d0935e52a4fbe15d74675fc17b482624475d8c79ea75`。
- 完成品：1080×1920、30 fps、40.0 秒、H.264、AAC 48 kHz stereo、yuv420p。
- MP4 SHA-256：`c89769c14a9a0c8e53c0530bc7f595f081b5c5bd8c97e55b7016438804bddfba`。
- 旁白以 `atempo=0.82` 保留音高，加入 1.5 秒 lead-in；五段繁體中文字幕依實際 WAV 停頓對齊並燒錄。
- HyperFrames check、完整 FFmpeg decode、開頭／中間／結尾畫面與音訊抽查均通過；缺字問題已用本片專用 Noto Sans CJK TC 子集修正後重渲染。
- Handoff：`content/video-handoffs/2026-11-01-synthetic-enterprise-evals.json`，`ready_for_video_publisher`、`publish_permitted=true`，20:00 Asia/Taipei。

## 發布責任與成效追蹤

本批次只交付 GitHub Queue／video handoff，沒有直接呼叫 Facebook、Threads 或 Metricool。實際發布、憑證檢查與去重由本地 Publisher 執行。執行環境未提供 `SOCIAL_AGENT_MODE` 或平台憑證，因此無法宣稱平台已發布。14 天追蹤欄位已建立於 `content/reports/metrics/2026-11-01-tracker.csv`；目前所有數據留空，等待實際平台回執。
