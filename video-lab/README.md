# Crew Video Lab — HTML 科普／教學影片製作

這套功能收在既有 magic76/crew-social-agent，但**不修改現有 FB/Threads 圖片或文字發文 API**。目的是讓任何 clone 此 repo 的 Agent 都能讀 Skill，以一致方式從議題查證一路做出短片。

## 入口與分工

- 通用路由：skills/crew-video-lab/SKILL.md
- 專科 Skills：research、storyboard、hyperframes、audio、qa、handoff；需 React 時可改用 remotion。
- 自動發現：AGENTS.md，.agents/skills/crew-video-lab/SKILL.md，.claude/skills/crew-video-lab/SKILL.md。
- 框架官方技能：在本地用 npx hyperframes skills update；Remotion 則用 npx skills add remotion-dev/skills。上游技能持續更新，本 repo 自有 Skills 不與之混淆。

## 立即驗證原始範例（Node.js 22+）

~~~sh
node scripts/video-lab.mjs validate video-lab/examples/permissions-101
node scripts/video-lab.mjs check video-lab/examples/permissions-101
node scripts/video-lab.mjs preview video-lab/examples/permissions-101
node scripts/video-lab.mjs render video-lab/examples/permissions-101
~~~

validate **不需要外網或額外安裝**。check、preview、render 需要本地安裝／能使用 HyperFrames、Chrome、FFmpeg（依版本而異），可先執行 npx hyperframes --help。若 CLI 不可執行，不要聲稱影片成功輸出。

## 做一支新影片

~~~sh
mkdir -p video-lab/work/<new-slug>
cp -R video-lab/examples/permissions-101/. video-lab/work/<new-slug>/
# 依 storyboard Skill 修改 story.json + index.html
node scripts/video-lab.mjs validate video-lab/work/<new-slug>
~~~

預設 1080×1920、30fps、24s、四個場景；範例主題「最小權限原則」，動畫採 HTML/CSS + seek-safe GSAP。範例**是靜音、無配音／無字幕的動畫原始專案**。需要旁白時，請依 audio Skill 生成有授權的配音資產、對齊節奏及字幕再 render。

### 產出
- 輸入：story.json、index.html、可選 assets/、sources.md／credits.md
- 輸出：output.mp4、qa.json、captions.srt（有旁白時）
- 無圖文占位稿進入正式發文 Queue；後續需另外接 VIDEO / Reels 發布 API

### 平台與品質
- IG/FB Reels/Threads 影片格式、大小、長度、處理狀態和 API 權限以部署當日官方文件為準。
- 使用者最終確認前不可用假下載連結、假 render 結果冒充影片。
- 社群配文可沿用使用者口吻：短、口語、適度工程師乾幽默；影片本身需重視知識正確性。
- Repo 的影片腳本不儲存 Token。不要將長期巨型 MP4 直接塞進 Git；可由另外一個媒體儲存服務承擔成品。

## 官方參考
- https://github.com/heygen-com/hyperframes
- https://hyperframes.app/docs/1-startup/2-quickstart
- https://github.com/remotion-dev/skills
- https://github.com/motion-canvas/motion-canvas

## 中文語音旁白（Gemini 3.8 TTS）

使用 Node 22+、FFmpeg/ffprobe。這個 CLI 以 \`story.json\` 的逐場景 \`narration\` 產生語音、測量實際長度、建立 UTF-8 SRT 時間軸，再將聲音混入已渲染的 MP4。配音超出場景時間時**會產生 retime-required.json 並停止，不會截斷語音**。它不需要複製 Gemini Key 到 Repo。

1. 先在本地渲染原版影片，例如 \`original.mp4\`，再指定給 \`--video=\`。
2. 在安全的本地環境設定 \`GEMINI_API_KEY\`（可透過忽略的 .env 使用 \`node --env-file=.env\`）。
3. 使用以下指令：

~~~sh
node scripts/video-voice.mjs video-lab/examples/permissions-101 --provider=gemini --voice=Kore --video=/absolute/path/original.mp4 --out=/absolute/path/narrated.mp4
~~~

- API model 預設 \`gemini-3.8-flash-tts\`；若想壓低成本可設定 \`--model=gemini-3.8-flash-lite-tts\`。目前依 Gemini 官方 Interactions API 實作；至少需取得該模型的 API 使用權。
- 會要求台灣華語語氣，但真正口音需以實際生成音檔試聽，請勿保證。
- 本地沒法呼叫 Gemini 時，可用 \`--provider=espeak\` 測試動態配音／字幕流程。eSpeak 是**機械合成聲**，不可假裝是 Gemini 成品；且需先安裝 \`espeak\`。
- \`generated-voice/scene-*.wav\`、\`generated-voice/narration.srt\`、\`narrated.mp4\` 是本地產物，不要提交至 Repo。
- 影片來源如果有背景音軌，會自動降低背景音量再混合；沒有背景音軌也能處理。
- MP4 會保留已渲染的畫面、加入 AAC 旁白及可切換的 SRT 字幕（MOV_TEXT 軌）。**嵌入字幕不代表每個社群播放器都會顯示字幕**；正式 Reels/Threads 版本仍須另做燒錄字幕的 QA。

官方說明：https://ai.google.dev/gemini-api/docs/speech-generation

