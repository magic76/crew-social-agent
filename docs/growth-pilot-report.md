# Crew Growth 社群實驗週報

本工具只讀取既有的 `content/experiments/2026-11-05-to-18/metrics.csv`，不修改發文佇列、不抓 Meta 憑證、不呼叫發布 API，也不改變任何已授權貼文。

使用（需 Node.js 22 以上，在 repo 根目錄）：

```sh
node scripts/growth-pilot-report.mjs
node scripts/growth-pilot-report.mjs content/experiments/2026-11-05-to-18/metrics.csv > local-growth-report.md
node --test tests/growth-pilot-report.test.js
```

`metrics.csv` 的資料必須來自真實發布及平台 Insights。**每則平台貼文只記一行**；僅當 `status=published` 且 `published_at`、`remote_url` 均存在，才納入「已確認發文」。測量欄位須有 `data_source` 和 `observed_at`，否則留白並列為「待取得」；不要把缺值填 0。沒有數據時會輸出缺漏提醒，而不捏造成效。

報表只比較同平台、相近貼文齡的實際觀測值，顯示每篇觀測指標的範圍與有資料篇數。Facebook 與 Threads 是不同平台的觀測，不可相加為獨立故事數。CSV 不能證明 SEO、GA4 或 Cloudflare 的轉換率，這三項需要其他授權的數據匯出與同口徑分析。

建議在 2026-11-19 進行第一輪 14 天實驗回顧，並於 2026-11-26 或之後補查 7 天延遲觀測。此工具不安排排程，未獲發布授權的草稿不得計入已發布成果。
