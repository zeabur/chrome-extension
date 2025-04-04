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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
