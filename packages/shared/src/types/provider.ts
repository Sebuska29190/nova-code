/** LLM provider API format */
export type ApiFormat = "anthropic-messages" | "openai-chat";

/** Reasoning effort level */
export type ReasoningLevel = "off" | "low" | "medium" | "high" | "max";

/** Model definition */
export interface ModelDef {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsReasoning: boolean;
  defaultReasoningLevel?: ReasoningLevel;
}

/** Provider configuration */
export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: ApiFormat;
  apiKey?: string;
  models: ModelDef[];
  enabled: boolean;
}

/** Streaming chunk from provider */
export interface StreamChunk {
  type: "text" | "thinking" | "tool_use" | "error" | "done";
  content?: string;
  toolName?: string;
  toolInput?: string;
  error?: string;
}

/** Provider interface — all providers implement this */
export interface LLMProvider {
  readonly id: string;
  readonly name: string;

  /** Stream a completion from the model */
  stream(
    messages: Message[],
    options: StreamOptions,
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /** Check if provider is configured and reachable */
  isReady(): boolean;
}

/** Options for streaming */
export interface StreamOptions {
  model: string;
  maxTokens?: number;
  reasoningLevel?: ReasoningLevel;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  abortSignal?: AbortSignal;
}

// Forward declarations — resolved from other type files
import type { Message } from "./message.js";
import type { ToolDefinition } from "./tool.js";
