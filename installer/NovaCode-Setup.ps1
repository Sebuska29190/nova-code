# NovaCode Installer (PowerShell)
# Run: Right-click → Run with PowerShell
# Or: powershell -ExecutionPolicy Bypass -File NovaCode-Setup.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$GITHUB_REPO = "Sebuska29190/nova-code"
$BRANCH = "main"
$INSTALL_DIR = "$env:USERPROFILE\.nova-code"
$APP_DIR = "$INSTALL_DIR\app"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "━━━ $msg ━━━" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Info($msg) {
    Write-Host "  [INFO] $msg" -ForegroundColor Cyan
}

function Write-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
}

function Write-Err($msg) {
    Write-Host "  [ERROR] $msg" -ForegroundColor Red
}

function Test-Command($cmd) {
    try {
        Get-Command $cmd -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# ─── Banner ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                   ║" -ForegroundColor Cyan
Write-Host "║        ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗       ║" -ForegroundColor Cyan
Write-Host "║        ████╗  ██║██╔═══██╗██║   ██║██╔══██╗      ║" -ForegroundColor Cyan
Write-Host "║        ██╔██╗ ██║██║   ██║██║   ██║███████║      ║" -ForegroundColor Cyan
Write-Host "║        ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║      ║" -ForegroundColor Cyan
Write-Host "║        ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║      ║" -ForegroundColor Cyan
Write-Host "║        ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝      ║" -ForegroundColor Cyan
Write-Host "║                                                   ║" -ForegroundColor Cyan
Write-Host "║        AI Coding Assistant — Installer            ║" -ForegroundColor Cyan
Write-Host "║                                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Check Prerequisites ─────────────────────────────────────────────────────

Write-Step "CHECKING PREREQUISITES"

# Git
if (-not (Test-Command "git")) {
    Write-Err "Git is not installed!"
    Write-Host ""
    Write-Host "  Install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "  Or run: winget install Git.Git" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
$gitVersion = (git --version) -replace 'git version ', ''
Write-Ok "Git $gitVersion"

# Node.js
if (-not (Test-Command "node")) {
    Write-Err "Node.js is not installed!"
    Write-Host ""
    Write-Host "  Install Node.js 18+ from: https://nodejs.org" -ForegroundColor Yellow
    Write-Host "  Or run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
$nodeVersion = node --version
Write-Ok "Node.js $nodeVersion"

# npm
if (-not (Test-Command "npm")) {
    Write-Err "npm is not available!"
    Read-Host "Press Enter to exit"
    exit 1
}
$npmVersion = npm --version
Write-Ok "npm $npmVersion"

# Bun (optional)
$useBun = $false
if (Test-Command "bun") {
    $bunVersion = bun --version
    Write-Ok "Bun $bunVersion"
    $useBun = $true
} else {
    Write-Info "Bun not found, will use npm (slower but works fine)"
}

# ─── Clone/Update Repository ─────────────────────────────────────────────────

Write-Step "DOWNLOADING NOVACODE"

if (Test-Path "$APP_DIR\.git") {
    Write-Info "NovaCode already installed, updating..."
    Push-Location $APP_DIR
    try {
        git pull
        Write-Ok "Updated to latest version"
    } catch {
        Write-Warn "Pull failed, re-cloning..."
        Pop-Location
        Remove-Item -Recurse -Force $APP_DIR -ErrorAction SilentlyContinue
        goto :clone
    }
    Pop-Location
} else {
    :clone
    Write-Info "Cloning NovaCode from GitHub..."
    if (-not (Test-Path $INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
    }

    try {
        git clone --depth 1 -b $BRANCH "https://github.com/$GITHUB_REPO.git" $APP_DIR
        Write-Ok "Repository cloned successfully"
    } catch {
        Write-Err "Failed to clone repository!"
        Write-Err "Check your internet connection and try again."
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# ─── Install Dependencies ────────────────────────────────────────────────────

Write-Step "INSTALLING DEPENDENCIES"

Push-Location $APP_DIR

if ($useBun) {
    Write-Info "Installing with Bun..."
    try {
        bun install
        Write-Ok "Dependencies installed with Bun"
    } catch {
        Write-Warn "Bun install failed, falling back to npm..."
        $useBun = $false
        npm install
        Write-Ok "Dependencies installed with npm"
    }
} else {
    Write-Info "Installing with npm (this may take a few minutes)..."
    try {
        npm install
        Write-Ok "Dependencies installed with npm"
    } catch {
        Write-Err "Failed to install dependencies!"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Pop-Location

# ─── Build ───────────────────────────────────────────────────────────────────

Write-Step "BUILDING NOVACODE"

Push-Location $APP_DIR

if ($useBun) {
    Write-Info "Building with Bun..."
    try {
        bun run build
        Write-Ok "Build completed with Bun"
    } catch {
        Write-Err "Build failed!"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Info "Building with npm..."
    try {
        npm run build
        Write-Ok "Build completed with npm"
    } catch {
        Write-Err "Build failed!"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Pop-Location

# ─── Create Launcher ─────────────────────────────────────────────────────────

Write-Step "SETTING UP"

# Create launcher .bat
$launcherPath = "$INSTALL_DIR\NovaCode.bat"
$launcherContent = @"
@echo off
cd /d "$APP_DIR"
if "$useBun"=="True" (
    bun run dev
) else (
    npx electron packages/desktop
)
"@
Set-Content -Path $launcherPath -Value $launcherContent -Encoding ASCII
Write-Ok "Launcher created: $launcherPath"

# Create desktop shortcut
$shortcutPath = "$env:USERPROFILE\Desktop\NovaCode.lnk"
try {
    $ws = New-Object -ComObject WScript.Shell
    $shortcut = $ws.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $launcherPath
    $shortcut.WorkingDirectory = $APP_DIR
    $shortcut.Description = "NovaCode - AI Coding Assistant"
    $shortcut.Save()
    Write-Ok "Desktop shortcut created"
} catch {
    Write-Warn "Could not create desktop shortcut"
}

# Create config directory
if (-not (Test-Path "$env:USERPROFILE\.nova")) {
    New-Item -ItemType Directory -Path "$env:USERPROFILE\.nova" -Force | Out-Null
}

# ─── Done ────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                   ║" -ForegroundColor Green
Write-Host "║   [OK] NovaCode installed successfully!           ║" -ForegroundColor Green
Write-Host "║                                                   ║" -ForegroundColor Green
Write-Host "║   Location: $INSTALL_DIR" -ForegroundColor Green
Write-Host "║                                                   ║" -ForegroundColor Green
Write-Host "║   Starting NovaCode...                            ║" -ForegroundColor Green
Write-Host "║                                                   ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Launch NovaCode
Push-Location $APP_DIR
if ($useBun) {
    Start-Process -FilePath "bun" -ArgumentList "run", "dev" -WorkingDirectory $APP_DIR
} else {
    Start-Process -FilePath "npx" -ArgumentList "electron", "packages/desktop" -WorkingDirectory $APP_DIR
}
Pop-Location

Write-Ok "NovaCode is starting..."
Write-Info "You can close this window."
Write-Host ""
Read-Host "Press Enter to close"
