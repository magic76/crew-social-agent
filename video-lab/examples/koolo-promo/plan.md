> 路徑對照：本檔是 v4 企劃原文，其中 `/workspace/koolo-promo/...` 是當初製作時的絕對路徑。在本工具包裡請改用相對路徑：`portraits/` → `assets/portraits/`，`clips/` → `assets/clips/`，截圖 → `assets/stills/`，成品 → `output/koolo-promo-v4.1.mp4`。完整操作步驟見 `koolo-promo-video-for-muse.md`。

# Koolo 宣傳片 v4 — 企劃（尚未成片）

風格：歐美短影音廣告（TikTok / Reels ad）。痛點開頭 + 大字快閃 + 強節拍 + 角色開口說話。  
長度 **28.00 秒**、9:16、1080×1920、30 fps。  
節拍 **128 BPM**（1 拍 = 0.46875 s；2 拍 ≈ 0.94 s；4 拍 = 1.875 s）。畫面幾乎每 1–2 秒換一次，切在拍點上。  
此檔只做準備，**不渲染成片**。角色短片由人工用 image-to-video 生成後，再交給後續剪接。

## 語氣與規則

- 語氣：有衝勁、好玩、不怕大聲。旁白用 `zh-TW-HsiaoChenNeural`，rate 約 +8%～+12%，比 v3 更有精神。
- 「Koolo」專有名詞繼續用 `en-US-JennyNeural` 插入，避免被中文語音唸成「K-lo」。
- 畫面字幕 = 當下口白或更短的快閃大字；角色說話時以大字疊上該句問候語。
- 避免入鏡：CREW LEARN、Crew Tree Lab、crew@3sssi.com、Gemini Key、驗證碼、空白狀態、4–5 棵樹樹冠重疊、`Teacher` 殘字。
- 聊天頁仍有 Turnstile，不要用對話泡泡假 UI。好處段用真實截圖快切即可，不要再慢慢推鏡。

## 角色肖像（已備好，供 I2V 使用）

來源：官網正式立繪 `assets/friends/crew_friend_*.webp`（1024×1024，無 UI 文字）。  
已裁切／鋪成 9:16，1080×1920 PNG：主體置於畫面上中，上下以原圖模糊背景延伸，無文字。

| 角色 | 檔案 | 解析度 | 問候（2.00 s 鏡位，請產出 3.0 s 以便修剪） |
| --- | --- | --- | --- |
| Zoe | `/workspace/koolo-promo/v4/portraits/zoe.png` | 1080×1920 | Hi! |
| Noah | `/workspace/koolo-promo/v4/portraits/noah.png` | 1080×1920 | こんにちは！ |
| Iris | `/workspace/koolo-promo/v4/portraits/iris.png` | 1080×1920 | ¡Hola! |
| Max | `/workspace/koolo-promo/v4/portraits/max.png` | 1080×1920 | Bonjour ! |
| Yuna | `/workspace/koolo-promo/v4/portraits/yuna.png` | 1080×1920 | 안녕! |

聯絡圖：`/workspace/koolo-promo/v4/portraits/sheet.jpg`

### Image-to-video 提示（一行一則，全部 3.0 s、9:16、鎖住五官與服裝、畫面內不要出現任何文字）

- **Zoe（3.0 s）** — She keeps this exact face and cream knit sweater, smiles warmer, tilts her head slightly, lifts one hand in a small friendly wave, and clearly mouths “Hi!”, soft warm indoor lamp light, subtle handheld camera, natural blink, no text, no morphing.
- **Noah（3.0 s）** — He keeps this exact face and light sweater, unclasps his hands just a little, leans a touch toward camera, smiles softly and clearly mouths “こんにちは”, quiet daylight from the window, subtle handheld camera, natural blink, no text, no morphing.
- **Iris（3.0 s）** — She keeps this exact face, paint-splattered apron and studio, gives a playful chin dip, raises the paintbrush in a quick hello, and clearly mouths “Hola”, bright workshop daylight, subtle handheld camera, natural blink, no text, no morphing.
- **Max（3.0 s）** — He keeps this exact face, green tee and backpack, flashes a bigger grin, gives a short nod and a small wave with his free hand, and clearly mouths “Bonjour”, crisp mountain daylight, subtle handheld camera, natural blink, no text, no morphing.
- **Yuna（3.0 s）** — She keeps this exact face, long dark hair and cream sweater, glances back over her shoulder a bit more, smiles, and clearly mouths “안녕”, soft living-room daylight, subtle handheld camera, natural blink, no text, no morphing.

產出規格建議：9:16、1080×1920 或可放大的來源、30 fps、各 3.0 s；剪進成片時取口型最準的連續 2.00 s，對上 128 BPM 的 4 拍。

## 旁白腳本（能量向，台灣腔女聲）

| 時間 | 口白 | 語音 |
| --- | --- | --- |
| 0.05–2.80 | 背了十年單字，還是不敢開口？ | HsiaoChen，稍慢、問句上揚 |
| 3.05–4.70 | 別再一個人練習了。 | HsiaoChen |
| 4.75–6.80 | 打個招呼，就開始。 | HsiaoChen（可與 Zoe 的 Hi! 輕輕疊上） |
| 5.00–15.00 | （角色自己說）Hi! / こんにちは！ / ¡Hola! / Bonjour ! / 안녕! | 各語言女聲神經語音，對齊口型 |
| 15.05–16.70 | 看到喜歡的，直接跟朋友聊。 | HsiaoChen |
| 16.90–19.60 | 不必準備話題。不考試，也不強迫糾錯。 | HsiaoChen |
| 19.80–23.40 | 玩遊戲、讀故事、看運勢，一起玩著學語言！ | HsiaoChen，最後一句加重 |
| 23.60–27.40 | 來 Koolo 打個招呼，免費開始！ | 「來／打個招呼，免費開始」HsiaoChen；**Koolo 用 Jenny 插入** |

