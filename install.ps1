# dsh-plugins 安装脚本 (Windows PowerShell)
# 用法: 右键"使用 PowerShell 运行"或:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# 会自动:
#   1. 检测 DSH web profile 目录
#   2. 复制插件包到 profile 目录
#   3. 在 node_modules 创建 junction
#   4. 更新 cordis.patch.yml

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DSH Plugins Installer (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. 检测 profile 目录 ──────────────────────────────────────────────
$defaultProfiles = @(
    "$PSScriptRoot\..\data\profiles\web",          # 从仓库目录推断
    "$env:USERPROFILE\.dsh\profiles\web",          # 用户安装
    "C:\DeepSeekHarness\data\profiles\web"          # 常见安装位置
)

$profileDir = $null
foreach ($candidate in $defaultProfiles) {
    if (Test-Path (Join-Path $candidate "cordis.patch.yml")) {
        $profileDir = $candidate
        break
    }
}

if (-not $profileDir) {
    Write-Host "未自动检测到 DSH web profile 目录。" -ForegroundColor Yellow
    $profileDir = Read-Host "请输入 profile 目录路径（包含 cordis.patch.yml 的目录）"
    if (-not (Test-Path (Join-Path $profileDir "cordis.patch.yml"))) {
        Write-Error "目录中没有 cordis.patch.yml，请确认路径正确"
        exit 1
    }
}
Write-Host "✓ Profile 目录: $profileDir" -ForegroundColor Green

# ── 2. 检查管理员权限（junction 需要） ────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "提示: 创建 node_modules junction 可能需要管理员权限。" -ForegroundColor Yellow
    Write-Host "如果后续失败，请以管理员身份重新运行本脚本。" -ForegroundColor Yellow
}

# ── 3. 复制插件包 ─────────────────────────────────────────────────────
$plugins = @("dsh-file-preview", "dsh-image-analyzer")
foreach ($plugin in $plugins) {
    $src = Join-Path $PSScriptRoot $plugin
    $dst = Join-Path $profileDir $plugin
    if (-not (Test-Path $src)) {
        Write-Error "仓库中缺少插件目录: $plugin"
        exit 1
    }
    if (Test-Path $dst) {
        Write-Host "已存在 $plugin，跳过复制" -ForegroundColor Yellow
    } else {
        Copy-Item -Recurse $src $dst
        Write-Host "✓ 已复制 $plugin" -ForegroundColor Green
    }
}

# ── 4. 创建 node_modules junction ─────────────────────────────────────
$nodeModules = Join-Path $profileDir "..\node_modules"
if (-not (Test-Path $nodeModules)) {
    New-Item -ItemType Directory -Path $nodeModules -Force | Out-Null
}
foreach ($plugin in $plugins) {
    $link = Join-Path $nodeModules $plugin
    $target = Join-Path $profileDir $plugin
    if (Test-Path $link) {
        Write-Host "已存在链接 $plugin，跳过" -ForegroundColor Yellow
    } else {
        try {
            New-Item -ItemType Junction -Path $link -Target $target | Out-Null
            Write-Host "✓ 已创建 junction: $plugin" -ForegroundColor Green
        } catch {
            Write-Error "创建 junction 失败: $_"
            Write-Host "请以管理员身份重新运行，或手动执行:" -ForegroundColor Yellow
            Write-Host "  mklink /J `"$link`" `"$target`"" -ForegroundColor Yellow
        }
    }
}

# ── 5. 更新 cordis.patch.yml ──────────────────────────────────────────
$patchFile = Join-Path $profileDir "cordis.patch.yml"
$patchContent = Get-Content $patchFile -Raw -ErrorAction SilentlyContinue

if ($patchContent -match "dsh-file-preview") {
    Write-Host "cordis.patch.yml 已包含插件配置，跳过" -ForegroundColor Yellow
} else {
    $addition = @"

- insert:
    # File preview plugin (host + client)
    - id: dsh-file-preview
      name: 'dsh-file-preview'

    # Auxiliary vision model plugin (host)
    - id: dsh-image-analyzer
      name: 'dsh-image-analyzer'
"@
    Add-Content -Path $patchFile -Value $addition -Encoding UTF8
    Write-Host "✓ 已更新 cordis.patch.yml" -ForegroundColor Green
}

# ── 6. 提示后续步骤 ───────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  安装完成！后续步骤：" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 在 agent preset 中注册工具（可选，识图需要）:" -ForegroundColor White
Write-Host "   编辑 ~/.dsh/.agent-presets/<preset>/agent.cordis.yml，添加:" -ForegroundColor Gray
Write-Host "   - id: image-analyzer" -ForegroundColor Gray
Write-Host "     name: 'dsh-image-analyzer'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 配置视觉模型 API key（如未配置）:" -ForegroundColor White
Write-Host "   编辑 ~/.dsh/settings.yaml，添加 llm-pi-ai.providers 配置" -ForegroundColor Gray
Write-Host "   参见 examples/settings.yaml.example" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 重启 DSH，新建会话生效" -ForegroundColor White
Write-Host ""
Write-Host "卸载: 删除插件目录和 cordis.patch.yml 中的条目即可" -ForegroundColor Gray
