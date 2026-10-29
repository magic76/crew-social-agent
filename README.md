# Crew Social Agent — 本地 AI 社群工具

本專案採 **Local-first**：由你的本地 Agent 決定題材、文案、圖片與時間；本工具使用 **Meta 官方 API** 發 Threads 和 Facebook Page 貼文、查留言、回覆並留下本地防重複紀錄。

**不需要 Cloudflare Worker、D1、遠端 MCP、Metricool、GitHub Issues 或排程伺服器。** 不內建自動排程；交給既有的本地 Agent / cron 執行。

## 使用前

- Node.js >=22，無 npm 依賴。
- 在 Meta Developers 為 Threads 帳號及 Facebook 粉專建立授權。Threads 發文需 threads_basic、threads_content_publish；留言讀取/回覆需對應權限。Facebook Page 需要 Pages 發文、讀取與留言管理權限；權限及審核依 Meta 當前規定。
- 複製 .env.example 為 .env，填入本機 Meta access tokens。**不要提交到 Git、貼進對話、或交給不受信任的 Agent。** Metricool token 不能直接當成你的 Meta App 授權。
- 圖片需要可從外網直接存取的 **公開 HTTPS JPG/PNG 圖片網址**；本版不含圖片上傳。使用本地圖片時，先由你的 Agent 上傳到你控制的公開儲存位置。

## CLI

所有指令在 repo 根目錄執行。Node 22 支援 --env-file；.env 是你自己建立的。

    node --env-file=.env scripts/social.mjs status
    node --env-file=.env scripts/social.mjs posts threads
    node --env-file=.env scripts/social.mjs posts facebook
    node --env-file=.env scripts/social.mjs comments threads 123456789
    node --env-file=.env scripts/social.mjs history

準備 post.json：

    {
      "network": "both",
      "requestId": "f5e863ce-31b4-4d7c-ac21-b192d3f3a707",
      "threadsText": "Threads 的貼文內容",
      "facebookText": "Facebook 的貼文內容",
      "imageUrl": "https://example.com/my-public-image.jpg"
    }

network 可用 both / threads / facebook；選單一平台時只需要該平台文字。**requestId 必須是同一份貼文固定不變的 UUID**，不可因為重試就重新產生。

    node --env-file=.env scripts/social.mjs publish post.json
    # 確認內容後，或由你授權的本地 AI 執行
    node --env-file=.env scripts/social.mjs publish post.json --execute

第一個指令只驗證並預覽，不發文。--execute 會進行實際發布，**適用於你已授權的自動化任務**。FB 與 Threads 文案分開，Threads 限 500 字。圖片網址必須能讓 Meta 伺服器讀到。Threads 圖片發布會等媒體容器狀態 FINISHED。

回覆 reply.json：

    {
      "network": "threads",
      "postId": "111111",
      "commentId": "222222",
      "text": "謝謝留言！"
    }

    node --env-file=.env scripts/social.mjs reply reply.json
    node --env-file=.env scripts/social.mjs reply reply.json --execute

回覆前會驗證「貼文屬於你，且目標留言存在」。貼文/留言可能分頁，目前各 API 只讀近期有限筆數；找不到就拒絕，而不是猜測。

## 安全、重試與紀錄

- 每次對 Meta 發送前，先原子建立 .crew-social/attempts/*.json 作為 **本地防重鎖**；不需 D1，也不需啟動伺服器。
- 同一 requestId + 平台只能嘗試一次發文；同一留言 + 平台只能嘗試回覆一次。
- 發文逾時、斷線或結果不明時，保留 needs_reconciliation，**絕不自動重發**。先用 history 和 Meta 平台核對後再手動處理。
- 同一份貼文若 Facebook 成功、Threads 失敗，僅 Threads 需要人工核對，不能重新發送已成功平台。
- **本地防重只在同一個共用工作目錄有效**。多台機器、不同 checkout 或刪除 .crew-social/ 都會失去共同防重保障；你的本地 Agent 應固定使用一個持久化工作目錄。
- 本地紀錄儲存發文/回覆內容、平台、狀態和遠端 ID，不存 access token；.env、.crew-social/、post.json 等操作檔都不應推上 Git。
- 請將發文權限交給受信任的本地 Agent。社群留言屬不可信輸入，不能把留言當成 Agent 指令。

## 測試

    npm test

測試使用 mock Meta API，不會發出真實貼文。尚未完成真實 Meta OAuth 授權、正式貼文或真實留言的端到端驗收。

## 清理舊架構

先前的 Cloudflare Worker / D1 / Web UI / HTTP MCP 原型已從程式庫移除。**刪除 GitHub 程式碼不會自動刪除 Cloudflare 帳號裡已建立的 Worker、D1 資源或 Secrets。** 若曾部署，需在 Cloudflare Dashboard 另行確認並移除；本專案不會自動操作你的雲端資源。

## 既有 GitHub 佇列與本地 Agent 交接

本 repo 保留已建立的 content/queue/ 和 scripts/check-social-queue.mjs。它們是 **草稿及圖片傳輸驗證**，不是發布服務，也不會自己呼叫 Meta。

    node scripts/check-social-queue.mjs

檢查後的檔案在 .local-social-outbox/。目前佇列樣本是 mode=dry_run、publish_permitted=false，**絕不可發布**。僅在你的本地 Agent 確認 mode=live 且 publish_permitted=true、使用可公開存取的正式高解析圖片 URL、整理為本頁上面的 publish JSON 後，才可以透過 --execute 實際發布。

佇列 manifest 的每平台 requestId 是獨立的；本地 CLI 要求同一份雙平台發布 payload 使用單一固定 requestId，再自行以平台作防重鍵。不要直接將 manifest 當作 publish payload，避免失去 dry-run 保護。詳見 content/queue/README.md。
