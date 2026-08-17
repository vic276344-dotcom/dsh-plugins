<div align="center">

# 🚀 DSH Plugins

**Utility plugins for DeepSeek Harness Web GUI — In-chat File Preview + Dual-Model Vision**

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)]()
[![Plugins](https://img.shields.io/badge/plugins-2-orange.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-purple.svg)]()
[![DSH](https://img.shields.io/badge/DeepSeek%20Harness-Web-red.svg)](https://github.com/deepseek-ai/deepseek-harness)

**中文版说明 → [README.md](./README.md)**

</div>

---

## 📦 Plugins Overview

| Plugin | Feature | Description |
|--------|---------|-------------|
| 📄 [dsh-file-preview](./dsh-file-preview) | **In-chat File Preview** | Right-click file paths in chat to preview contents directly in the side panel — no more jumping to external apps |
| 🖼️ [dsh-image-analyzer](./dsh-image-analyzer) | **Dual-Model Vision** | Pair a text-only main model (e.g. DeepSeek) with a vision-capable LLM so images can be understood |

---

## ✨ Features

### 📄 dsh-file-preview

- ✅ Right-click any file path reference in chat → choose **"Preview in right panel"**
- ✅ Supports: **text files** (syntax highlighted) / **images** / **PDF**
- ✅ Keeps the original tool-details panel intact
- ✅ Resizable preview panel

### 🖼️ dsh-image-analyzer

- ✅ When the main model can't see images, it calls the `analyze_image` tool
- ✅ The tool sends the image to a vision-capable model (default `agnes-2.5-flash`, OpenAI-compatible)
- ✅ Returns a text description so the main model can continue the task
- ✅ Works with any OpenAI-compatible vision model: GPT-4o / Qwen-VL / GLM-4V ...

---

## 🚀 Quick Install

### Prerequisites
- DeepSeek Harness Web (`dsh web`)
- Locate your web profile directory (default: `<install-dir>/data/profiles/web`)

### One-Click Install

**Windows** (admin PowerShell):
```powershell
.\install.ps1
```

**Linux / macOS**:
```bash
chmod +x install.sh && ./install.sh
```

> The script auto-detects the profile directory, copies plugins, creates links, and updates config.

### Manual Install (3 steps)

**① Copy plugins & create links:**
```bash
cp -r dsh-file-preview dsh-image-analyzer <PROFILE_DIR>/
ln -s <PROFILE_DIR>/dsh-file-preview <PROFILE_DIR>/../node_modules/dsh-file-preview
ln -s <PROFILE_DIR>/dsh-image-analyzer <PROFILE_DIR>/../node_modules/dsh-image-analyzer
```

**② Register plugins** (`<PROFILE_DIR>/cordis.patch.yml`):
```yaml
- insert:
    - id: dsh-file-preview
      name: 'dsh-file-preview'
    - id: dsh-image-analyzer
      name: 'dsh-image-analyzer'
```

**③ Register the vision tool** (`~/.dsh/.agent-presets/<your-preset>/agent.cordis.yml`):
```yaml
- id: image-analyzer
  name: 'dsh-image-analyzer'
```

**④ Configure the vision model API key** (`~/.dsh/settings.yaml`, see [example](./examples/settings.yaml.example))

**⑤ Restart DSH and create a new session** 🎉

---

## ⚙️ Configuration

### dsh-image-analyzer vision model config

| Option | Default | Description |
|--------|---------|-------------|
| `baseURL` | `https://apihub.agnes-ai.com/v1` | Vision model API endpoint (OpenAI-compatible) |
| `model` | `agnes-2.5-flash` | Vision model ID |
| `apiKeyEnv` | `AGNES_API_KEY` | Env/credential name of the API key |
| `maxBytes` | `10485760` | Max image bytes (10 MB) |

Supported formats: PNG / JPG / JPEG / WebP / GIF

---

## 🛠 How It Works

```
【File Preview】
browser client.js ──right-click detect──▶ fetch('/api/file.read') ──▶ host index.js ──▶ file content
【Vision Analysis】
main model (DeepSeek) ──calls analyze_image──▶ plugin reads image ──base64──▶ vision model API ──▶ text description
```

---

## 📜 License

[MIT](./LICENSE) — free to use, modify, and share

<div align="center">
Made with ❤️ for the DSH community
</div>
