#!/usr/bin/env bun
/**
 * NovaCode Bootstrapper
 *
 * Single-file installer that:
 * 1. Checks/installs prerequisites (Bun, Node.js, Git)
 * 2. Clones/downloads NovaCode from GitHub
 * 3. Installs dependencies
 * 4. Builds the project
 * 5. Creates desktop shortcut
 * 6. Launches the app
 *
 * Compile to .exe: bun build --compile --target=bun-windows-x64 bootstrap.ts --outfile=NovaCode-Setup.exe
 */

import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join, homedir } from "path";
import { platform, arch } from "os";

// ─── Config ───────────────────────────────────────────────────────────────────

const GITHUB_REPO = "Sebuska29190/nova-code";
const GITHUB_BRANCH = "main";
const INSTALL_DIR = join(homedir(), ".nova-code");
const APP_DIR = join(INSTALL_DIR, "app");
const SHORTCUT_NAME = "NovaCode.lnk";
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

// ─── Colors ───────────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function info(msg: string) {
  console.log(`${CYAN}ℹ${RESET} ${msg}`);
}

function warn(msg: string) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

function error(msg: string) {
  console.error(`${RED}✗${RESET} ${msg}`);
}

function step(msg: string) {
  console.log(`\n${BOLD}${CYAN}━━━ ${msg} ━━━${RESET}`);
}

function run(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

function runInteractive(cmd: string, cwd?: string): Promise<number> {
  return new Promise((resolve) => {
    const [command, ...args] = cmd.split(" ");
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: true });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Prerequisites ────────────────────────────────────────────────────────────

function checkGit(): boolean {
  const result = run("git --version");
  return result.includes("git version");
}

function checkBun(): boolean {
  const result = run("bun --version");
  return /^\d+\.\d+\.\d+/.test(result);
}

function checkNode(): boolean {
  const result = run("node --version");
  return result.startsWith("v");
}

function checkNpm(): boolean {
  const result = run("npm --version");
  return /^\d+\.\d+\.\d+/.test(result);
}

async function installBun(): Promise<boolean> {
  info("Installing Bun...");

  if (platform() === "win32") {
    // Windows: use npm or direct download
    if (checkNpm()) {
      run("npm install -g bun");
      if (checkBun()) {
        log("Bun installed via npm");
        return true;
      }
    }

    // Direct download
    info("Downloading Bun for Windows...");
    const url = "https://github.com/oven-sh/bun/releases/latest/download/bun-windows-x64.zip";
    const zipPath = join(INSTALL_DIR, "bun.zip");

    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      writeFileSync(zipPath, Buffer.from(buffer));

      // Extract
      run(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${INSTALL_DIR}' -Force"`);

      // Add to PATH for this session
      const bunPath = join(INSTALL_DIR, "bun-windows-x64");
      process.env.PATH = `${bunPath};${process.env.PATH}`;

      if (checkBun()) {
        log("Bun installed successfully");
        rmSync(zipPath, { force: true });
        return true;
      }
    } catch (err) {
      warn(`Failed to download Bun: ${err}`);
    }

    // Fallback to npm
    warn("Falling back to npm for package management");
    return false;
  } else {
    // Unix: use curl installer
    run("curl -fsSL https://bun.sh/install | bash");
    return checkBun();
  }
}

async function installNode(): Promise<boolean> {
  info("Node.js not found. Please install Node.js 18+ from https://nodejs.org");
  info("Or run: winget install OpenJS.NodeJS.LTS");
  return false;
}

// ─── GitHub API ───────────────────────────────────────────────────────────────

async function getLatestCommit(): Promise<{ sha: string; date: string } | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      sha: data.sha,
      date: data.commit.committer.date,
    };
  } catch {
    return null;
  }
}

async function getLatestRelease(): Promise<{ tag: string; url: string } | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      tag: data.tag_name,
      url: data.html_url,
    };
  } catch {
    return null;
  }
}

