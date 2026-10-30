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
