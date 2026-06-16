import type { LLMProvider, ProviderConfig } from "@nova/shared";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatProvider } from "./openai-compat.js";
import { MODEL_CATALOG } from "./model-catalog.js";
import { ProviderRegistry } from "./registry.js";

/**
 * Provider factory — creates providers from config
 * and manages the provider registry.
 */
export class ProviderFactory {
  private registry: ProviderRegistry;

  constructor() {
    this.registry = new ProviderRegistry();
  }

  /** Get the provider registry */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }

  /** Initialize with all known providers (disabled by default) */
  initializeAll(): void {
    for (const config of Object.values(MODEL_CATALOG)) {
      this.registerFromConfig(config);
    }
  }

  /** Register a provider from config */
  registerFromConfig(config: ProviderConfig): void {
    const provider = this.createProvider(config);
    if (provider) {
      this.registry.register(provider);
    }
  }

  /** Update provider config (e.g., when user sets API key) */
  updateConfig(providerId: string, updates: Partial<ProviderConfig>): void {
    const existing = MODEL_CATALOG[providerId];
    if (!existing) return;

    const config = { ...existing, ...updates };
    MODEL_CATALOG[providerId] = config;

    // Re-register with updated config
    this.registerFromConfig(config);
  }

  /** Create a provider instance from config */
  private createProvider(config: ProviderConfig): LLMProvider | null {
    switch (config.apiFormat) {
      case "anthropic-messages":
        return new AnthropicProvider(config);
      case "openai-chat":
        return new OpenAICompatProvider(config);
      default:
        console.warn(`Unknown API format: ${config.apiFormat}`);
        return null;
    }
  }
}
