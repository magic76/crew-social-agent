# Crew Lab SI 每日研究簡報｜2026-11-09

查證時間：2026-11-09 07:00–07:24（Asia/Taipei）  
範圍：最近 24–72 小時的一手 AI／Agent 來源，另與最近三日 Crew Queue／review 去重。

## 新近一手來源

1. **Patronus AI｜Few Word Do Trick**  
   發布日期：2026-11-07  
   https://www.patronus.ai/blog/few-word-do-trick  
   研究比較 12 個開放模型在 20 項 coding-agent 任務的表現。新版推理文字平均少 41% filler，解題數由 58/60 升至 60/60；但三個模型家族中只有一個降低推理 token，DeepSeek 新版約為前代 2.5 倍。限制：每項任務每模型只跑一次，且任務多為模型原本能解的題。可用角度是「文字變短不等於成本下降」，不能外推成普遍模型排名。

2. **Rush｜When an Agent Makes a Mistake Twice, We Make It a Check**  
   發布日期：2026-11-07  
   https://getrush.ai/blog/two-of-us-and-a-fleet-of-agents/  
   兩人團隊自述一年合併 11,040 個 PR，2026 年 10 月有 82% commit 帶 agent 簽名。雲端 reviewer 審查 259 個 PR，其中 101 次評論晚於 merge；32 個 PR 在 reviewer 最新判定仍需修改時先被合併。限制：單一團隊自述、沒有對照實驗。今日選為實用題，重點放在 merge gate，不把產量當品質證明。

3. **AWS｜Govern AI agent access with Okta Cross App Access and Amazon Bedrock AgentCore**  
   發布日期：2026-11-06  
   https://aws.amazon.com/blogs/machine-learning/govern-ai-agent-access-with-okta-cross-app-access-and-amazon-bedrock-agentcore-part-1/  
   AWS／Okta 範例中，管理員撤銷使用者對 agent 的指派後，新請求約一秒被拒絕；已發 token 最長五分鐘到期。限制：這是特定整合的測試，不是跨平台評測。可用角度是把 agent 權限綁定到「哪個 agent 代表哪位使用者」，並能快速撤銷。

4. **AWS｜Extend Claude Code to remote sessions on Amazon Bedrock AgentCore with security controls**  
   發布日期：2026-11-06  
   https://aws.amazon.com/blogs/machine-learning/extend-claude-code-to-remote-sessions-on-amazon-bedrock-agentcore-with-security-controls/  
   範例讓每項 Claude Code 任務在獨立 session 執行，再交回 GitHub PR 供人審查。文章明示不適合不受信任的 repo，因為 agent 會執行 repo 自己的命令。可用角度是「搬到雲端能隔離本機，不代表不可信程式碼安全」。

5. **Nous Research｜Introducing Arete-27B**  
   官方公告日期：2026-11-06；文章頁僅標 2026 年 11 月  
   https://nousresearch.com/arete  
   Nous 表示以約 5,280 萬 token 微調 Qwen3.8-27B，並公開評測提示、資料集與權重。限制：評測由 Nous 自行設計與報告，且使用 Grok 4.7 當裁判；不能把它寫成獨立驗證的普遍偏誤結論。

## 今日研究裁決

- 社群入選：Rush 的 agent 審查晚於 merge 案例。它有明確數字、流程風險與可帶走的做法。
- 暫緩：Patronus 題材有趣，但 20 題且單次執行，不適合寫成「更短反而一定更貴」。
- 暫緩：兩篇 AWS 均為供應商範例，可進研究庫，但今天 Crew 專案素材足夠。
- 暫緩：Arete-27B 的評測定義與裁判都需在文案中花較多篇幅交代，今天不硬塞。
- 額外核實的 Microsoft ARTEX 研究（2026-11-06）具一手威脅情報與具體防守做法，選為今天第二個非 Crew 題：  
  https://www.microsoft.com/en-us/security/blog/2026/11/06/artex-abuse-expands-as-cybercriminals-target-financial-sector/

## Crew 專案素材

- PR #567：首次進 Learn 時確認目標語言，12 種目標語言、11 種 UI locale，已合併。  
  https://github.com/magic76/magic76.github.io/pull/567
- PR #563：日文母語者學英文的課程、任務、暖身與 tutor 文字，已合併。  
  https://github.com/magic76/magic76.github.io/pull/563
- PR #561：有意義互動後才提示 PWA 安裝，7／14 天冷卻並以 appinstalled 判定成功，已合併。  
  https://github.com/magic76/magic76.github.io/pull/561
- PR #565：Fortune 結果頁收斂為一個 AI 深入解讀入口，已合併；不宣稱轉換率改善。  
  https://github.com/magic76/magic76.github.io/pull/565
- PR #568：PWA 快取／錯誤邊界修正已合併，但與 11/8 PWA 題接近，且真實故障根因未被畫面確認，今日暫緩。  
  https://github.com/magic76/magic76.github.io/pull/568
- 其餘 Crew Pocket、Crew Car、Crew Teacher、Pocket Game、LG TV Companion、Agent Harness、Mate 在本次日期窗沒有可核實的新 PR／commit 故事；不硬湊。

## 執行限制

- 本環境沒有本機 repo checkout；Publisher credentials、本機 journal、Meta／Threads 實際發布狀態均不能由 GitHub推定。
- 影片 retry 已有 WAV／MP4 metadata，但缺少可核實的實際聽音與逐字字幕同步 QA；不重送 TTS、不建立新影片 handoff。

