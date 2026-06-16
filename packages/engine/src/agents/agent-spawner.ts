import { nanoid } from "nanoid";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AgentTask,
  AgentSpawnOptions,
  AgentStatus,
  AgentIsolation,
  AgentResult,
  TokenUsage,
  LLMProvider,
} from "@nova/shared";
import { TaskQueue, type QueueTask } from "./task-queue.js";

export interface AgentSpawnerOptions {
  provider: LLMProvider;
  model: string;
  workingDirectory: string;
  concurrency?: number;
  systemPrompt?: string;
}

export interface SpawnedAgent {
  task: AgentTask;
  abortController: AbortController;
  sendMessage: (message: string) => Promise<AgentResult>;
  abort: () => void;
}

export class AgentSpawner {
  private provider: LLMProvider;
  private defaultModel: string;
  private workingDirectory: string;
  private systemPrompt?: string;
  private agents = new Map<string, SpawnedAgent>();
  private taskQueue: TaskQueue;

  constructor(options: AgentSpawnerOptions) {
    this.provider = options.provider;
    this.defaultModel = options.model;
    this.workingDirectory = options.workingDirectory;
    this.systemPrompt = options.systemPrompt;
    this.taskQueue = new TaskQueue({
      concurrency: options.concurrency ?? 8,
      onTaskStart: (task) => this.onTaskStart?.(task),
      onTaskComplete: (task) => this.onTaskComplete?.(task),
      onTaskError: (task, error) => this.onTaskError?.(task, error),
    });
  }

  onTaskStart?: (task: AgentTask) => void;
  onTaskComplete?: (task: AgentTask) => void;
  onTaskError?: (task: AgentTask, error: Error) => void;

  async spawn(
    prompt: string,
    options: AgentSpawnOptions = {},
  ): Promise<SpawnedAgent> {
    const id = nanoid();
    const label = options.label ?? `agent-${id.slice(0, 8)}`;
    const isolation = options.isolation ?? "none";
    const model = options.model ?? this.defaultModel;
    const maxTokens = options.maxTokens;

    const workingDirectory = await this.resolveWorkingDirectory(
      isolation,
      options.workingDirectory,
    );

    const abortController = new AbortController();

    const task: AgentTask = {
      id,
      label,
      status: "pending",
      prompt,
      startTime: Date.now(),
      children: [],
      toolCalls: [],
    };

    const agent: SpawnedAgent = {
      task,
      abortController,
      sendMessage: async (message: string): Promise<AgentResult> => {
        return this.executeAgent(id, message, {
          model,
          maxTokens,
          workingDirectory,
          abortSignal: abortController.signal,
        });
      },
      abort: () => {
        abortController.abort();
        const existing = this.agents.get(id);
        if (existing) {
          existing.task.status = "cancelled";
          existing.task.endTime = Date.now();
        }
      },
    };

    this.agents.set(id, agent);

    const queueTask: QueueTask = {
      id,
      label,
      prompt,
      priority: 0,
      execute: () => agent.sendMessage(prompt).then(r => r.output),
    };

    this.taskQueue.enqueue(queueTask);

    return agent;
  }

  abort(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.abort();
    return true;
  }

  getStatus(agentId: string): AgentTask | undefined {
    return this.agents.get(agentId)?.task;
  }

  getAllAgents(): AgentTask[] {
    return Array.from(this.agents.values()).map(a => a.task);
  }

  getQueueStatus() {
    return this.taskQueue.getStatus();
  }

  private async resolveWorkingDirectory(
    isolation: AgentIsolation,
    customDir?: string,
  ): Promise<string> {
    if (isolation === "none") {
      return customDir ?? this.workingDirectory;
    }

    if (isolation === "tempdir") {
      const prefix = join(tmpdir(), "nova-agent-");
      return mkdtemp(prefix);
    }

    return customDir ?? this.workingDirectory;
  }

  private async executeAgent(
    agentId: string,
    prompt: string,
    options: {
      model: string;
      maxTokens?: number;
      workingDirectory: string;
      abortSignal: AbortSignal;
    },
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { taskId: agentId, output: "", error: "Agent not found" };
    }

    agent.task.status = "running";
    agent.task.startTime = Date.now();

    try {
      const messages = [
        {
          id: nanoid(),
          role: "user" as const,
          content: [{ type: "text" as const, text: prompt }],
          timestamp: Date.now(),
        },
      ];

      const stream = this.provider.stream(messages, {
        model: options.model,
        maxTokens: options.maxTokens,
        systemPrompt: this.systemPrompt,
        abortSignal: options.abortSignal,
      });

      let output = "";
      const tokenUsage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
      };

      for await (const chunk of stream) {
        if (chunk.type === "text") {
          output += chunk.content ?? "";
        }
        if (chunk.type === "error") {
          throw new Error(chunk.error ?? "Stream error");
        }
        if (chunk.type === "done") {
          break;
        }
      }

      agent.task.result = output;
      agent.task.status = "completed";
      agent.task.endTime = Date.now();
      agent.task.tokenUsage = tokenUsage;

      return { taskId: agentId, output, tokenUsage };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      agent.task.status = "failed";
      agent.task.endTime = Date.now();
      agent.task.result = errorMessage;

      return { taskId: agentId, output: "", error: errorMessage };
    }
  }
}
