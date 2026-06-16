import type { LLMProvider, ProviderConfig } from "@nova/shared";

/**
 * Registry of LLM providers — manages multiple providers
 * and handles provider selection.
 */
export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();

  /** Register a provider */
  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Get a provider by ID */
  get(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  /** List all registered providers */
  list(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /** Check if a provider is registered */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /** Remove a provider */
  unregister(id: string): boolean {
    return this.providers.delete(id);
  }
}
