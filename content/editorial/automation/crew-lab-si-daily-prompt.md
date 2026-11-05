# Crew Lab SI Daily · 07:00 Asia/Taipei

Use this as the saved daily task prompt. The task's existing daily 07:00 Asia/Taipei schedule stays unchanged.

```text
執行 Crew Lab SI 研究社每日「研究＋編輯」工作。先確認 magic76/crew-social-agent main HEAD，閱讀 AGENTS.md、skills/crew-social-agent/SKILL.md、skills/crew-social-editor/SKILL.md、content/editorial/README.md、content/editorial/QUALITY_GATE.md、content/editorial/MEDIA_POLICY.md、content/queue/README.md、Local Publisher 的 core.js／github.js、影片 handoff 文件，以及最近三天 Queue、貼文與編輯審核紀錄。確認沒有重複、過期排程或競爭中的 main 更新。不可改寫任何既有已授權、已排程、已發布 Queue 項目、id 或 requestId。

每日研究與社群發文分開處理。保留一份有日期、來源發布日期和完整 URL 的研究報告；查找最近 24–72 小時 3–5 項可信原始 AI 來源，若可用消息不足就明確記錄缺口，不把新聞數量當發文配額。優先查 Crew Pocket、Crew Web、Crew Car、Crew Play、Crew Teacher、Object Soul、LG TV Companion、多 Agent 管理等實際開發素材：GitHub commit、PR、issue、開發記錄、真實畫面、錯誤或測試輸出。commit 訊息不能證明測試通過。禁止虛構個人經驗、測試結果、失敗、情緒或讀者反應。

在 content/editorial/reviews/YYYY-MM-DD-<slug>.json 記錄至少六個候選題材，每題都有可核實素材、逐項 claim→evidence 對應、以一句白話介紹產品或玩法的 reader_context、入選／淘汰／暫緩理由，以及 truth、interest、personal_relevance、opening、template_risk、media_fit 六項具體審核理由。貼文開頭先讓沒看過專案的讀者知道這是什麼，再帶出具體事件，避免直接丟未解釋的產品名或 UI 問題。每天都要完成至少一篇通過基本真實性檢查的社群貼文草稿，原則上 1–2 篇；若沒有真實開發故事，改選有可靠來源與明確讀者價值的實用技巧／討論或 AI 研究常青題材。不得為數量杜撰經歷或湊普通新聞；只有來源不可用或安全問題導致無法核實時，才可降為零篇，並清楚記錄原因與補救方向。14 天測試期間整體觀察比例約為 60% 真實開發、30% 實用技巧／討論、10% AI 新聞研究；只是觀察方向，不是每日配額。先找到故事，再寫文案。若只有通用摘要、沒有真實連結或沒有可說的意外／決策／讀者價值，就淘汰或暫緩。

依使用者明確的繁體中文自然口語風格撰寫；短句、乾幽默、具體開場可用但不要硬塞口頭禪、標題、hashtag 或提問。避免新聞週報腔與重複套用既有句型。Facebook 和 Threads 分別編輯，Threads 通常較短。不得為了吸引力擴寫成未經證實的經歷。

每篇依故事決定媒體：工程故事優先真實且可分享的截圖／錯誤／輸出；搞笑意外可用有明確事件和情緒的漫畫；研究可用準確機制圖；純文字若足夠就不配圖。沒有真素材不得生成假 UI，生成插畫不得冒充實際測試。逐篇記錄 media type、來源、理由與 alt text；不可為數量而生圖。

執行 npm run editorial:check，逐條處理檢查結果；它只查結構與安全，不替編輯判斷打分。保留候選清單、來源、裁決理由、Facebook／Threads 定稿、配圖類型及 handoff 狀態。Daily research report 仍須保留，不因發文減少而省略。

發布仍交給現有 Local Publisher。先檢查 Queue schema、有效且未過期時段、去重、平台 requestId、憑證和本機 live 條件。審核通過不等於發布授權。只有已明確涵蓋該日常內容的既有授權才可設定 status=ready_for_local_agent、mode=live、safety.publish_permitted=true；對新而未核准的文章保持 draft_handoff_only／draft，publish_permitted=false。每篇使用穩定唯一 id，Facebook／Threads 使用不同 UUIDv4 requestId；有 source 或 references 時，每個目標平台 first_replies.facebook／threads 都要有來源名稱、完整 URL 和各自獨立 UUIDv4 requestId。排程只用當天尚未過期時段。不可直接呼叫 Meta、Threads 或 Metricool API，不使用 GitHub Actions。

影片是獨立選題與 handoff，不再每日硬性製作。只有故事值得做影片、流程可完整驗證且已取得本次明確授權，才依既有 Crew Light v1 和影片契約製作；不把 MP4 放進圖文 Queue，也不可把影片設為可發布，除非素材、字幕、影音檢查及授權全部有效。

在 content/experiments/2026-11-05-to-18/metrics.csv 只記錄已核實發布與實際觀察。平台數據讀不到就留白並標 manual_data_needed；不得杜撰或只憑一次觸及量推斷內容有效。收到使用者主動選題、修改、拒絕、換圖、正負回饋或成效資訊時，將原始回饋追加到 content/editorial/feedback/events.jsonl，分開記錄原話和假設，不把單次回饋擴成永久規則。

若有新增 repo 檔案，檢查 main HEAD 未變並用 fast-forward 提交；絕不改寫舊正式稿或 secrets。回報：研究報告與來源、至少六個候選題及選淘理由、每日目標 1–2 篇的完整雙平台文案和圖片方向、Queue／draft handoff、Publisher 尚待執行或已核實狀態、14 天 tracker 的資料缺口。不要為了交付完整感而補做普通題材或影片。
```
