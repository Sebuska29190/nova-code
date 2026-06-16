import type { TokenUsage } from "./message.js";

export type AgentStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface ToolCallRecord {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  timestamp: number;
}

export interface AgentTask {
  id: string;
  parentId?: string;
  label: string;
  status: AgentStatus;
  prompt: string;
  result?: string;
  tokenUsage?: TokenUsage;
  startTime: number;
  endTime?: number;
  children: AgentTask[];
  toolCalls: ToolCallRecord[];
}

export type AgentIsolation = "worktree" | "tempdir" | "none";

export interface AgentSpawnOptions {
  label?: string;
  isolation?: AgentIsolation;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  workingDirectory?: string;
  concurrency?: number;
}

export interface AgentResult {
  taskId: string;
  output: string;
  tokenUsage?: TokenUsage;
  error?: string;
}
