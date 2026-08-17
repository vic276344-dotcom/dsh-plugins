# dsh-plugins 安装脚本 (Linux / macOS)
# 用法: chmod +x install.sh && ./install.sh

set -e

echo "========================================"
echo "  DSH Plugins Installer (Unix)"
echo "========================================"

# ── 1. 检测 profile 目录 ──────────────────────────────────────────────
DEFAULT_PROFILES=(
    "$(dirname "$0")/../data/profiles/web"
    "$HOME/.dsh/profiles/web"
    "/opt/DeepSeekHarness/data/profiles/web"
)

PROFILE_DIR=""
for candidate in "${DEFAULT_PROFILES[@]}"; do
    if [ -f "$candidate/cordis.patch.yml" ]; then
        PROFILE_DIR="$candidate"
        break
    fi
done

if [ -z "$PROFILE_DIR" ]; then
    echo "未自动检测到 DSH web profile 目录。"
    read -rp "请输入 profile 目录路径: " PROFILE_DIR
    if [ ! -f "$PROFILE_DIR/cordis.patch.yml" ]; then
        echo "错误: 目录中没有 cordis.patch.yml"
        exit 1
    fi
fi
echo "✓ Profile 目录: $PROFILE_DIR"

# ── 2. 复制插件包 ─────────────────────────────────────────────────────
PLUGINS=("dsh-file-preview" "dsh-image-analyzer")
for plugin in "${PLUGINS[@]}"; do
    SRC="$(dirname "$0")/$plugin"
    DST="$PROFILE_DIR/$plugin"
    if [ ! -d "$SRC" ]; then
        echo "错误: 缺少插件目录 $plugin"
        exit 1
    fi
    if [ -d "$DST" ]; then
        echo "已存在 $plugin，跳过复制"
    else
        cp -r "$SRC" "$DST"
        echo "✓ 已复制 $plugin"
    fi
done

# ── 3. 创建 node_modules 符号链接 ─────────────────────────────────────
NODE_MODULES="$(dirname "$PROFILE_DIR")/node_modules"
mkdir -p "$NODE_MODULES"
for plugin in "${PLUGINS[@]}"; do
    LINK="$NODE_MODULES/$plugin"
    TARGET="$PROFILE_DIR/$plugin"
    if [ -e "$LINK" ]; then
        echo "已存在链接 $plugin，跳过"
    else
        ln -s "$TARGET" "$LINK"
        echo "✓ 已创建符号链接: $plugin"
    fi
done

# ── 4. 更新 cordis.patch.yml ──────────────────────────────────────────
PATCH_FILE="$PROFILE_DIR/cordis.patch.yml"
if grep -q "dsh-file-preview" "$PATCH_FILE" 2>/dev/null; then
    echo "cordis.patch.yml 已包含插件配置，跳过"
else
    cat >> "$PATCH_FILE" << 'EOF'

- insert:
    # File preview plugin (host + client)
    - id: dsh-file-preview
      name: 'dsh-file-preview'

    # Auxiliary vision model plugin (host)
    - id: dsh-image-analyzer
      name: 'dsh-image-analyzer'
EOF
    echo "✓ 已更新 cordis.patch.yml"
fi

echo ""
echo "========================================"
echo "  安装完成！后续步骤："
echo "========================================"
echo ""
echo "1. 在 agent preset 中注册工具（可选，识图需要）:"
echo "   编辑 ~/.dsh/.agent-presets/<preset>/agent.cordis.yml，添加:"
echo "   - id: image-analyzer"
echo "     name: 'dsh-image-analyzer'"
echo ""
echo "2. 配置视觉模型 API key:"
echo "   编辑 ~/.dsh/settings.yaml，参见 examples/settings.yaml.example"
echo ""
echo "3. 重启 DSH，新建会话生效"
