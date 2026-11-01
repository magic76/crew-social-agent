# 我怎麼利用 Grok，管理 ChatGPT 開發程式

這支片依使用者描述的實際工作流製作：Grok 拆任務並檢查 ChatGPT 的程式、測試與畫面；出現問題時再交回修正。Crew Magic 是作品案例。流程圖和島嶼插畫都是示意動畫，沒有假裝成 Grok／ChatGPT 操作錄影。

## 成品規格

- 最終影片：`content/video-handoffs/assets/grok-ai-pm-crew-magic-20261101.mp4`
- 1080×1920、30 FPS、H.264 + AAC、繁體中文字幕燒錄
- 依七段真實 WAV 長度和 1.5 秒段落停頓校時；成片約 50.77 秒
- QA 結果：`qa.json`
- 社群貼文草稿：`social-draft.md`
- 發布交接：`content/video-handoffs/grok-ai-pm-crew-magic-20261101.json`

## 配音與字幕

七段語音均由 Crew Web TTS Worker 產生並以 HTTP 200 下載驗證；原 WAV 放在 `assets/voice/scene1.wav` 至 `scene7.wav`。模型為 `gemini-3.8-flash-tts`，Kore 聲線，台灣華語。每段字稿與已提交佇列逐字核對，`captions.srt` 以 ffprobe 量出的每段長度定時。相同逐字稿及時間也由 HTML 動畫依真實旁白時間顯示，字幕直接隨影格合成進 MP4。

Worker 使用固定的自然、溫暖、平穩台灣華語風格，佇列不支援逐段指定情緒。`voice-jobs.json` 的情緒標籤是剪輯方向，並非已套用的模型參數；配音保留自然節奏，沒有疊加誇張變聲。

## 重新校時與渲染

在 repo 根目錄執行：

~~~sh
python3 video-lab/work/grok-ai-pm-20261101/scripts/retime-from-voice.py
bash video-lab/work/grok-ai-pm-20261101/scripts/render-final.sh
~~~

校時程式會驗證七個本地 WAV 的 RIFF／PCM 格式、量測音長、比對佇列和旁白文字，接著更新分鏡、音訊時間、SRT、畫面字幕和 TTS 結果紀錄。渲染指令會跑 Video Lab 的 `validate`、`check`、HyperFrames render，再以 FFmpeg 正規化旁白音量並輸出 H.264/AAC MP4。

中文字型子集位於 `assets/fonts/CrewTC-video-subset.ttf`，授權見 `assets/OFL.txt`。GSAP 以本地檔載入；沒有外部音樂或素材。

## 發布狀態

交接檔保留 `status=draft_handoff_only`、`publish_permitted=false`、`ready_for_video_publisher=false`。本次沒有呼叫 Meta API；使用者確認影片後，才由本地 Agent 解鎖發布。
