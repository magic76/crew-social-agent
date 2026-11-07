# Crew Lab SI 每日研究與編輯簡報｜2026-11-07

## 研究精選

查閱最近 24–72 小時的一手來源，收錄 4 項。公司自家測試或使用資料均標明範圍，不把基準結果等同真實部署成效。

1. **Anthropic：Agent memory 的組成與維護成本**（2026-11-06）  
   官方文章拆解 transcript、memory notes 與驗證／整理流程；一組 Pokémon 對照裡，Sonnet 3.7 的一次 run 累積 413 個檔案，約第 10,000 步附近花 17 步整理記憶、沒有遊戲動作；另一個 Fable 5 run 有 10 個檔案。各一個 run，不能推出少檔案一定較好。工程啟發：量測記憶是否改變後續選擇，並計入維護成本。  
   [原始來源](https://www.anthropic.com/research/components-of-agent-memory)

2. **OpenAI：BioBasicsBench 日常濕實驗室基準**（2026-11-06）  
   涵蓋 100 項例行實驗室任務、18,500 筆模型結果；文章舉出一個菌落計數輸出約多算 12% 的案例。這是 OpenAI 自家基準和單一例子，不等於真實實驗室整體表現。工程啟發：高風險工具任務要看可核對的中間步驟，不只看最後答案。  
   [原始來源](https://openai.com/index/measuring-how-ai-agents-handle-everyday-wet-lab-science/)

3. **Microsoft Research：PDD Kit 的規格、證明與測試**（2026-11-05）  
   將意圖轉成 Verus 規格，用形式證明檢查規格能涵蓋的程式，再以測試補足證明無法覆蓋的部分。示範來自約 5,000 行 Rust Pet Store，但文章焦點是登入邏輯；測試只涵蓋執行過的輸入，第三方相依仍是信任邊界。工程啟發：規格本身是驗證邊界，不能把局部證明說成整個 App 正確。  
   [原始來源](https://www.microsoft.com/en-us/research/blog/formally-verifying-agent-written-full-stack-web-apps-with-pdd-kit/)

4. **Anthropic：科研人員如何使用 Claude**（2026-11-05）  
   報告分析 207,049 個聚合工作階段，稱資料分析約占 Claude 科研工作階段三分之一、Claude Code 接近一半。此為 Anthropic 使用資料。此題已在 2026-11-06 Queue 使用，今天只列研究、不重複發文。  
   [原始來源](https://www.anthropic.com/research/how-researchers-use-claude)

## 六個待審社群主題

台北時間 10:00、12:00、14:00、16:00、19:00、21:00，分別安排 Crew Souls Explore、Pocket API discovery、首頁 discovery line、Agent memory、BioBasicsBench、PDD Kit。每個主題都有獨立 Facebook／Threads 文案與一張 1254×1254 原創插畫；插畫不當作真實介面、測試畫面或研究數據。

- Crew Souls：PR #535 已合併；測試有更新，但 CI 仍 pending，沒有 live 部署確認。
- Pocket extension：API 掃描只列候選；15 秒擷取及 5 分鐘頁面除錯各有明確限制。Commit 不代表 runtime 測試已通過。
- 首頁提示：句子先完整呈現，打字動畫延後；測試檔存在，但沒有 CI 通過證據。
- Agent memory：單次 Pokémon 比較顯示整理成本可能佔用任務步數，不能推廣成普遍定律。
- BioBasicsBench：公司自家 benchmark 的單一計數案例，不能代表所有實驗室使用情況。
- PDD Kit：說明形式證明、測試、規格與第三方依賴各自的邊界。

## 影片狀態

今天沒有建立第二支影片。11/06 Agile Deliberation MP4 已存在（1080×1920、30 fps、30.507 秒），旁白 WAV 為 27.72 秒；現有 handoff 仍記錄「人工聽音與逐字字幕 QA 未核實」。目前環境沒有可用的本機影片 renderer、TTS Worker 執行狀態或音訊播放驗收能力；影片 Publisher 也尚未派送 first_replies。不能把舊片標成 ready，也不重送已成功的 TTS。下一步需在可聽音的環境逐字核對 13 段字幕，並處理影片 Publisher 的來源回覆能力與單篇發布授權，再決定是否排程。

## 發布與成效資料

- 六篇都是 `status=draft`、`mode=dry_run`、`publish_permitted=false`；未呼叫社群發布 API。
- Local Publisher、本機 live 模式與平台憑證在此執行環境無法確認，發布狀態標為未知／未執行。
- 14 天 metrics.csv 目前只有欄位標題，沒有核實發布或成效資料；本日不新增推測數據，後續觀察標記 `manual_data_needed`。
