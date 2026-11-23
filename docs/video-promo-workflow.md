# Koolo 產品宣傳片製作流程

本文件是 `magic76/crew-social-agent` 裡，**Koolo（原 Crew）產品宣傳短片**的製作理念與可重做步驟。社群選題與文案仍以 [editorial-guidelines.md](editorial-guidelines.md) 為準；本文件管的是影片怎麼做、畫面什麼能入鏡、以及如何交到 `content/video-handoffs/`。

它與 [Crew Video Lab](../video-lab/README.md) 的 HTML 科普動畫／教學短片是兩條路：科普短片走 HyperFrames 與 Crew Light 風格；產品宣傳片（痛點鉤子、角色開口打招呼、128 BPM 廣告節奏）走本文件與 [video-lab/examples/koolo-promo](../video-lab/examples/koolo-promo)。

參考成片與封面已在本 repo（[PR #6](https://github.com/magic76/crew-social-agent/pull/6) 合併進 main）：

- 影片：[`content/video-handoffs/assets/koolo-promo-greetings-v4.1.mp4`](https://raw.githubusercontent.com/magic76/crew-social-agent/main/content/video-handoffs/assets/koolo-promo-greetings-v4.1.mp4)
- 封面：[`content/video-handoffs/assets/koolo-promo-greetings-v4.1-cover.jpg`](https://raw.githubusercontent.com/magic76/crew-social-agent/main/content/video-handoffs/assets/koolo-promo-greetings-v4.1-cover.jpg)
- 發文稿：[`content/video-handoffs/2026-11-23-koolo-promo-greetings.json`](https://github.com/magic76/crew-social-agent/blob/main/content/video-handoffs/2026-11-23-koolo-promo-greetings.json)

含五支 I2V 原片與成品 MP4 的完整工具包，另見獨立的 `koolo-promo-video-kit.zip`（不把大型中間檔提交進 Git）。本目錄腳本與相對路徑與工具包根目錄相同。


本文件說明如何從頭重做一支與 **v4.1** 同規格的 Koolo 產品宣傳短片。預設你有 Linux shell、`ffmpeg`／`ffprobe`、Python 3.10+、Node 22+，以及瀏覽器（Chrome 或 Chromium）。不必依賴任何專有的「一鍵生影片」工具；角色開口片段可用任何 image-to-video 服務（例如 Grok Imagine、Kling、Runway、Veo）。

**兩種入口，相對路徑相同：**

| 入口 | 工作根目錄（下文簡稱「工具包根目錄」） |
| --- | --- |
| 獨立工具包 | 解壓 `koolo-promo-video-kit.zip` 後進入 `koolo-promo-video-kit/` |
| `magic76/crew-social-agent` 本 repo | `video-lab/examples/koolo-promo/`（成品 MP4／封面已在 `content/video-handoffs/assets/`，不必再提交大型二進位檔） |

所有指令都在工具包根目錄執行。腳本已改成相對路徑，可用環境變數 `KOLO_KIT_ROOT`、`CHROME_PATH`、`KOLO_BASE`（預設 `https://koolo.app`）覆寫。

---

## 1. 目標與成片規格（v4.1）

| 項目 | 規格 |
| --- | --- |
| 長度 | **28.00 秒**（840 幀） |
| 畫幅 | **1080×1920**（9:16 直式） |
| 幀率 | **30 fps** |
| 視訊 | H.264 High、`yuv420p`、CRF 18、`+faststart` |
| 音訊 | AAC LC、44.1 kHz、立體聲、約 192 kbps |
| 響度 | 解碼實測目標 **−14 LUFS**，True Peak **≤ −1.5 dBTP**，旁白底下配樂 duck 約 −12 dB |
| 節奏 | **128 BPM**（1 拍 = 0.46875 秒；4 拍 = 1.875 秒），硬切落在拍點 |
| 概念 | 「打個招呼就開始」：前 3 秒痛點鉤子 + 大字快閃 + 五位 AI 朋友開口打招呼 + 功能快切 + Logo CTA |
| 參考成片 | 工具包 `output/koolo-promo-v4.1.mp4`；repo 上為 [content/video-handoffs/assets/koolo-promo-greetings-v4.1.mp4](https://raw.githubusercontent.com/magic76/crew-social-agent/main/content/video-handoffs/assets/koolo-promo-greetings-v4.1.mp4) |

品牌：產品已從 Crew 更名為 **Koolo**，官網 `https://koolo.app`（`www.3sssi.com` 仍會導向同一站）。Logo 是帶 `oo` 臉的對話框 K。底部導覽維持「首頁、聊天、探索、學習、我的」。

---

## 2. 各版學到的教訓（務必先讀再動手）

使用者選了概念 1「打個招呼就開始」，並經過五輪才定稿。不要直接回到早期做法。

| 版本 | 做法 | 使用者回饋 | 教訓 |
| --- | --- | --- | --- |
| **v1** | 官網靜態截圖 + 緩慢推鏡，28 秒、無配音（後來只當畫面素材） | 後面幾輪被評為單調 | 單靠截圖平移，看起來像簡報，不像短影音廣告 |
| **v2** | 在 v1 畫面上直接疊台灣腔女聲旁白與五國問候 | 「感覺不是很順，畫面有了，聲音有了」 | 聲音與畫面若分開製作再硬疊，會像兩層沒黏在一起 |
| **v3 / v3.1** | 先錄連貫旁白，再依每句話重剪畫面、120 BPM、對拍點 | 比 v2 順，但仍「單調無趣」；使用者提到歐美短影音 | 對上口白還不夠，節奏與視覺能量要像廣告 |
| **v4** | 開頭 3 秒痛點大字、128 BPM 強節奏、動能字卡、角色 I2V 開口揮手 | 「好很多欸」 | **這是對的方向**：痛點鉤子 + 大字快閃 + 會動、會說話的角色 |
| **v4.1** | 畫面與 v4 完全相同，只換五段打招呼配音 | 使用者指出 v4「打招呼應該要不同人的語音，現在都一樣」 | 五個角色必須是**可分辨的性別與音色**（兩男三女），不能五個都用類似的女聲 |

因此重做時預設走 v4.1 管線：先定旁白與節拍，再剪畫面；角色要真的動、真的開口；問候語各用符合角色的聲音。

---

## 3. 畫面可與不可

### 不要入鏡

- `CREW LEARN`、舊名 **Crew Tree Lab**、`crew@3sssi.com`
- Gemini API Key 連結或設定畫面
- Cloudflare Turnstile **驗證碼**畫面（聊天／語音通話頁常被擋住；不要用 `still-after-zoe-cta.png`、`390-friend-live.png` 這類驗證畫面）
- 空白狀態：例如運勢頁底部「還沒有解讀紀錄」（`still-fortune.png` 請只取大約上方 66.5%，裁掉空白歷史）、故事頁空架
- 4–5 棵樹樹冠重疊的森林畫面
- Shorts Zoe 畫面頂部殘留的 `Teacher` 字樣（若用 `still-shorts-zoe-cta.png` 需裁掉頂欄）

### 剪接與事實

- **不要**在文字很多的畫面之間使用慢溶解（dissolve）。用硬切，或 ≤0.12 秒的閃白／短 swipe。
- **不要**發明對話泡泡或假的聊天 UI。聊天頁有驗證碼，錄不到真實對話；好處段改用官網真實截下的話題入口卡（`assets/cards/card-topic.png`、`card-voice.png`）。
- 若畫面點「跟某人聊這張」，**按鈕上的名字必須與接下來出現的朋友一致**（v4.1 全程留在 Finn：點的是「跟 Finn 聊這張」，不要跳到 Zoe）。
- 「Koolo」這個專有名詞不要交給中文語音唸，會被唸成「K-lo」（約 0.23 秒、少一個音節）。必須用 `en-US-JennyNeural` 插入，並確認聲學長度 ≥ 0.45 秒、兩個音節都清楚。

---

## 4. 環境與安裝

```bash
# 系統工具
sudo apt-get update
sudo apt-get install -y ffmpeg fonts-noto-cjk python3-venv python3-pip

# 瀏覽器：有 Google Chrome 或 Chromium 即可
# 腳本會依序嘗試 /usr/bin/google-chrome、chromium、chromium-browser
# 或 export CHROME_PATH=/path/to/chrome

# Python（建議獨立虛擬環境，系統 pip 可能受 PEP 668 限制）
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# 內含：edge-tts、Pillow、numpy、playwright-core

# 若要用腳本截官網（playwright-core 需指定瀏覽器；不必再裝一套 Chrome）
# 沒有系統 Chrome 時可改：npx --yes playwright install chromium
```

字型：腳本會找 Noto Sans CJK Bold／Black（`.ttc` 的 `index=3` 是繁體中文）。若路徑不同，把檔案路徑設成 `KOLO_CJK_FONT` 或安裝 `fonts-noto-cjk`。

---

## 5. 工具包目錄

```
koolo-promo-video-kit/          （或 video-lab/examples/koolo-promo/）
├── koolo-promo-video-for-muse.md   # 本說明（repo 內對應 docs/video-promo-workflow.md）
├── plan.md                         # v4 企劃（歷史絕對路徑見檔首對照）
├── vo_script_v4.md / vo_script_v41.md
├── requirements.txt
├── scripts/                        # 全部從工具包根目錄用 python scripts/... 執行
│   ├── kit_paths.py / paths.mjs    # 相對路徑
│   ├── shot.mjs / shot-followup.mjs / make_sheet.py / capture.mjs
│   ├── make_portraits.py
│   ├── inspect_and_upscale_clips.py
│   ├── gen_vo.py / gen_vo_greetings.py / prepare_vo_mix.py
│   ├── make_audio.py               # 128 BPM 配樂 + 音效 + duck + 響度
│   ├── compose.py                  # 1080×1920 30fps 逐幀畫面
│   ├── mux.sh / make_qa_sheet.py
├── assets/
│   ├── portraits/                  # 已墊成 9:16 的 zoe/noah/iris/max/yuna.png
│   ├── clips/                      # 五支 3 秒 I2V 原片（720×1280 @ 24fps）
│   ├── stills/                     # 成片用到的官網截圖（Shorts / 遊戲 / 探索 / 運勢）
│   ├── cards/                      # 真實話題入口卡
│   ├── wordmark.png / cover.jpg
├── output/
│   ├── koolo-promo-v4.1.mp4        # 參考成片（獨立工具包才附；repo 見 video-handoffs）
│   └── frames.jpg
└── work/                           # 執行時產生，不要提交 Git
```

獨立工具包已附參考成片、I2V 短片與肖像，可先只重跑配音／混音／合成來驗證環境。若要「完全從零做」，依下列步驟從頭跑；I2V 短片仍需你在外部工具產生後放進 `assets/clips/`。

---

## 6. 逐步管線

### 6.1 截官網畫面（Playwright，390×844 手機 + 1280 桌面）

官網：`https://koolo.app`。先跳過引導再拍，不要把驗證碼、Gemini Key、舊品牌字樣拍進程式要用的成片素材。

```bash
# 普查（手機 390×844、桌面 1280×800，deviceScaleFactor=2）
node scripts/shot.mjs
# 輸出：work/site/390-*.png、1280-*.png、notes.json

# 補拍首頁引導早期畫面、學習頁等（可選）
node scripts/shot-followup.mjs

# 聯絡圖
python scripts/make_sheet.py
# 輸出：work/site/sheet.jpg

# 成片用的高解析仍圖（推鏡、點擊「跟 Finn 聊這張」）當初用：
node scripts/capture.mjs
# 輸出：work/raw/ 與 work/stills_capture/
```

`shot.mjs` 會走這些路徑（皆相對 `https://koolo.app`）：

`/`、`/chat`、`/friend/live?id=zoe`（不要點開始，以免進驗證碼）、`/explore`、`/discover`、`/teacher/shorts`、`/learn`、`/crew-tree-lab/`（觀察用，**不要入鏡**）、`/me`、`/fortune`、`/me/voice-credits`、`/games`、`/teacher`、`/story`。

成片實際用到、且已放在 `assets/stills/` 的檔：`still-shorts.png`（Finn 網球照 +「跟 Finn 聊這張」，按鈕原始座標約 `(583, 1728)`）、`still-games.png`、`still-explore.png`、`still-explore-2.png`、`still-fortune.png`（合成時會再裁掉空白歷史）。話題卡在 `assets/cards/`。重新截圖後，請自行對過「可與不可」再覆寫 `assets/stills/`。

聊天與通話頁常有 Cloudflare 驗證碼，不要硬錄對話泡泡。

### 6.2 把官方立繪墊成 9:16 肖像

來源：產品 repo `magic76/magic76.github.io` 的 `assets/friends/crew_friend_{zoe,noah,iris,max,yuna}.webp`（1024×1024，無 UI 文字）。工具包已附處理好的 `assets/portraits/*.png`（1080×1920）。若要重做：

```bash
python scripts/make_portraits.py --friends-dir /path/to/magic76.github.io/assets/friends
# 輸出：assets/portraits/{zoe,noah,iris,max,yuna}.png 與 sheet.jpg
```

主體放在畫面中上，上下用原圖模糊延伸，邊緣羽化，畫面內不要有文字。

### 6.3 Image-to-video：讓角色揮手、開口（約 3 秒、9:16）

這一步**沒有內建模型**。用你能用的 I2V 工具，以 `assets/portraits/<name>.png` 為首幀。鎖住五官與服裝，畫面內不要出現任何文字，不要變形（morphing）。建議輸出 3.0 秒、9:16；能出 1080×1920、30 fps 最好，較低解析（例如 720×1280、24 fps）也可以，後面會用 Lanczos 放大。

**各角色提示（一行一則，與 v4 實際使用相同）：**

- **Zoe（3.0 s）** — She keeps this exact face and cream knit sweater, smiles warmer, tilts her head slightly, lifts one hand in a small friendly wave, and clearly mouths “Hi!”, soft warm indoor lamp light, subtle handheld camera, natural blink, no text, no morphing.
- **Noah（3.0 s）** — He keeps this exact face and light sweater, unclasps his hands just a little, leans a touch toward camera, smiles softly and clearly mouths “こんにちは”, quiet daylight from the window, subtle handheld camera, natural blink, no text, no morphing.
- **Iris（3.0 s）** — She keeps this exact face, paint-splattered apron and studio, gives a playful chin dip, raises the paintbrush in a quick hello, and clearly mouths “Hola”, bright workshop daylight, subtle handheld camera, natural blink, no text, no morphing.
- **Max（3.0 s）** — He keeps this exact face, green tee and backpack, flashes a bigger grin, gives a short nod and a small wave with his free hand, and clearly mouths “Bonjour”, crisp mountain daylight, subtle handheld camera, natural blink, no text, no morphing.
- **Yuna（3.0 s）** — She keeps this exact face, long dark hair and cream sweater, glances back over her shoulder a bit more, smiles, and clearly mouths “안녕”, soft living-room daylight, subtle handheld camera, natural blink, no text, no morphing.

把檔案存成 `assets/clips/{zoe,noah,iris,max,yuna}.mp4`。接著**先檢查再裁切**，不要整段 3 秒都用：

```bash
# 每 0.25 秒抽一格、做聯絡圖；再依預設乾淨視窗放大到 1080×1920 30fps
python scripts/inspect_and_upscale_clips.py
# 先看 work/clip_inspect/inspect-<name>.jpg
# 有變形、五官崩壞、手指糊掉，就不要用該段，改裁乾淨視窗或退回肖像推鏡
```

抽幀時必須 `ffmpeg -map 0:v:0`：這些 mp4 常有一條 MJPEG 縮圖軌 `0:v:1`，不指定的話可能抽到縮圖。

v4.1 採用的乾淨視窗（口型／揮手發生處，避開後段瑕疵）：

| 角色 | 採用區間 | 長度 | 注意 |
| --- | --- | --- | --- |
| Zoe | 0.65–2.53 s | 1.875 s（4 拍） | `0.95s` 張口 Hi!，`1.75s` 起揮手 |
| Noah | 0.50–2.38 s | 1.875 s | `0.72–1.55s` 口型 |
| Iris | 0.21–1.62 s | 1.406 s（3 拍） | **1.71s 之後畫筆會擋臉，2.25s 筆頭變形，必須提前切** |
| Max | 0.48–2.36 s | 1.875 s | **2.50s 之後下緣會溶成雙臂殘影，必須提前切** |
| Yuna | 0.75–2.63 s | 1.875 s | `0.95–1.55s` 開口 |

若你產出新短片，先看聯絡圖再覆寫視窗，例如：

```bash
python scripts/inspect_and_upscale_clips.py --inspect-only
python scripts/inspect_and_upscale_clips.py --windows 'zoe=0.60,1.92:iris=0.20,1.50'
# 放大結果：work/up_clips/<name>/f0001.png …
```

某一支若整段都變形，不要硬用：改以 `assets/portraits/<name>.png` 做短推鏡，並在回報裡註明哪一支、為什麼。

### 6.4 配音（edge-tts）

旁白用語：有衝勁的台灣腔女聲。`zh-TW-HsiaoChenNeural` 速率約 +6%～+13%，音高略升。問候語必須分人、分語言、分音色（這是 v4.1 的核心修正）。

```bash
python scripts/gen_vo.py              # 旁白各句 + 來／Koolo／免費開始，並拼接 CTA
python scripts/gen_vo_greetings.py    # v4.1 五段打招呼
python scripts/prepare_vo_mix.py      # 組出 work/vo_mix/（旁白 + 新問候）
```

輸出在 `work/vo/`、`work/vo_v41/`、`work/vo_mix/`，含 `*_trim.wav` 與 WordBoundary 時間。

**旁白與 CTA（HsiaoChen，除非另註）：**

| 句 id | 文字 | 語音 | 速率 / 音高 |
| --- | --- | --- | --- |
| 01a-hook | 背了十年單字， | zh-TW-HsiaoChenNeural | +6% / +2Hz |
| 01b-hook | 還是不敢開口？ | 同上 | +7% / +5Hz |
| 02-pain | 別再一個人練習了！ | 同上 | +11% / +4Hz |
| 03-start | 打個招呼，就開始！ | 同上 | +13% / +4Hz |
| 04-shorts | 看到喜歡的，直接跟朋友聊！ | 同上 | +11% / +4Hz |
| 05-nopressure | 不必準備話題，不考試，也不強迫糾錯。 | 同上 | +12% / +3Hz |
| 06-play | 玩遊戲、讀故事、看運勢，一起玩著學語言！ | 同上 | +11% / +4Hz |
| 07a-lai | 來 | 同上 | +8% / +3Hz |
| **07b-koolo** | **Koolo** | **en-US-JennyNeural** | **−6% / +4Hz**（兩個音節，勿改回中文聲） |
| 07c-rest | 打個招呼，免費開始！ | HsiaoChen | +9% / +4Hz |

`gen_vo.py` 會把「來」+ Jenny「Koolo」+「打個招呼，免費開始！」接成 `07-cta_trim.wav`。請用 WordBoundary 或 RMS 確認「Koolo」聲學長度 ≥ 0.45 秒。

**打招呼（v4.1，對齊張口瞬間）：**

| 角色 | 語句 | 語音 | 速率 / 音高 | 設計 |
| --- | --- | --- | --- | --- |
| Zoe | Hi! | `en-US-AnaNeural` | +8% / +4Hz | 年輕明亮美式女聲，**不要用 Jenny**，以免和 CTA「Koolo」撞聲 |
| Noah | こんにちは！ | `ja-JP-KeitaNeural` | +2% / −2Hz | 男性、沉穩、稍慢稍低 |
| Iris | ¡Hola! | `es-ES-ElviraNeural` | +14% / +8Hz | 女性、俏皮偏亮（西班牙腔） |
| Max | Bonjour ! | `fr-FR-HenriNeural` | +14% / +5Hz | 男性、有精神、偏快 |
| Yuna | 안녕! | `ko-KR-SunHiNeural` | +8% / +10Hz | 女性、柔和，音高略升 |

### 6.5 配樂、音效、混音、響度

全新 128 BPM 合成床帶（不要用有版權的流行歌）：開場 0–1.88 秒幾乎只有擊拍，1.88 秒鼓點與低音進來，角色段加旋律，15 秒鼓加厚，23.5 秒揚起，27–28 秒收在主音和弦。音效：字卡撞擊、轉場 whoosh、問候 pop、按鈕 tap、Logo chime（對準 Jenny 唸出 Koolo 的時間，約 24.82 秒）。

```bash
python scripts/make_audio.py
# 讀取 work/vo_mix/ 的 trim wav（放置時間見第 7 節）
# 輸出：work/audio/mix_raw_v41.wav、work/audio/mix_norm_v41.wav
```

響度做法：先量 raw 的綜合響度，線性增益到約 −14 LUFS，再經溫和 limiter（不要用會「喘氣」的 `loudnorm` 動態壓縮當主手段）：

```text
aresample=192000,volume=<gain>dB,alimiter=level_in=1:level_out=1:limit=0.79:attack=5:release=80:level=false,aresample=44100
```

目標：I = −14.0 LUFS，True Peak ≤ −1.5 dBTP，不可削波。旁白出現時配樂約 −12 dB duck。

### 6.6 合成畫面

```bash
python scripts/compose.py
# 讀取 assets/portraits、work/up_clips、assets/stills、assets/cards、assets/wordmark.png
# 輸出：work/seq/f0000.png … f0839.png（840 張，1080×1920）
```

要點：前 3 秒痛點大字要夠大、夠清楚；動能字卡用縮放彈出／逐詞出現，顏色取自 Koolo 色盤 `#153A35`、`#55B68D`、`#FF9678`；硬切對拍點；短暫縮放衝擊與輕微震動／閃白；Finn 按鈕在約 15.92 秒出現 tap 波紋；結尾 wordmark 在 Jenny 唸「Koolo」時眨眼（約 24.82 秒）。

### 6.7 封裝 MP4

```bash
bash scripts/mux.sh
# 預設：work/seq + work/audio/mix_norm_v41.wav → output/koolo-promo-v4.1.mp4
# 若畫面與 v4 完全相同、只換音軌，可改：
# ffmpeg -y -i output/koolo-promo-v4.1.mp4 -i work/audio/mix_norm_v41.wav \
#   -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 44100 -movflags +faststart -shortest out.mp4
```

### 6.8 品管（自己做完再交人看）

```bash
python scripts/make_qa_sheet.py
# output/frames.jpg（時間戳 + 字卡對位）
# output/cuts_strip.jpg（拍點切換前後成對畫面）

ffprobe -hide_banner output/koolo-promo-v4.1.mp4
ffmpeg -y -i output/koolo-promo-v4.1.mp4 -af "ebur128=peak=true" -f null - 2>&1 | tail -n 20
```

請逐項確認：

1. `ffprobe`：1080×1920、30 fps、28.00 s、H.264 High、AAC 44.1 kHz。
2. 解碼響度約 −14 LUFS，True Peak ≤ −1.5 dBTP。
3. `frames.jpg` 與旁白／字卡時間對得上（見第 7 節）。
4. `cuts_strip.jpg` 沒有溶解殘影、沒有切到半句字卡。
5. 五段問候對在張口附近，且聽得出五個不同的人。
6. 「Koolo」兩個音節完整。
7. 點擊的是「跟 Finn 聊這張」，沒有跳錯朋友。
8. 沒有第 3 節列出的禁入鏡內容。

若有能看影片的模型，把成片與 `frames.jpg` 一併交給它做視覺覆核，但**不要用它取代**上述指令檢查。

---

## 7. 時間軸（128 BPM，v4.1 對位）

問候 trim 檔的語音都從檔頭約 +0.025 秒開始，因此放置時間與 v4 相同，張口對位不變。

| 時間（秒） | 節拍 | 畫面與大字 | 口白實測區間 |
| --- | --- | --- | --- |
| 0.000–1.172 | 0–2.5 | 暗調 Zoe 特寫 + 震動：**背了 十年單字** | 0.025–1.125 背了十年單字， |
| 1.172–2.344 | 2.5–5 | 暗調 Noah 特寫：**還是 不敢開口？** | 1.200–2.240 還是不敢開口？ |
| 2.344–2.813 | 5–6 | 四格眼神快閃 + **？** + riser | （過門） |
| 2.813–4.219 | 6–9 | 深綠底：**別再 一個人練習了！** | 2.840–4.090 別再一個人練習了！ |
| 4.219–5.625 | 9–12 | Zoe 立繪：**打個招呼 就開始！** | 4.125–5.595 打個招呼，就開始！ |
| 5.625–7.500 | 12–16 | Zoe I2V + **Hi!**（Ana） | 5.925–6.235 Hi! |
| 7.500–9.375 | 16–20 | Noah I2V + **こんにちは！**（Keita） | 7.745–8.295 こんにちは！ |
| 9.375–10.781 | 20–23 | Iris I2V + **¡Hola!**（Elvira） | 10.055–10.385 ¡Hola! |
| 10.781–12.656 | 23–27 | Max I2V + **Bonjour !**（Henri） | 11.065–11.495 Bonjour ! |
| 12.656–14.531 | 27–31 | Yuna I2V + **안녕!**（SunHi） | 12.885–13.385 안녕! |
| 14.531–15.469 | 31–33 | Shorts Finn：**看到喜歡的** | 14.565–15.460 看到喜歡的， |
| 15.469–16.875 | 33–36 | 推向「跟 Finn 聊這張」，15.92s tap：**直接跟朋友聊！** | 15.685–16.805 直接跟朋友聊！ |
| 16.875–17.813 | 36–38 | 真實入口卡：**不必準備話題** | 16.845–17.863 不必準備話題， |
| 17.813–20.156 | 38–43 | 真實入口卡：**不考試**／**也不強迫糾錯** | 18.042–20.055 不考試，也不強迫糾錯。 |
| 20.156–21.094 | 43–45 | 遊戲列表：**玩遊戲** | 20.205–20.785 玩遊戲、 |
| 21.094–22.031 | 45–47 | 故事卡：**讀故事** | 21.021–21.607 讀故事、 |
| 22.031–22.969 | 47–49 | 運勢卡（已裁空白）：**看運勢** | 21.888–22.496 看運勢， |
| 22.969–24.375 | 49–52 | 探索總覽 + riser：**一起玩著學語言！** | 22.767–24.095 一起玩著學語言！ |
| 24.375–26.250 | 52–56 | Wordmark，24.82s 眨眼：**來 Koolo 打個招呼** | 24.425–26.180 來 + Jenny Koolo + 打個招呼 |
| 26.250–28.000 | 56–60 | **免費開始！** · koolo.app | 26.341–27.150 免費開始！ |

`make_audio.py` 內的 `VO_PLACEMENTS` 必須與上表一致。更細的 WordBoundary 見 `vo_script_v4.md`、`vo_script_v41.md`。

---

## 8. 發佈到 crew-social-agent

影片**不要**放進圖文 Queue（`content/queue/`）。使用獨立契約 `content/video-handoffs/`。

參考已合併的成品（[PR #6](https://github.com/magic76/crew-social-agent/pull/6)）與現行稿：

- 交接 JSON：`content/video-handoffs/2026-11-23-koolo-promo-greetings.json`
- 影片：`content/video-handoffs/assets/koolo-promo-greetings-v4.1.mp4`
- 封面：`content/video-handoffs/assets/koolo-promo-greetings-v4.1-cover.jpg`
- 下載（public raw）：
  - https://raw.githubusercontent.com/magic76/crew-social-agent/main/content/video-handoffs/assets/koolo-promo-greetings-v4.1.mp4
  - https://raw.githubusercontent.com/magic76/crew-social-agent/main/content/video-handoffs/assets/koolo-promo-greetings-v4.1-cover.jpg

### 交接稿必要欄位

新稿複製上述 JSON 再改。重點：

| 欄位 | 意義 |
| --- | --- |
| `id` | 穩定唯一，例如 `crew-video-YYYY-MM-DD-<slug>` |
| `status` | 草稿請用 `draft_handoff_only`（**不會**自動升級成可發）。授權後才改 `ready_for_video_publisher` |
| `publish_permitted` | 草稿為 `false`；立洋明確授權後才是 `true` |
| `schedule.date` / `time` / `timezone` | 台北時間，建議時段 19:00 或 21:00；每天實際發布以 2–3 篇為上限，見編輯準則 |
| `media.path` / `public_url` / `sha256` / `size_bytes` / 寬高 / fps / 秒數 | publisher 會解析 MP4 並核對 SHA 與公開 URL |
| `posts.*.text` 與 `requestId` | Facebook 與 Threads 正文在粉專觸及起來之前必須相同；各平台固定 UUID，發布後不要改 |
| `first_replies` | 產品連結只放首則留言（例如「免費開始：https://koolo.app」），**不要放正文** |

安全預設：本機需 `SOCIAL_AGENT_MODE=live`，加上 `status=ready_for_video_publisher`、`publish_permitted=true`、排程已到、憑證有效，才會發。自動發文只支援 **Facebook Page Reels** 與 **Threads VIDEO**。Instagram Reels、YouTube Shorts、TikTok 要人工另外發，可用同一張封面。

注意：現行 local publisher **不會自動派送** `first_replies`。主文成功後必須人工補上 koolo.app 那則留言。不要把影片靜默降級成圖文或純文字。文案要符合 `docs/editorial-guidelines.md`（第一人稱、正文不放網址、產品提及每週額度、結尾是真的問題）。通過編輯審核不等於發布授權。

驗證：

```bash
# 在 crew-social-agent 根目錄
node scripts/check-video-handoffs.mjs
```

---

## 9. 已知妥協（重做時請一併交代）

- Iris、Max 的 I2V 後段有瑕疵，已提前裁切；不要為了湊滿 2.00 秒而用到變形畫面。
- 聊天／通話頁有驗證碼，成片沒有真實對話泡泡，改用官方話題入口卡快切。
- 角色短片若從 720p 放大到 1080p，近看會比原生靜態圖柔一點，運動中通常可接受。
- 不要修改或覆寫歷史 v1／v2／v3 成片檔來「節省空間」；新版本另存。

做完請回報：成片路徑、時間軸是否有改、每支 I2V 的檢查結論、以及任何妥協。

---

## 10. Zoe 介紹片管線（Flow 8 秒短片，2026-11-23 驗證）

這是 v4.1 之外的第二條管線：Google Flow 生 8 秒介紹片，給一位 AI 朋友自我介紹加網站導流。2026-11-23 以 Zoe 驗證通過，成片 v7 為目前版本。

### 10.1 生片

- Flow 專案：https://flow.google.com/project/2b62b90f-2be6-41a4-b8ca-260ace0e3d0b，帳號 shanliyoung@gmail.com（PRO）。
- Veo 3.1 Fast：每支 20 點、只能 8 秒、720p 9:16。每月 1000 點（2026-12-21 17:15 重設）＋每天 50 點。Veo 3.1 家族 2026-12-05 退役。
- 用 Ingredients to Video，拿網站上該朋友的頭像當角色素材，臉會跟頭像一致。不要用肖像當首幀，會被知名人士政策擋下（20 點據稱會退）。
- 一支只講一個主張。結構：中文鉤子 0–3 秒＋英文介紹 3.1–7.5 秒。鉤子例：「背了十年單字，還是不敢開口？」；介紹例：「Hi, I'm Zoe! On Koolo, just say hi — free for five minutes!」（完整句自然語速 6.56 秒塞不進 8 秒片，口白版須縮短，完整意思留字卡上）。

### 10.2 後製

- 字卡與字幕 pill 用 PIL 畫（Noto Sans CJK Bold），再用 ffmpeg filter graph 疊上：hook 卡 0.15–1.5 秒與 1.5–3.0 秒、字幕 pill、左上 Koolo wordmark（3.0 秒起）、緩推 zoom。
- 每支的字幕燒錄位置都不一樣，蓋 pill 前先量該支的位置。pill 必須完全不透明，否則燒錄的字會透出來。
- 疊圖用 `enable='between(t,...)'` 硬切，不要用 `fade … alpha=1`，靜態 PNG 會直接隱形。
- 白閃（3.00–3.12 秒全白）是可選轉場，LY 覺得礙眼就拿掉，改硬切。無白閃版用不含 white overlay 的 filter graph。

### 10.3 配音

- 時間窗：鉤子 0.15–3.0 秒，介紹 3.10–7.55 秒。混音時不用 `-shortest`，會把影片截到音訊長度。
- edge-tts 首選，但直連在 Muse 沙箱會被出口代理擋（WSS 握手 101）。繞路：公開 HF Space `innoai/Edge-TTS-Text-to-Speech`，用 gradio_client 呼叫 `predict(text, voice, rate, pitch, api_name="/tts_interface")`，voice 標籤照 Space 列的寫，例如 `zh-TW-HsiaoChenNeural - zh-TW (Female)`。rate／pitch 是百分比，實測 rate 0→3.60 秒、50→2.42 秒。注意 `no_proxy` 裡的中括號 IPv6 會讓 httpx 解析失敗，呼叫前先去掉含 `[`、`]` 的項目。此 Space 是第三方公開服務，可能休眠、排隊或下線，文字不要含敏感內容。
- ChatGPT 的程式沙箱完全沒有對外網路，跑不了 edge-tts。Grok 可以（v4.1 配音就是這樣做的），LY 本機或 Colab 也可以，命令見 Muse 工作區 `work/VO_COMMANDS.md`。
- 備援是本機 Piper TTS，免費免帳號，中文只有陸腔（zh_CN-huayan-medium）、無台灣腔，英文 en_US-amy-medium。語速用 `--length-scale` 調。
- 其他方案見 2026-11-23 查價：MeloTTS（Cloudflare，需 API token 走 REST）、Google Cloud TTS（標準音每月免費 100 萬字元）、Azure 語音（每月免費 50 萬字元）、MiniMax／Fish Audio（中文最好聽，按量計費，一支片成本幾乎為零）。

### 10.4 混音與驗收

- 混音後跑兩次 loudnorm，目標 −14 LUFS、True Peak −1.5 dBTP；口白峰值通常卡在 −15 LUFS 左右，可接受。
- 驗收：音訊 RMS 每 0.25 秒一切片，確認鉤子在 0.15–3.0 秒、介紹在 3.10–7.55 秒、7.5 秒後靜音；看 0.8 秒、3.05 秒、5.0 秒三幀，確認臉像、wordmark、字幕 pill，並確認 3.05 秒幀無白閃（平均亮度約 120，不是 250）。
- 成片一律草稿，不自行發布。

### 10.5 版本紀錄

| 版本 | 配音 | 備註 |
| --- | --- | --- |
| v2 | Veo 原音 | 臉是仿生成品，LY 說臉不像、字幕錯 |
| v3／v3.1 | Veo 原音 | Ingredients 用網站頭像，臉對了；v3.1 修掉尾部多餘「嗨」 |
| v4 | Piper 全配 | 陸腔中文＋英文 Amy，LY 說好了 |
| v4-en | Piper 全英文 | LY 定為英文版 |
| v5 | edge-tts 全配 | HsiaoChen＋Ana，英文介紹 +55% 偏快 |
| v6 | 混合 | 中文 edge-tts＋英文 Piper，兩段都不加速 |
| v7 | 混合、無白閃 | 同 v6，拿掉 3 秒白閃，目前版本 |
