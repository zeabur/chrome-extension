# Zeabur Chrome Extension

A Chrome extension that adds a "Deploy to Zeabur" button to popular AI coding tools, enabling one-click deployment to your cloud.

## Features

- Adds a "Deploy to Zeabur" button to supported AI coding tools
- Currently supports:
  - [Lovable](https://lovable.dev)
  - [Bolt.new](https://bolt.new)
  - [v0.dev](https://v0.dev)
- One-click deployment to your cloud infrastructure

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The extension will be installed and ready to use

## Usage

1. Visit any of the supported AI coding tools (Lovable, Bolt.new, or v0.dev)
2. The extension will automatically add a "Deploy to Zeabur" button to the interface
3. Click the button to deploy your project to Zeabur

## Permissions

This extension requires the following permissions:
- `scripting`: To inject the deployment button into supported websites
- `tabs`: To interact with browser tabs

## Development

The extension is built with:
- Manifest V3
- Content scripts for each supported platform
- Web accessible resources for deployment functionality

## 打包成測試版本

執行打包腳本：

```bash
./build.sh
```

這會創建一個 `zeabur-extension-v0.3.7.zip` 文件，可以直接分發給測試人員。

## 上傳到 Chrome Web Store

### 步驟 1: 打包擴展

執行打包腳本生成 ZIP 文件：

```bash
./build.sh
```

### 步驟 2: 準備上傳

1. 前往 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 登入你的 Google 開發者帳號（需要支付一次性 $5 美元註冊費）
3. 點擊「新增項目」或選擇現有項目

### 步驟 3: 上傳 ZIP 文件

1. 點擊「上傳 ZIP 檔案」
2. 選擇打包好的 `zeabur-extension-v0.3.7.zip` 文件
3. 填寫商店資訊：
   - **名稱**：Zeabur
   - **簡短說明**：Add a "Deploy to Zeabur" button to AI coding tools like Lovable, Bolt.new or v0.dev. One-click deploy to your cloud.
   - **詳細說明**：描述擴展的功能和使用方式
   - **類別**：選擇合適的分類（如 Productivity）
   - **圖示**：上傳 `icon64.png` 或更高解析度的圖示
   - **螢幕截圖**：準備至少 1 張，最多 5 張螢幕截圖

### 步驟 4: 提交審核

1. 確認所有資訊正確
2. 點擊「提交審核」
3. 等待 Google 審核（通常需要幾天時間）

### 注意事項

- 確保版本號已更新（當前版本：0.3.7）
- ZIP 文件必須包含所有必要的文件
- 不要包含 `.git`、`README.md`、`build.sh` 等開發文件
- 確保所有權限聲明正確

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
