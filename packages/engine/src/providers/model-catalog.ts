import type { ModelDef, ProviderConfig } from "@nova/shared";

/** Model catalog — all known models across providers */
export const MODEL_CATALOG: Record<string, ProviderConfig> = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    apiFormat: "anthropic-messages",
    enabled: false,
    models: [
      {
        id: "claude-opus-4-8",
        name: "Claude Opus 4.8",
        contextWindow: 200000,
        maxOutputTokens: 32768,
        supportsVision: true,
        supportsReasoning: true,
        defaultReasoningLevel: "high",
      },
      {
        id: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        contextWindow: 200000,
        maxOutputTokens: 16384,
        supportsVision: true,
        supportsReasoning: true,
        defaultReasoningLevel: "medium",
      },
      {
        id: "claude-haiku-4-5",
        name: "Claude Haiku 4.5",
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsVision: true,
        supportsReasoning: false,
      },
    ],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiFormat: "openai-chat",
    enabled: false,
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek V3",
        contextWindow: 131072,
        maxOutputTokens: 65536,
        supportsVision: false,
        supportsReasoning: true,
        defaultReasoningLevel: "medium",
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek R1",
        contextWindow: 131072,
        maxOutputTokens: 65536,
        supportsVision: false,
        supportsReasoning: true,
        defaultReasoningLevel: "max",
      },
    ],
  },
  zai: {
    id: "zai",
    name: "Z.AI (GLM)",
    baseUrl: "https://api.z.ai/api/anthropic",
    apiFormat: "anthropic-messages",
    enabled: false,
    models: [
      {
        id: "glm-5.2",
        name: "GLM-5.2",
        contextWindow: 1000000,
        maxOutputTokens: 384000,
        supportsVision: false,
        supportsReasoning: false,
      },
      {
        id: "glm-5-turbo",
        name: "GLM-5-Turbo",
        contextWindow: 200000,
        maxOutputTokens: 64000,
        supportsVision: false,
        supportsReasoning: true,
        defaultReasoningLevel: "medium",
      },
    ],
  },
  qwen: {
    id: "qwen",
    name: "Qwen (Alibaba)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiFormat: "openai-chat",
    enabled: false,
    models: [
      {
        id: "qwen-plus",
        name: "Qwen Plus",
        contextWindow: 131072,
        maxOutputTokens: 65536,
        supportsVision: false,
        supportsReasoning: true,
        defaultReasoningLevel: "medium",
      },
      {
        id: "qwen-turbo",
        name: "Qwen Turbo",
        contextWindow: 131072,
        maxOutputTokens: 65536,
        supportsVision: false,
        supportsReasoning: false,
      },
    ],
  },
  kimi: {
    id: "kimi",
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.cn/v1",
    apiFormat: "openai-chat",
    enabled: false,
    models: [
      {
        id: "moonshot-v1-128k",
        name: "Moonshot V1 128K",
        contextWindow: 131072,
        maxOutputTokens: 65536,
        supportsVision: false,
        supportsReasoning: false,
      },
    ],
  },
  mimo: {
    id: "mimo",
    name: "MiMo (Xiaomi)",
    baseUrl: "https://api.xiaomimimo.com/v1",
    apiFormat: "openai-chat",
    enabled: false,
    models: [
      {
        id: "mimo-v2.5-pro",
        name: "MiMo V2.5 Pro",
        contextWindow: 1000000,
        maxOutputTokens: 131072,
        supportsVision: false,
        supportsReasoning: true,
        defaultReasoningLevel: "high",
      },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiFormat: "openai-chat",
    enabled: false,
    models: [
      {
        id: "anthropic/claude-sonnet-4",
        name: "Claude Sonnet 4 (via OpenRouter)",
        contextWindow: 200000,
        maxOutputTokens: 16384,
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: "deepseek/deepseek-chat",
        name: "DeepSeek V3 (via OpenRouter)",
        contextWindow: 131072,
        maxOutputTokens: 65536,
        supportsVision: false,
        supportsReasoning: true,
      },
    ],
  },
};

/** Get all provider configs */
export function getAllProviders(): ProviderConfig[] {
  return Object.values(MODEL_CATALOG);
}

/** Get provider config by ID */
export function getProvider(id: string): ProviderConfig | undefined {
  return MODEL_CATALOG[id];
}

/** Get models for a provider */
export function getModels(providerId: string): ModelDef[] {
  return MODEL_CATALOG[providerId]?.models ?? [];
}

/** Get model info by provider+model ID */
export function getModel(providerId: string, modelId: string): ModelDef | undefined {
  return MODEL_CATALOG[providerId]?.models.find((m) => m.id === modelId);
}

/** Calculate cost estimate (rough, per 1K tokens) */
export function estimateCost(providerId: string, modelId: string, inputTokens: number, outputTokens: number): number {
  const costs: Record<string, { input: number; output: number }> = {
    "claude-opus-4-8": { input: 0.015, output: 0.075 },
    "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
    "claude-haiku-4-5": { input: 0.00025, output: 0.00125 },
    "deepseek-chat": { input: 0.00014, output: 0.00028 },
    "deepseek-reasoner": { input: 0.00055, output: 0.00219 },
    "glm-5.2": { input: 0.001, output: 0.004 },
    "glm-5-turbo": { input: 0.0005, output: 0.002 },
    "qwen-plus": { input: 0.0004, output: 0.0012 },
    "moonshot-v1-128k": { input: 0.0012, output: 0.0012 },
    "mimo-v2.5-pro": { input: 0.001, output: 0.004 },
  };

  const cost = costs[modelId] ?? { input: 0.001, output: 0.003 };
  return (inputTokens * cost.input + outputTokens * cost.output) / 1000;
}