// ─── Install ──────────────────────────────────────────────────────────────────

async function cloneRepo(): Promise<boolean> {
  if (existsSync(join(APP_DIR, ".git"))) {
    info("Repository already cloned, pulling latest...");
    run("git pull", APP_DIR);
    return true;
  }

  info(`Cloning NovaCode from GitHub...`);
  mkdirSync(INSTALL_DIR, { recursive: true });

  const url = `https://github.com/${GITHUB_REPO}.git`;
  const result = run(`git clone --depth 1 -b ${GITHUB_BRANCH} ${url} "${APP_DIR}"`);

  if (existsSync(join(APP_DIR, ".git"))) {
    log("Repository cloned successfully");
    return true;
  }

  error("Failed to clone repository");
  return false;
}

async function installDependencies(): Promise<boolean> {
  info("Installing dependencies...");

  if (checkBun()) {
    const code = await runInteractive("bun install", APP_DIR);
    if (code === 0) {
      log("Dependencies installed with Bun");
      return true;
    }
  }

  // Fallback to npm
  if (checkNpm()) {
    info("Falling back to npm...");
    const code = await runInteractive("npm install", APP_DIR);
    if (code === 0) {
      log("Dependencies installed with npm");
      return true;
    }
  }

  error("Failed to install dependencies");
  return false;
}

async function buildProject(): Promise<boolean> {
  info("Building NovaCode...");

  const pkgManager = checkBun() ? "bun" : "npm";
  const buildCmd = pkgManager === "bun" ? "bun run build" : "npm run build";

  const code = await runInteractive(buildCmd, APP_DIR);
  if (code === 0) {
    log("Build completed successfully");
    return true;
  }

  error("Build failed");
  return false;
}

// ─── Shortcut ─────────────────────────────────────────────────────────────────

function createShortcut(): void {
  if (platform() !== "win32") return;

  const desktopDir = join(homedir(), "Desktop");
  const shortcutPath = join(desktopDir, SHORTCUT_NAME);

  // Create a .bat launcher
  const batPath = join(INSTALL_DIR, "NovaCode.bat");
  const batContent = `@echo off
cd /d "${APP_DIR}"
${checkBun() ? "bun" : "npx"} electron packages/desktop
`;
  writeFileSync(batPath, batContent);

  // Create PowerShell shortcut
  const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")
$Shortcut.TargetPath = "${batPath}"
$Shortcut.WorkingDirectory = "${APP_DIR}"
$Shortcut.Description = "NovaCode - AI Coding Assistant"
$Shortcut.Save()
`;

  try {
    execSync(`powershell -command "${psScript.replace(/"/g, '\\"')}"`, { stdio: "pipe" });
    log("Desktop shortcut created");
  } catch {
    warn("Could not create desktop shortcut");
  }
}

// ─── Auto-Update ──────────────────────────────────────────────────────────────

function getLastUpdateCheck(): number {
  const stateFile = join(INSTALL_DIR, ".update-state");
  try {
    const data = JSON.parse(readFileSync(stateFile, "utf-8"));
    return data.lastCheck ?? 0;
  } catch {
    return 0;
  }
}

function saveUpdateState(sha: string): void {
  const stateFile = join(INSTALL_DIR, ".update-state");
  writeFileSync(stateFile, JSON.stringify({ lastCheck: Date.now(), sha }));
}

async function checkForUpdates(): Promise<boolean> {
  const lastCheck = getLastUpdateCheck();
  if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL) return false;

  info("Checking for updates...");
  const latest = await getLatestCommit();

  if (!latest) {
    warn("Could not check for updates");
    return false;
  }

  const stateFile = join(INSTALL_DIR, ".update-state");
  let currentSha = "";

  try {
    const data = JSON.parse(readFileSync(stateFile, "utf-8"));
    currentSha = data.sha ?? "";
  } catch {
    // First run
  }

  if (latest.sha !== currentSha) {
    log(`Update available! (${latest.date})`);
    return true;
  }

  log("Already up to date");
  saveUpdateState(latest.sha);
  return false;
}

