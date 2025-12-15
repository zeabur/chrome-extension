#!/bin/bash

# 獲取版本號（動態從 manifest.json 讀取）
# 使用多種方法確保可靠提取版本號
if command -v node &> /dev/null; then
    # 方法1: 使用 Node.js 解析 JSON（最可靠）
    VERSION=$(node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('manifest.json','utf8'));console.log(m.version)")
elif command -v python3 &> /dev/null; then
    # 方法2: 使用 Python 解析 JSON
    VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
else
    # 方法3: 使用 sed 正則表達式（備用方案）
    VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' manifest.json | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
fi

# 驗證版本號是否成功提取
if [ -z "$VERSION" ]; then
    echo "❌ 錯誤：無法從 manifest.json 讀取版本號"
    exit 1
fi

echo "📌 檢測到版本號: $VERSION"

# 設定輸出文件名
OUTPUT_FILE="zeabur-extension-v${VERSION}.zip"

# 清理舊的打包文件
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo "已刪除舊的打包文件: $OUTPUT_FILE"
fi

# 創建臨時目錄
TEMP_DIR=$(mktemp -d)
EXTENSION_DIR="$TEMP_DIR/zeabur-extension"

# 複製必要的文件
mkdir -p "$EXTENSION_DIR"
cp manifest.json "$EXTENSION_DIR/"
cp background.js "$EXTENSION_DIR/"
cp icon64.png "$EXTENSION_DIR/"
cp jszip.min.js "$EXTENSION_DIR/"
cp LICENSE "$EXTENSION_DIR/"

# 複製目錄
cp -r bolt "$EXTENSION_DIR/"
cp -r claude "$EXTENSION_DIR/"
cp -r gemini "$EXTENSION_DIR/"
cp -r lovable "$EXTENSION_DIR/"

# 創建 ZIP 文件
cd "$TEMP_DIR"
zip -r "$OUTPUT_FILE" zeabur-extension/ > /dev/null

# 移動到原始目錄
mv "$OUTPUT_FILE" "$OLDPWD/"

# 清理臨時目錄
rm -rf "$TEMP_DIR"

echo "✅ 打包完成！"
echo "📦 輸出文件: $OUTPUT_FILE"
echo ""
echo "測試人員可以："
echo "1. 解壓 $OUTPUT_FILE"
echo "2. 在 Chrome 中前往 chrome://extensions/"
echo "3. 啟用「開發人員模式」"
echo "4. 點擊「載入未封裝項目」並選擇解壓後的目錄"

