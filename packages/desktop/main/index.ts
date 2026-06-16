import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { EngineBridge } from "./engine-bridge";

// Auto-updater loaded dynamically to avoid module not found errors
let autoUpdater: any = null;
try {
  autoUpdater = require("electron-updater").autoUpdater;
} catch {
  // electron-updater not available — auto-update disabled
}

// Detect development mode
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
const engineBridge = new EngineBridge();

// ─── First Run Setup ─────────────────────────────────────────────────────────

function isFirstRun(): boolean {
  const configDir = join(homedir(), ".nova");
  return !existsSync(configDir);
}

function ensureDirectories(): void {
  const dirs = [
    join(homedir(), ".nova"),
    join(homedir(), ".nova", "skills"),
    join(homedir(), ".nova", "plugins"),
    join(homedir(), ".nova", "memory"),
    join(homedir(), ".nova", "logs"),
  ];
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }
}

// ─── Auto Updater ────────────────────────────────────────────────────────────

function setupAutoUpdater(): void {
  if (!autoUpdater) {
    console.log("[updater] electron-updater not available, skipping auto-update setup");
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("[updater] Checking for updates...");
  });

  autoUpdater.on("update-available", (info: any) => {
    console.log(`[updater] Update available: ${info.version}`);
    mainWindow?.webContents.send("update:available", info);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] Already up to date");
  });

  autoUpdater.on("download-progress", (progress: any) => {
    mainWindow?.webContents.send("update:progress", progress.percent);
  });

  autoUpdater.on("update-downloaded", () => {
    console.log("[updater] Update downloaded, ready to install");
    mainWindow?.webContents.send("update:ready");
  });

  autoUpdater.on("error", (err: any) => {
    console.error("[updater] Error:", err.message);
  });

  // Check for updates 30s after startup, then every 4 hours
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 30_000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0a0a0a",
    show: false, // Show when ready
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Connect engine bridge to window
  engineBridge.setMainWindow(mainWindow);

  // Load renderer
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/dist/index.html"));
  }

  // Show when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle("window:close", () => mainWindow?.close());

ipcMain.handle("app:info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  isDev,
}));

ipcMain.handle("app:isFirstRun", () => isFirstRun());

ipcMain.handle("dialog:openDirectory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

// Update handlers
ipcMain.handle("update:check", async () => {
  if (!autoUpdater) return { available: false };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: !!result?.updateInfo };
  } catch {
    return { available: false };
  }
});

ipcMain.handle("update:download", async () => {
  if (!autoUpdater) return { success: false, error: "Auto-updater not available" };
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("update:install", () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall(false, true);
  }
});

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Ensure config directories exist
  ensureDirectories();

  // Register engine IPC handlers
  engineBridge.register();

  // Initialize engine
  await engineBridge.initialize();

  // Create window
  createWindow();

  // Setup auto-updater (production only)
  if (!isDev) {
    setupAutoUpdater();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
