# Crew Social 本地 Agent 待發佇列（測試版）

此資料夾是 ChatGPT 與本地 Agent 的交接點，**不是**已發布紀錄，也不會自動呼叫 Meta。

## 目前的測試內容

- `2026-10-30-android-studio-agents.json`：一篇 Google Android Studio Agent 新聞，包含 Threads 與 Facebook 文案、來源、穩定 ID 與兩個獨立的 requestId
- `assets/2026-10-30-android-studio-agent.webp.base64`：圖片 Base64（ASCII 文字），解碼後為真正的 WebP。這張 256×256 是 **資料傳輸／解析驗證用縮圖**；正式發布前請換成原生高解析圖片（建議至少 1080×1080），不要把測試縮圖當正式素材。

## 本地 Agent 取件

```sh
git pull --ff-only
node scripts/check-social-queue.mjs
```

這支程式會依照 manifest 檢查目標平台、貼文字數、圖片 WebP 簽名與 SHA-256；將完整文案和解碼後的圖片輸出到 `.local-social-outbox/<id>/`，並顯示 `publishAllowed:false`。可用 `SOCIAL_OUTBOX_DIR` 調整輸出目錄。此目錄僅本機生成，記得加進本機忽略清單；不要將 API Token 寫入 Repo。

## 待串接正式發布時的規則

1. 只處理 `status=ready_for_local_agent`，且 `mode=live`、`safety.publish_permitted=true` 的項目。**此範例是 `mode=dry_run`、`publish_permitted=false`，不得發布。**
2. 發布每個平台前，使用 `(id, network)` 當成不可重用的去重鍵；維持 `pending -> sending -> published/needs_reconciliation` 的本地持久狀態。不能因 polling、重開機或 HTTP timeout 就重新發。
3. 送圖前必須使用通過 checksum 的高解析 JPG/PNG/WebP，並上傳至 Meta 可取得的公開 HTTPS 圖片 URL；不要直接把 GitHub 的 `.base64` 當作圖片網址。Facebook/Threads 相關權限、帳號對應需另行完成；本 repo P1 原有的 `/api/publish` 仍要求 `SOCIAL_ADMIN_KEY` 與 `confirmed:true`，沒有建立無審核的自動發布 API。
4. 一則文章的 FB 與 Threads 狀態分開管理。結果不明時進入 `needs_reconciliation`，先讀取平台實際紀錄並人工查核，嚴禁直接重發。
5. 新聞先保存官方原始來源與發布日期，不憑空補模型數據，保持 Crew Lab SI 原有短句、工程師乾幽默；不是每篇都推 Crew。

排程一天三篇與真正發布 Agent 尚未接線；本次先驗證單篇從 GitHub queue 到本地待發資料的路徑。
