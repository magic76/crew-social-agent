# Grok × ChatGPT｜AI 監工工作流影片

正式影片規格：1080×1920、30fps、59s、繁體中文，共 7 個鏡頭。

## 目前內容
- `story.json`：旁白、鏡頭、時間與來源。
- `index.html`：可由 Crew Video Lab / HyperFrames 渲染的 GSAP 動畫；流程圖為示意動畫，不是 Grok 實機操作錄影。
- `voice-jobs.json`：已加入 GitHub main TTS 佇列的 7 個 Gemini Job IDs；**未取得並驗證 WAV 前不代表配音完成**。
- `captions.srt`：按照設計鏡頭產生的初版字幕，實際配音要重新校時。
- `social-draft.md`：FB / Threads 文案與第一則回覆。

## 本地 Agent 製作與驗收
1. `node scripts/video-lab.mjs validate video-lab/work/grok-ai-pm-20261101`
2. `node scripts/video-lab.mjs check video-lab/work/grok-ai-pm-20261101`
3. `node scripts/video-lab.mjs render video-lab/work/grok-ai-pm-20261101`（只產靜音版 `output.mp4`）。
4. 依 `voice-jobs.json` 從 `result_url_prefix + id` 讀取每筆 WAV。200 才是實際音訊；202 尚未完成、404/failed 應停止驗收。不能用 eSpeak 代替正式華語配音。
5. 以 ffprobe 測量 7 段 WAV；若超過 scene 時間，調整 story / HTML 時長並重新渲染，不得截斷配音。
6. 按 scene.start 將 WAV 混成 AAC，搭配已校時且燒錄的繁體中文 SRT 輸出 MP4。
7. ffprobe 確認 1080×1920、30fps、H.264 與 AAC；抽查每個場景關鍵畫面、字體、字幕和音畫同步。
8. 上傳最終 MP4 到公開 HTTPS 媒體來源，記錄真實 URL、bytes 和 SHA256，更新 `content/video-handoffs/grok-ai-pm-crew-magic-20261101.json`。
9. **使用者同意正式發文後**，本地 Agent 才能設 `status=ready_for_video_publisher`、`publish_permitted=true`，再使用 `social-draft.md` 發到 FB / Threads。記錄各平台的 requestId、發布結果，避免重送。

## 情緒配音
開場好奇、流程段落俐落、成果段落有成就感、結尾篤定。當前 Worker 把 Gemini TTS 固定為自然溫暖口吻，並不支援每段獨立調整 speech_metadata.style；`voice-jobs.json` 的 desired_emotion 是製作提示，不是已套用的語音效果。若需更精確表達，可用 repo 的 `scripts/video-voice.mjs` 與安全保存的 Gemini Key，按場景設定 style 後重配。

本影片的發布檔保持 draft_handoff_only / publish_permitted=false；未完成 QA 不可推到 live。
