# dsh-file-preview — 对话内文件预览

在 DeepSeek Harness Web GUI 中，右键点击对话里的文件路径引用，在**右侧面板直接预览文件内容**，无需跳转外部软件。

## 功能

- 右键文件路径 → 菜单选择 **"在右侧预览"**
- 支持格式：
  - **文本文件**（.js/.ts/.py/.md/.json/.yaml/.html/.css 等，带语法高亮）
  - **图片**（.png/.jpg/.svg/.gif/.webp 等）
  - **PDF**（iframe 嵌入）
- 保留原有工具调用详情面板功能
- 预览面板宽度可拖拽

## 安装

见 [根目录 README](../README.md) 的安装说明。核心步骤：

1. 复制 `dsh-file-preview` 目录到 web profile 目录
2. 在 `node_modules` 创建 junction/symlink
3. 在 `cordis.patch.yml` 注册：
   ```yaml
   - insert:
       - id: dsh-file-preview
         name: 'dsh-file-preview'
   ```
4. 重启 DSH

## 使用方法

1. 让 AI 读取/生成文件（对话中会出现文件路径引用）
2. **右键点击**路径链接
3. 选择 **"在右侧预览"**
4. 右侧面板展开显示文件内容

## 工作原理

- **client.js**（浏览器端）：通过 `window.__ModuleLoader__` 加载，注册到 `details` 插槽；在对话区域监听右键事件，识别文件引用按钮，弹出上下文菜单
- **index.js**（host 端）：注册 `/api/file.read` HTTP 路由，读取文件并返回 JSON（文本内容或 base64）

## 限制

- 文件大小上限 2MB
- 二进制非图片文件不支持预览
