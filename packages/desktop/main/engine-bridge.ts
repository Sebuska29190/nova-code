import { ipcMain, BrowserWindow, dialog } from "electron";
import { join } from "path";
import { homedir } from "os";
import { mkdir, readFile, writeFile } from "fs/promises";

/**
 * Bridge between Electron main process and the engine.
 * Handles IPC communication and forwards engine events to renderer.
 *
 * This file uses only Node.js APIs (no Bun) to work in Electron's main process.
 */

// Inline types to avoid cross-package import issues in Electron main
interface ModelDef {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
}

interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: "anthropic-messages" | "openai-chat";
  apiKey?: string;
  enabled: boolean;
  models: ModelDef[];
}

interface NovaConfig {
  activeProviderId: string;
  activeModelId: string;
  providers: Record<string, ProviderConfig>;
  theme: "dark" | "light" | "system";
  locale: string;
  maxTokens: number;
  workingDirectory: string;
}

// Model catalog (inline to avoid Bun imports)
const MODEL_CATALOG: Record<string, { id: string; name: string; baseUrl: string; apiFormat: "anthropic-messages" | "openai-chat"; models: ModelDef[] }> = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    apiFormat: "anthropic-messages",
    models: [
      { id: "claude-opus-4-8", name: "Claude Opus 4.8", contextWindow: 200000, maxOutputTokens: 32768 },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextWindow: 200000, maxOutputTokens: 16384 },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", contextWindow: 200000, maxOutputTokens: 8192 },
    ],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiFormat: "openai-chat",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 131072, maxOutputTokens: 65536 },
      { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 131072, maxOutputTokens: 65536 },
    ],
  },
  zai: {
    id: "zai",
    name: "Z.AI (GLM)",
    baseUrl: "https://api.z.ai/api/anthropic",
    apiFormat: "anthropic-messages",
    models: [
      { id: "glm-5.2", name: "GLM-5.2", contextWindow: 1000000, maxOutputTokens: 384000 },
      { id: "glm-5-turbo", name: "GLM-5-Turbo", contextWindow: 200000, maxOutputTokens: 64000 },
    ],
  },
  qwen: {
    id: "qwen",
    name: "Qwen (Alibaba)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiFormat: "openai-chat",
    models: [
      { id: "qwen-plus", name: "Qwen Plus", contextWindow: 131072, maxOutputTokens: 65536 },
      { id: "qwen-turbo", name: "Qwen Turbo", contextWindow: 131072, maxOutputTokens: 65536 },
    ],
  },
  kimi: {
    id: "kimi",
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.cn/v1",
    apiFormat: "openai-chat",
    models: [
      { id: "moonshot-v1-128k", name: "Moonshot V1 128K", contextWindow: 131072, maxOutputTokens: 65536 },
    ],
  },
  mimo: {
    id: "mimo",
    name: "MiMo (Xiaomi)",
    baseUrl: "https://api.xiaomimimo.com/v1",
    apiFormat: "openai-chat",
    models: [
      { id: "mimo-v2.5-pro", name: "MiMo V2.5 Pro", contextWindow: 1000000, maxOutputTokens: 131072 },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiFormat: "openai-chat",
    models: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (via OpenRouter)", contextWindow: 200000, maxOutputTokens: 16384 },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (via OpenRouter)", contextWindow: 131072, maxOutputTokens: 65536 },
    ],
  },
};

// Config store path
const CONFIG_DIR = join(homedir(), ".nova");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: NovaConfig = {
  activeProviderId: "deepseek",
  activeModelId: "deepseek-chat",
  providers: {},
  theme: "dark",
  locale: "en",
  maxTokens: 8192,
  workingDirectory: homedir(),
};