## 節拍與畫面（128 BPM）

| 時間 | 拍點 | 畫面 | 快閃大字 | 音效 |
| --- | --- | --- | --- | --- |
| 0.00–0.94 | 0–2 | 黑底或極暗特寫，先不要看清人 | **背了十年單字** | 重低音擊 + 字卡撞擊 |
| 0.94–1.88 | 2–4 | 切第二句，字卡更大 | **還是不敢開口？** | 第二擊，尾音上揚 |
| 1.88–3.00 | 4–6.4 | 極短靜音後節奏進來；可閃 4 格角色眼睛特寫 | （無字，或一個問號） | 鼓點進、whoosh |
| 3.00–4.00 | 6.4–8.5 | 大字蓋滿 | **別再一個人練習了** | 拍點切 |
| 4.00–5.00 | 8.5–10.7 | Zoe 肖像起幅（尚未開口），字卡 | **打個招呼，就開始** | 上揚 synth |
| 5.00–7.00 | 10.7–15 | **Zoe I2V 2.00 s**，她說 Hi! | **Hi!** | 氣泡 pop |
| 7.00–9.00 | 15–19 | **Noah I2V 2.00 s** | **こんにちは！** | pop |
| 9.00–11.00 | 19–23.5 | **Iris I2V 2.00 s** | **¡Hola!** | pop |
| 11.00–13.00 | 23.5–27.7 | **Max I2V 2.00 s** | **Bonjour !** | pop |
| 13.00–15.00 | 27.7–32 | **Yuna I2V 2.00 s** | **안녕!** | pop + 短 whoosh 出 |
| 15.00–16.00 | 32–34 | Shorts：Finn 網球照＋「跟 Finn 聊這張」（`still-shorts.png`）硬切，不要溶解 | **看到喜歡的** | 拍點切 |
| 16.00–17.00 | 34–36 | 同一張，放大按鈕；或 Zoe Shorts 按鈕「跟 Zoe 聊這張」（只留在同一位朋友上） | **直接跟朋友聊** | 輕 tap |
| 17.00–18.00 | 36–38 | 真實入口卡「跟朋友說說今天的事／不必準備話題」（v3.1 `card-topic.png`） | **不必準備話題** | 拍點切 |
| 18.00–19.00 | 38–41 | 真實入口卡「隨便聊 3 分鐘外語／不考試不強迫糾錯」（`card-voice.png`） | **不考試　不強迫糾錯** | 拍點切 |
| 19.00–20.00 | 41–43 | 遊戲列表硬切（`still-games.png`） | **玩遊戲** | whoosh |
| 20.00–21.00 | 43–45 | Story 卡硬切（`still-explore-2.png` 故事卡） | **讀故事** | 拍點切 |
| 21.00–22.00 | 45–47 | Fortune 三張命盤卡（已裁掉空白紀錄） | **看運勢** | 拍點切 |
| 22.00–23.50 | 47–50 | 探索頁總覽快閃，大字蓋上 | **一起玩著學語言！** | 鼓點加強 |
| 23.50–25.50 | 50–54.5 | 結束卡進入：官方 wordmark 眨眼 | **來 Koolo** | chime（對準 Koolo 發音） |
| 25.50–28.00 | 54.5–60 | 字卡「免費開始 · koolo.app」，音樂揚起收束 | **免費開始** | 最後一擊，淡出 |

角色鏡位之間用 **硬切或 ≤0.12 s 的閃白／輕 swipe**，不要用慢溶解。文字頁之間同樣禁止溶解。

## 配樂與混音

- 全新 128 BPM 床帶：開場 0–1.88 s 幾乎只有擊拍與空間感，1.88 s 鼓點與低音進來，5.00 s 角色段加輕快旋律，15.00 s 再把鼓加厚，23.50 s 揚起，27–28 s 收在主音和弦。
- 對白底下 duck −12 dB；成片目標約 −14 LUFS、true peak ≤ −1.5 dBTP。
- SFX 維持 sparingly：字卡撞擊、轉場 whoosh、問候 pop、按鈕 tap、標誌 chime。

## 現成畫面素材（不需重抓，除非要更新）

- 角色立繪：本目錄 `portraits/*.png`
- Shorts Finn：`/workspace/koolo-promo/v1/frames/still-shorts.png`
- 話題入口卡：`/workspace/koolo-promo/v3/assets/card-topic.png`、`card-voice.png`
- 遊戲／故事／運勢／探索：v1 `still-games.png`、`still-explore-2.png`、`still-fortune.png`、`still-explore.png`
- 標誌：`/workspace/koolo-promo/v1/raw/wordmark.png` 與眨眼邏輯（v3 `shot_end_card`）

## 下一步（等 I2V 短片回來再做）

1. 用上表五則提示，從 `portraits/<name>.png` 各生成 3.0 s 短片。
2. 把檔案放到 `/workspace/koolo-promo/v4/clips/`（建議檔名 `zoe.mp4`、`noah.mp4`、`iris.mp4`、`max.mp4`、`yuna.mp4`）。
3. 再剪 v4 成片：對拍點、對口型、加大字、重做 128 BPM 配樂與旁白。
