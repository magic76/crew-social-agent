# Crew Light v1

每日 Crew Lab SI Daily 科普影片使用此風格。既有歷史影片仍可原樣渲染。

## 視覺
1080×1920，30fps。米白 #F5F4F0，黑字 #171719；柔藍 #D8E8FF、淡紫 #E9DEFF、暖橘 #FFE3C8 光暈。主卡片白底，圓角 36–48px，柔陰影；不用螢幕錄影、假 UI 操作或品牌 logo。向量卡片只表達該段的一個概念，示意資料須標明。

吉祥物為 Crew Dot：黑色圓形身體、白色大眼睛、漂浮小手。mascot/ 提供 wave（招呼）、think（思考）、surprise（驚訝）、thumbs-up（比讚）四種透明 SVG/PNG；SVG 的 eye/hand 群組可用 GSAP 眨眼或揮手。

字幕：白色圓角膠囊＋低對比柔陰影，黑字，至少 44px。左右留 96px，下方至少 230px 安全距離，最多兩行。以短句分 cue；用實測語音對齊，不以平均字數估算冒充逐字校正。Noto Sans CJK TC；缺字必須重新生成字集或換完整授權字體，禁止無聲回退。

## 節奏
0–3 秒直接用一句反常識問題或驚人事實破題，不放片頭。接 3–4 段重點，每段一個視覺畫面；最後一句彩蛋或具體結論。一般成片 30–60 秒。

轉場 0.4–0.6 秒平移／縮放／淡入淡出，不硬切。以卡片逐一滑入、連線或核對呈現概念；每兩秒內必須有可見變化（眨眼、手勢、緩慢浮動），避免閃爍、無關裝飾。所有動畫是有限、可 seek 的 GSAP 絕對時間軸，禁止 setTimeout/random/CSS 無限動畫。

配音固定 Gemini Kore、台灣華語。自然、有精神的口語節奏；先縮短腳本，再測量 WAV 安排畫面，避免為湊長度放慢語音或插長空白。新配音沿用既有 video-voice CLI 或經授權 TTS 流程；本風格工具不寫任何 Queue。

## 使用
在新專案 story.json 寫入 narration、title、body、scenes、video，以及 audio（相對專案的 WAV 路徑）。可提供每段 captions:[{start,end,text}]，時間為該段相對秒數；正式成片務必校正 cue。

```
node scripts/video-lab.mjs style PROJECT
node scripts/video-lab.mjs validate PROJECT
node scripts/video-lab.mjs check PROJECT
node scripts/video-lab.mjs render PROJECT
```

style 只生成指定專案 index.html；已有檔案須先備份，工具預設拒絕覆寫。也可直接執行 node scripts/video-style.mjs PROJECT。保留原本 validate/check/preview/render，不改 Queue、handoff 或發布條件。渲染後沿用 FFmpeg loudnorm、AAC、faststart；必做 ffprobe、完整解碼及開中尾視覺檢查。

## 範例與限制
samples/ 重用 repo 已保存的 Gemini Kore 原始 WAV（28.08 秒），不重新生成、不降速；片長 30.2 秒。題材是既有合成企業測試腳本，不是新研究報導。音源與來源見 samples/credits.md。字幕沿用原稿分段，未經獨立聽寫核實，qa.json 如實標記；此為風格示範，不是已授權發布的 handoff。

字型輸入：`story.json` 必須提供 `font`（相對專案路徑），例如 `"font":"assets/CrewTC.otf"`；該字型必須覆蓋本支影片所有繁體中文字。產生器缺少此欄位即停止，不會偷偷沿用其他題材的子集字型。產生器將字型複製為專案內的 `assets/crew-font.otf`，渲染時不依賴外網。
