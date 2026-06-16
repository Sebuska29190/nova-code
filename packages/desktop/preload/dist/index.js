"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/**
 * Preload script — exposes safe APIs to the renderer process.
 * All communication goes through IPC with context isolation.
 */
electron_1.contextBridge.exposeInMainWorld("nova", {
    // Window controls
    window: {
        minimize: () => electron_1.ipcRenderer.invoke("window:minimize"),
        maximize: () => electron_1.ipcRenderer.invoke("window:maximize"),
        close: () => electron_1.ipcRenderer.invoke("window:close"),
    },
    // App info
    app: {
        info: () => electron_1.ipcRenderer.invoke("app:info"),
    },
    // Engine communication
    engine: {
        sendMessage: (message) => electron_1.ipcRenderer.invoke("engine:sendMessage", message),
        abort: () => electron_1.ipcRenderer.invoke("engine:abort"),
        status: () => electron_1.ipcRenderer.invoke("engine:status"),
        providers: () => electron_1.ipcRenderer.invoke("engine:providers"),
        models: (providerId) => electron_1.ipcRenderer.invoke("engine:models", providerId),
        setProvider: (providerId, modelId) => electron_1.ipcRenderer.invoke("engine:setProvider", providerId, modelId),
        setApiKey: (providerId, apiKey) => electron_1.ipcRenderer.invoke("engine:setApiKey", providerId, apiKey),
        getConfig: () => electron_1.ipcRenderer.invoke("engine:getConfig"),
        updateConfig: (updates) => electron_1.ipcRenderer.invoke("engine:updateConfig", updates),
    },
    // Dialog
    dialog: {
        openDirectory: () => electron_1.ipcRenderer.invoke("dialog:openDirectory"),
    },
    // Event listeners
    on: (channel, callback) => {
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
            electron_1.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
        }
    },
    off: (channel, callback) => {
        electron_1.ipcRenderer.removeListener(channel, callback);
    },
});
//# sourceMappingURL=index.js.map