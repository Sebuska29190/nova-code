import { join } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import type { ProviderConfig } from "@nova/shared";

/**
 * Configuration store — persists settings to disk.
 * Stored at ~/.nova/config.json
 */
export interface NovaConfig {
  activeProviderId: string;
  activeModelId: string;
  providers: Record<string, ProviderConfig>;
  theme: "dark" | "light" | "system";
  locale: string;
  maxTokens: number;
  workingDirectory: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

const DEFAULT_CONFIG: NovaConfig = {
  activeProviderId: "deepseek",
  activeModelId: "deepseek-chat",
  providers: {},
  theme: "dark",
  locale: "en",
  maxTokens: 8192,
  workingDirectory: homedir(),
};

export class ConfigStore {
  private configPath: string;
  private config: NovaConfig;

  constructor(configDir?: string) {
    const dir = configDir ?? join(homedir(), ".nova");
    this.configPath = join(dir, "config.json");
    this.config = { ...DEFAULT_CONFIG };
  }

  /** Load config from disk */
  async load(): Promise<NovaConfig> {
    try {
      const file = Bun.file(this.configPath);
      if (await file.exists()) {
        const data = JSON.parse(await file.text());
        this.config = { ...DEFAULT_CONFIG, ...data };
      }
    } catch {
      // Use defaults
    }
    return this.config;
  }

  /** Save config to disk */
  async save(): Promise<void> {
    const dir = this.configPath.replace("/config.json", "").replace("\\config.json", "");
    await mkdir(dir, { recursive: true });
    await Bun.write(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /** Get current config */
  get(): NovaConfig {
    return { ...this.config };
  }

  /** Update config */
  update(updates: Partial<NovaConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** Set active provider + model */
  setActiveProvider(providerId: string, modelId: string): void {
    this.config.activeProviderId = providerId;
    this.config.activeModelId = modelId;
  }

  /** Set API key for a provider */
  setApiKey(providerId: string, apiKey: string): void {
    if (!this.config.providers[providerId]) {
      this.config.providers[providerId] = {
        id: providerId,
        name: providerId,
        baseUrl: "",
        apiFormat: "openai-chat",
        enabled: true,
        models: [],
      };
    }
    this.config.providers[providerId].apiKey = apiKey;
    this.config.providers[providerId].enabled = true;
  }

  /** Get API key for a provider */
  getApiKey(providerId: string): string | undefined {
    return this.config.providers[providerId]?.apiKey;
  }

  /** Check if any provider is configured */
  hasConfiguredProvider(): boolean {
    return Object.values(this.config.providers).some(
      (p) => p.enabled && p.apiKey
    );
  }
}