async function performUpdate(): Promise<boolean> {
  info("Updating NovaCode...");

  // Pull latest
  run("git pull", APP_DIR);

  // Reinstall dependencies
  await installDependencies();

  // Rebuild
  await buildProject();

  // Save state
  const latest = await getLatestCommit();
  if (latest) saveUpdateState(latest.sha);

  log("Update completed!");
  return true;
}

// ─── Launch ───────────────────────────────────────────────────────────────────

async function launchApp(): Promise<void> {
  info("Launching NovaCode...");

  const pkgManager = checkBun() ? "bun" : "npx";

  if (platform() === "win32") {
    // Launch detached on Windows
    const child = spawn(pkgManager, ["electron", "packages/desktop"], {
      cwd: APP_DIR,
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    child.unref();
  } else {
    spawn(pkgManager, ["electron", "packages/desktop"], {
      cwd: APP_DIR,
      detached: true,
      stdio: "ignore",
    }).unref();
  }

  log("NovaCode is starting...");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
${BOLD}${CYAN}
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗            ║
║   ████╗  ██║██╔═══██╗██║   ██║██╔══██╗           ║
║   ██╔██╗ ██║██║   ██║██║   ██║███████║           ║
║   ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║           ║
║   ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║           ║
║   ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝           ║
║                                                   ║
║   AI Coding Assistant — Desktop Installer         ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
${RESET}`);

  const isUpdate = existsSync(join(APP_DIR, ".git"));

  if (isUpdate) {
    step("UPDATE MODE");
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      await performUpdate();
    }
    await launchApp();
    return;
  }

  // ─── Fresh Install ────────────────────────────────────────────────────────

  step("CHECKING PREREQUISITES");

  // Git
  if (!checkGit()) {
    error("Git is required. Install from https://git-scm.com");
    info("Or run: winget install Git.Git");
    process.exit(1);
  }
  log("Git found");

  // Node.js
  if (!checkNode()) {
    const installed = await installNode();
    if (!installed) {
      error("Node.js 18+ is required");
      process.exit(1);
    }
  }
  log("Node.js found");

  // Bun (optional, falls back to npm)
  if (!checkBun()) {
    await installBun();
  }
  if (checkBun()) {
    log("Bun found");
  } else {
    warn("Bun not available, will use npm");
  }

  // ─── Download ────────────────────────────────────────────────────────────

  step("DOWNLOADING NOVACODE");

  const cloned = await cloneRepo();
  if (!cloned) {
    error("Failed to download NovaCode");
    process.exit(1);
  }

  // ─── Install Dependencies ────────────────────────────────────────────────

  step("INSTALLING DEPENDENCIES");

  const depsInstalled = await installDependencies();
  if (!depsInstalled) {
    error("Failed to install dependencies");
    process.exit(1);
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  step("BUILDING NOVACODE");

  const built = await buildProject();
  if (!built) {
    error("Build failed");
    process.exit(1);
  }

  // ─── Setup ───────────────────────────────────────────────────────────────

  step("SETTING UP");

  createShortcut();

  // Save initial state
  const latest = await getLatestCommit();
  if (latest) saveUpdateState(latest.sha);

  // Create config directory
  mkdirSync(join(homedir(), ".nova"), { recursive: true });

  log("Setup complete!");

  // ─── Launch ──────────────────────────────────────────────────────────────

  console.log(`
${GREEN}${BOLD}╔═══════════════════════════════════════════════════╗
║                                                   ║
║   ✅ NovaCode installed successfully!             ║
║                                                   ║
║   Location: ${INSTALL_DIR.padEnd(37)}║
║                                                   ║
║   Starting NovaCode...                            ║
║                                                   ║
╚═══════════════════════════════════════════════════╝${RESET}
`);

  await sleep(1000);
  await launchApp();
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  error(`Installation failed: ${err.message}`);
  process.exit(1);
});
