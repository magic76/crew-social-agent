> 路徑對照：成片在本工具包的 `output/koolo-promo-v4.1.mp4`。

# Koolo Promo v4.1 — 打招呼換聲（畫面與 v4 完全相同）

- **成片**：`/workspace/koolo-promo/v4/koolo-promo-v4.1.mp4`
- **畫面**：從 v4 以 `-c:v copy` 原封不動複製（raw video MD5 相同：`ba5d967ba1b919655794b514ffb02341`）
- **規格**：`1080×1920`、`30 fps`、`28.00 s`、`H.264 High yuv420p` + `AAC 44.1 kHz stereo`
- **響度（MP4 解碼實測）**：`-14.1 LUFS`，True Peak `-1.5 dBFS`，LRA `3.6 LU`
- **旁白**：仍為 `zh-TW-HsiaoChenNeural`；結尾 **Koolo** 仍為 `en-US-JennyNeural`（與 Zoe 的 Ana 明顯不同，故保留）
- **問候對口位置不變**（trimmed 檔起始與 v4 相同，speech 皆在 trim +0.025 s）

## 五段打招呼語音（v4.1）

| 角色 | 語句 | 語音 | 速度 / 音高 | 對口區間 | 設計 |
| --- | --- | --- | --- | --- | --- |
| **Zoe** | Hi! | `en-US-AnaNeural` | `+8%` / `+4Hz` | `5.925–6.235s` | 年輕明亮的美式女聲，刻意不用 Jenny，避免和 CTA「Koolo」撞聲 |
| **Noah** | こんにちは！ | `ja-JP-KeitaNeural` | `+2%` / `-2Hz` | `7.745–8.295s` | 男性、沉穩、稍慢稍低 |
| **Iris** | ¡Hola! | `es-ES-ElviraNeural` | `+14%` / `+8Hz` | `10.055–10.385s` | 女性、玩心、偏快偏亮（西班牙腔，有別於先前墨西哥 Dalia） |
| **Max** | Bonjour ! | `fr-FR-HenriNeural` | `+14%` / `+5Hz` | `11.065–11.495s` | 男性、有精神、偏快 |
| **Yuna** | 안녕! | `ko-KR-SunHiNeural` | `+8%` / `+10Hz` | `12.885–13.385s` | 女性、柔和，音高略為上調 |

v4 的五段問候原先全是女聲神經語音（Jenny / Nanami / Dalia / Denise / SunHi），聽起來像同一類型。v4.1 改為兩男三女、五種不同語系與音色。