export class EngineBridge {
  private mainWindow: BrowserWindow | null = null;
  private abortController: AbortController | null = null;
  private isGenerating = false;
  private config: NovaConfig = { ...DEFAULT_CONFIG };
  private totalTokensUsed = 0;
  private totalCost = 0;

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
  }

  register(): void {
    ipcMain.handle("engine:sendMessage", async (_event, message: string) => {
      await this.handleMessage(message);
    });

    ipcMain.handle("engine:abort", async () => {
      this.abortController?.abort();
      this.isGenerating = false;
      this.send("engine:done");
    });

    ipcMain.handle("engine:status", async () => ({
      isGenerating: this.isGenerating,
      workingDirectory: this.config.workingDirectory,
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
    }));

    ipcMain.handle("engine:providers", async () => this.getProviders());
    ipcMain.handle("engine:models", async (_event, providerId: string) => this.getModels(providerId));

    ipcMain.handle("engine:setProvider", async (_event, providerId: string, modelId: string) => {
      this.config.activeProviderId = providerId;
      this.config.activeModelId = modelId;
      await this.saveConfig();
      return { success: true };
    });

    ipcMain.handle("engine:setApiKey", async (_event, providerId: string, apiKey: string) => {
      if (!this.config.providers[providerId]) {
        const catalog = MODEL_CATALOG[providerId];
        this.config.providers[providerId] = {
          id: providerId,
          name: catalog?.name ?? providerId,
          baseUrl: catalog?.baseUrl ?? "",
          apiFormat: catalog?.apiFormat ?? "openai-chat",
          enabled: true,
          models: catalog?.models ?? [],
        };
      }
      this.config.providers[providerId].apiKey = apiKey;
      this.config.providers[providerId].enabled = true;
      await this.saveConfig();
      return { success: true };
    });

    ipcMain.handle("engine:getConfig", async () => this.config);

    ipcMain.handle("engine:updateConfig", async (_event, updates: Record<string, unknown>) => {
      Object.assign(this.config, updates);
      await this.saveConfig();
      return { success: true };
    });

    ipcMain.handle("dialog:openDirectory", async () => {
      const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
      return result.canceled ? null : result.filePaths[0];
    });
  }

  private async handleMessage(userInput: string): Promise<void> {
    if (this.isGenerating) {
      this.send("engine:error", "Already generating. Wait or abort.");
      return;
    }

    this.isGenerating = true;
    this.abortController = new AbortController();

    try {
      const provider = this.config.providers[this.config.activeProviderId];
      if (!provider?.apiKey) {
        await this.sendSetupInstructions();
        return;
      }

      // Make real API call
      await this.callLLM(provider, userInput);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.send("engine:done");
      } else {
        this.send("engine:error", error instanceof Error ? error.message : String(error));
      }
    } finally {
      this.isGenerating = false;
    }
  }

  private async callLLM(provider: ProviderConfig, userInput: string): Promise<void> {
    const systemPrompt = `You are NovaCode, an AI coding assistant. You help users write, debug, and understand code. Be concise and direct. Show code when relevant.`;

    if (provider.apiFormat === "anthropic-messages") {
      await this.callAnthropic(provider, userInput, systemPrompt);
    } else {
      await this.callOpenAI(provider, userInput, systemPrompt);
    }
  }

  private async callAnthropic(provider: ProviderConfig, userInput: string, systemPrompt: string): Promise<void> {
    const url = `${provider.baseUrl}/v1/messages`;
    const body = {
      model: this.config.activeModelId,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userInput }],
      stream: true,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: this.abortController!.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    await this.processSSEStream(response);
  }

  private async callOpenAI(provider: ProviderConfig, userInput: string, systemPrompt: string): Promise<void> {
    const url = `${provider.baseUrl}/chat/completions`;
    const body = {
      model: this.config.activeModelId,
      max_tokens: this.config.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      stream: true,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: this.abortController!.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    await this.processSSEStream(response);
  }

  private async processSSEStream(response: Response): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            this.send("engine:done");
            return;
          }

          try {
            const event = JSON.parse(data);
            // Anthropic format
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              this.send("engine:text", event.delta.text);
            }
            // OpenAI format
            else if (event.choices?.[0]?.delta?.content) {
              this.send("engine:text", event.choices[0].delta.content);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.send("engine:done");
  }

  private async sendSetupInstructions(): Promise<void> {
    const text = `Welcome to NovaCode! 🚀

To get started, configure an LLM provider:

1. Go to Settings (Ctrl+,)
2. Select a provider (DeepSeek has a free tier)
3. Get an API key from the provider's website
4. Paste the key and save

Providers: Anthropic, DeepSeek, Z.AI, Qwen, Kimi, MiMo, OpenRouter`;

    const words = text.split(" ");
    for (const word of words) {
      if (this.abortController?.signal.aborted) break;
      this.send("engine:text", word + " ");
      await new Promise((r) => setTimeout(r, 20));
    }
    this.send("engine:done");
  }

  private send(channel: string, ...args: unknown[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  private getProviders(): Array<{ id: string; name: string; enabled: boolean; hasKey: boolean }> {
    return Object.entries(MODEL_CATALOG).map(([id, p]) => ({
      id,
      name: p.name,
      enabled: this.config.providers[id]?.enabled ?? false,
      hasKey: !!this.config.providers[id]?.apiKey,
    }));
  }

  private getModels(providerId: string): Array<{ id: string; name: string; contextWindow: number; maxOutput: number }> {
    return (MODEL_CATALOG[providerId]?.models ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      contextWindow: m.contextWindow,
      maxOutput: m.maxOutputTokens,
    }));
  }

  private async loadConfig(): Promise<void> {
    try {
      await mkdir(CONFIG_DIR, { recursive: true });
      const data = await readFile(CONFIG_PATH, "utf-8");
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await mkdir(CONFIG_DIR, { recursive: true });
      await writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  }
}
