<div align="center">

# 🚀 DSH 增强插件集 / DSH Plugins

**DeepSeek Harness Web GUI 实用插件 —— 文件预览 + 辅助识图**
*Utility plugins for DeepSeek Harness Web GUI — In-chat File Preview + Dual-Model Vision*

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)]()
[![Plugins](https://img.shields.io/badge/plugins-2-orange.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-purple.svg)]()
[![DSH](https://img.shields.io/badge/DeepSeek%20Harness-Web-red.svg)](https://github.com/deepseek-ai/deepseek-harness)

**🌐 English → [README_EN.md](./README_EN.md)**

</div>

---

## 📦 插件一览

| 插件 | 功能 | 一句话说明 |
|------|------|-----------|
| 📄 [dsh-file-preview](./dsh-file-preview) | **对话内文件预览** | 右键文件路径 → 右侧面板直接预览，告别跳转外部软件 |
| 🖼️ [dsh-image-analyzer](./dsh-image-analyzer) | **辅助识图双模型** | DeepSeek 纯文本模型 + 视觉辅助模型，图片内容也能识别 |

---

## ✨ 特性

### 📄 dsh-file-preview（文件预览）

- ✅ 右键点击对话中的文件路径引用 → 选择 **"在右侧预览"**
- ✅ 支持：**文本文件**（语法高亮）/ **图片** / **PDF**
- ✅ 保留原有工具调用详情面板功能
- ✅ 预览面板宽度可拖拽调整

### 🖼️ dsh-image-analyzer（辅助识图）

- ✅ 主模型（如 DeepSeek，纯文本）无法识图时，自动调用 `analyze_image` 工具
- ✅ 工具将图片发送给辅助视觉模型（默认 `agnes-2.5-flash`，OpenAI 兼容）
- ✅ 返回图片文字描述，主模型据此继续完成任务
- ✅ 支持任意 OpenAI 兼容视觉模型：GPT-4o / 通义千问 VL / GLM-4V ...

---

## 🚀 快速安装

### 前提
- DeepSeek Harness Web 版（`dsh web`）
- 找到你的 web profile 目录（默认：`<安装目录>/data/profiles/web`）

### 一键安装

**Windows**（管理员 PowerShell）：
```powershell
.\install.ps1
```

**Linux / macOS**：
```bash
chmod +x install.sh && ./install.sh
```

> 安装脚本会自动检测 profile 目录、复制插件、创建链接、更新配置。

### 手动安装（3 步）

**① 复制插件并建链接：**
```bash
cp -r dsh-file-preview dsh-image-analyzer <PROFILE_DIR>/
ln -s <PROFILE_DIR>/dsh-file-preview <PROFILE_DIR>/../node_modules/dsh-file-preview
ln -s <PROFILE_DIR>/dsh-image-analyzer <PROFILE_DIR>/../node_modules/dsh-image-analyzer
```

**② 注册插件**（`<PROFILE_DIR>/cordis.patch.yml`）：
```yaml
- insert:
    - id: dsh-file-preview
      name: 'dsh-file-preview'
    - id: dsh-image-analyzer
      name: 'dsh-image-analyzer'
```

**③ 注册识图工具**（`~/.dsh/.agent-presets/<你的preset>/agent.cordis.yml`）：
```yaml
- id: image-analyzer
  name: 'dsh-image-analyzer'
```

**④ 配置视觉模型 API key**（`~/.dsh/settings.yaml`，见 [示例](./examples/settings.yaml.example)）

**⑤ 重启 DSH，新建会话生效** 🎉

---

## ⚙️ 配置说明

### dsh-image-analyzer 视觉模型配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `baseURL` | `https://apihub.agnes-ai.com/v1` | 视觉模型 API 地址（OpenAI 兼容） |
| `model` | `agnes-2.5-flash` | 视觉模型 ID |
| `apiKeyEnv` | `AGNES_API_KEY` | API key 的环境变量名（从凭据库读取） |
| `maxBytes` | `10485760` | 最大图片字节数（10MB） |

支持格式：PNG / JPG / JPEG / WebP / GIF

---

## 🛠 工作原理

```
【文件预览】
浏览器 client.js ──右键检测──▶ fetch('/api/file.read') ──▶ host index.js ──▶ 文件内容
【辅助识图】
主模型 (DeepSeek) ──调用 analyze_image──▶ 插件读取图片 ──base64──▶ 视觉模型 API ──▶ 文字描述
```

---

## 📜 License

[MIT](./LICENSE) — 欢迎使用、修改、分享

<div align="center">
Made with ❤️ for the DSH community
</div>
