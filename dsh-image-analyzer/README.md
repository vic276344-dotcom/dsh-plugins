# dsh-image-analyzer — 主模型 + 辅助识图模型

解决 DeepSeek 等**纯文本模型无法识别图片**的问题。主模型负责对话和任务，当需要理解图片时调用 `analyze_image` 工具，由**辅助视觉模型**（OpenAI 兼容 API）识别图片并返回文字描述。

## 功能

- 注册 `analyze_image` 工具（主模型可见）
- 支持 PNG / JPG / WebP / GIF
- 可配置任意 OpenAI 兼容视觉模型（GPT-4o、通义千问 VL、GLM-4V 等）
- 图片大小上限 10MB（可配置）

## 安装

见 [根目录 README](../README.md) 的安装说明。核心步骤：

1. 复制 `dsh-image-analyzer` 目录到 web profile 目录
2. 在 `node_modules` 创建 junction/symlink
3. 在 `cordis.patch.yml` 注册：
   ```yaml
   - insert:
       - id: dsh-image-analyzer
         name: 'dsh-image-analyzer'
   ```
4. **在 agent preset 中注册工具**（`~/.dsh/.agent-presets/<preset>/agent.cordis.yml`）：
   ```yaml
   - id: image-analyzer
     name: 'dsh-image-analyzer'
   ```
5. 配置视觉模型（见下）
6. 重启 DSH，新建会话生效

## 配置

插件默认使用 `agnes-2.5-flash` 视觉模型，可在 preset 的 row config 中覆盖：

```yaml
- id: image-analyzer
  name: 'dsh-image-analyzer'
  config:
    baseURL: https://api.openai.com/v1   # OpenAI 兼容 API 地址
    model: gpt-4o                        # 视觉模型 ID
    apiKeyEnv: OPENAI_API_KEY            # API key 的环境变量/凭据名
    maxBytes: 10485760                   # 最大图片字节数
```

API key 通过 DSH 凭据库解析（`~/.dsh/.credentials.yaml` 或环境变量）。

## 使用方法

对主模型说：
- "分析这张图片：`<图片路径>`"
- "图片里有什么？"（配合路径）

主模型会自动调用 `analyze_image` 工具 → 辅助视觉模型识别 → 返回描述。

## 工作原理

```
主模型 (DeepSeek, 纯文本)
    │  调用 analyze_image 工具
    ▼
dsh-image-analyzer 插件
    │  1. 读取图片文件 → base64
    │  2. POST /chat/completions（OpenAI 兼容）
    ▼
辅助视觉模型 (agnes-2.5-flash / gpt-4o / qwen-vl ...)
    │  返回文字描述
    ▼
主模型 基于描述继续完成任务
```
