import type { ProviderConfig } from "./provider.js";

export interface AppConfig {
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  locale: string;
  theme: "dark" | "light" | "system";
  telemetryEnabled: boolean;
}

export interface SessionState {
  id: string;
  conversationId: string;
  workingDirectory: string;
  startTime: number;
  totalTokens: number;
  totalCost: number;
}

export type AgentStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type AgentIsolation = "worktree" | "tempdir" | "none";

export interface AgentTask {
  id: string;
  parentId?: string;
  label: string;
  status: AgentStatus;
  prompt: string;
  result?: string;
  tokenUsage?: { input: number; output: number };
  startTime: number;
  endTime?: number;
  children: AgentTask[];
  toolCalls: AgentToolCall[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  input: string;
  result?: string;
  status: "running" | "completed" | "error";
  startTime: number;
  endTime?: number;
}

export interface AgentSpawnOptions {
  label?: string;
  isolation?: AgentIsolation;
  model?: string;
  maxTokens?: number;
  parentId?: string;
  abortSignal?: AbortSignal;
}

export interface AgentResult {
  agentId: string;
  result: string;
  tokenUsage: { input: number; output: number };
  duration: number;
  error?: string;
}
