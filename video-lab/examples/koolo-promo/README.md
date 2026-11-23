# Koolo 產品宣傳片腳本（v4.1 管線）

完整理念、教訓、指令與時間軸請讀 repo 根目錄的 **[docs/video-promo-workflow.md](../../../docs/video-promo-workflow.md)**。

在**本目錄**執行指令（相對路徑與獨立工具包相同）：

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# 參考成片不在本目錄（避免重複大型檔），請用：
# content/video-handoffs/assets/koolo-promo-greetings-v4.1.mp4
```

`assets/clips/` 預設為空。請依說明用 I2V 產出 `zoe.mp4` 等五支短片後再跑 `scripts/inspect_and_upscale_clips.py`。肖像、官網截圖、話題卡與 wordmark 已附在 `assets/`。`work/` 是執行產物，已列入 .gitignore。
