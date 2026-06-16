import { contextBridge, ipcRenderer } from "electron";

/**
 * Preload script — exposes safe APIs to the renderer process.
 * All communication goes through IPC with context isolation.
 */
contextBridge.exposeInMainWorld("nova", {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },

  // App info
  app: {
    info: () => ipcRenderer.invoke("app:info"),
  },

  // Engine communication
  engine: {
    sendMessage: (message: string) => ipcRenderer.invoke("engine:sendMessage", message),
    abort: () => ipcRenderer.invoke("engine:abort"),
    status: () => ipcRenderer.invoke("engine:status"),
    providers: () => ipcRenderer.invoke("engine:providers"),
    models: (providerId: string) => ipcRenderer.invoke("engine:models", providerId),
    setProvider: (providerId: string, modelId: string) =>
      ipcRenderer.invoke("engine:setProvider", providerId, modelId),
    setApiKey: (providerId: string, apiKey: string) =>
      ipcRenderer.invoke("engine:setApiKey", providerId, apiKey),
    getConfig: () => ipcRenderer.invoke("engine:getConfig"),
    updateConfig: (updates: Record<string, unknown>) =>
      ipcRenderer.invoke("engine:updateConfig", updates),
  },

  // Dialog
  dialog: {
    openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  },

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      "engine:text",
      "engine:thinking",
      "engine:toolStart",
      "engine:toolEnd",
      "engine:tokenUsage",
      "engine:error",
      "engine:done",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

// Type declaration for the renderer
export interface NovaAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  app: {
    info: () => Promise<{ version: string; platform: string; arch: string }>;
  };
  engine: {
    sendMessage: (message: string) => Promise<void>;
    abort: () => Promise<void>;
    status: () => Promise<{ isGenerating: boolean; workingDirectory: string; totalTokensUsed: number; totalCost: number }>;
    providers: () => Promise<Array<{ id: string; name: string; enabled: boolean; hasKey: boolean }>>;
    models: (providerId: string) => Promise<Array<{ id: string; name: string; contextWindow: number; maxOutput: number }>>;
    setProvider: (providerId: string, modelId: string) => Promise<{ success: boolean }>;
    setApiKey: (providerId: string, apiKey: string) => Promise<{ success: boolean }>;
    getConfig: () => Promise<Record<string, unknown>>;
    updateConfig: (updates: Record<string, unknown>) => Promise<{ success: boolean }>;
  };
  dialog: {
    openDirectory: () => Promise<string | null>;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    nova: NovaAPI;
  }
}
