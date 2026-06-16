import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "path";
import { EngineBridge } from "./engine-bridge";

// Detect development mode
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
const engineBridge = new EngineBridge();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0a0a0a",
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

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Register window control IPC handlers
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle("window:close", () => mainWindow?.close());

// Register app info IPC handler
ipcMain.handle("app:info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
}));

// Register engine IPC handlers
engineBridge.register();

app.whenReady().then(async () => {
  createWindow();
  await engineBridge.initialize();
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
