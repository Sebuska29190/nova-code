@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

title NovaCode Installer v0.1.0
color 0B

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║                                                   ║
echo  ║        ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗       ║
echo  ║        ████╗  ██║██╔═══██╗██║   ██║██╔══██╗      ║
echo  ║        ██╔██╗ ██║██║   ██║██║   ██║███████║      ║
echo  ║        ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║      ║
echo  ║        ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║      ║
echo  ║        ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝      ║
echo  ║                                                   ║
echo  ║        AI Coding Assistant — Installer            ║
echo  ║                                                   ║
echo  ╚═══════════════════════════════════════════════════╝
echo.

set "INSTALL_DIR=%USERPROFILE%\.nova-code"
set "APP_DIR=%INSTALL_DIR%\app"
set "REPO_URL=https://github.com/Sebuska29190/nova-code.git"
set "BRANCH=main"

:: ─── Check Git ──────────────────────────────────────────────────────────────

echo.
echo  ━━━ CHECKING PREREQUISITES ━━━
echo.

git --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Git is not installed!
    echo.
    echo  Please install Git from: https://git-scm.com/download/win
    echo  Or run: winget install Git.Git
    echo.
    pause
    exit /b 1
)
echo  [OK] Git found

:: ─── Check Node.js ─────────────────────────────────────────────────────────

node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Please install Node.js 18+ from: https://nodejs.org
    echo  Or run: winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)
echo  [OK] Node.js found

:: ─── Check npm ──────────────────────────────────────────────────────────────

npm --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] npm is not available!
    echo.
    pause
    exit /b 1
)
echo  [OK] npm found

:: ─── Check Bun (optional) ──────────────────────────────────────────────────

set "USE_BUN=0"
bun --version >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Bun found
    set "USE_BUN=1"
) else (
    echo  [INFO] Bun not found, will use npm
)

:: ─── Clone/Update Repository ───────────────────────────────────────────────

echo.
echo  ━━━ DOWNLOADING NOVACODE ━━━
echo.

if exist "%APP_DIR%\.git" (
    echo  [INFO] NovaCode already installed, updating...
    cd /d "%APP_DIR%"
    git pull
    if errorlevel 1 (
        echo  [WARN] Pull failed, re-cloning...
        cd /d "%USERPROFILE%"
        rmdir /s /q "%APP_DIR%" 2>nul
        goto :clone
    )
    echo  [OK] Updated to latest version
    goto :install_deps
)

:clone
echo  [INFO] Cloning NovaCode from GitHub...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
git clone --depth 1 -b %BRANCH% %REPO_URL% "%APP_DIR%"
if errorlevel 1 (
    echo  [ERROR] Failed to clone repository!
    echo  [ERROR] Check your internet connection and try again.
    echo.
    pause
    exit /b 1
)
echo  [OK] Repository cloned successfully

:: ─── Install Dependencies ──────────────────────────────────────────────────

:install_deps
echo.
echo  ━━━ INSTALLING DEPENDENCIES ━━━
echo.

cd /d "%APP_DIR%"

if "%USE_BUN%"=="1" (
    echo  [INFO] Installing with Bun...
    call bun install
) else (
    echo  [INFO] Installing with npm...
    call npm install
)

if errorlevel 1 (
    echo  [ERROR] Failed to install dependencies!
    echo.
    pause
    exit /b 1
)
echo  [OK] Dependencies installed

:: ─── Build ──────────────────────────────────────────────────────────────────

echo.
echo  ━━━ BUILDING NOVACODE ━━━
echo.

if "%USE_BUN%"=="1" (
    echo  [INFO] Building with Bun...
    call bun run build
) else (
    echo  [INFO] Building with npm...
    call npm run build
)

if errorlevel 1 (
    echo  [ERROR] Build failed!
    echo.
    pause
    exit /b 1
)
echo  [OK] Build completed

:: ─── Create Launcher ───────────────────────────────────────────────────────

echo.
echo  ━━━ SETTING UP ━━━
echo.

:: Create launcher batch file
set "LAUNCHER=%INSTALL_DIR%\NovaCode.bat"
(
    echo @echo off
    echo cd /d "%APP_DIR%"
    echo if "%USE_BUN%"=="1" ^(
    echo     bun run dev
    echo ^) else ^(
    echo     npx electron packages/desktop
    echo ^)
) > "%LAUNCHER%"

echo  [OK] Launcher created: %LAUNCHER%

:: Create desktop shortcut via PowerShell
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\NovaCode.lnk"
powershell -command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%LAUNCHER%'; $s.WorkingDirectory = '%APP_DIR%'; $s.Description = 'NovaCode - AI Coding Assistant'; $s.Save()" 2>nul

if exist "%SHORTCUT_PATH%" (
    echo  [OK] Desktop shortcut created
) else (
    echo  [WARN] Could not create desktop shortcut
)

:: Create .nova config directory
if not exist "%USERPROFILE%\.nova" mkdir "%USERPROFILE%\.nova"

:: ─── Done ──────────────────────────────────────────────────────────────────

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║                                                   ║
echo  ║   [OK] NovaCode installed successfully!           ║
echo  ║                                                   ║
echo  ║   Location: %INSTALL_DIR%
echo  ║                                                   ║
echo  ║   Starting NovaCode...                            ║
echo  ║                                                   ║
echo  ╚═══════════════════════════════════════════════════╝
echo.

:: Launch NovaCode
cd /d "%APP_DIR%"
if "%USE_BUN%"=="1" (
    start "NovaCode" cmd /c "bun run dev"
) else (
    start "NovaCode" cmd /c "npx electron packages/desktop"
)

echo  [OK] NovaCode is starting...
echo  [INFO] You can close this window.
echo.
pause
