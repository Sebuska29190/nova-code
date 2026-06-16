import type { AgentTask, AgentStatus } from "@nova/shared";

export interface QueueTask {
  id: string;
  label: string;
  prompt: string;
  parentId?: string;
  priority: number;
  execute: () => Promise<string>;
}

export interface TaskQueueOptions {
  concurrency?: number;
  onTaskStart?: (task: AgentTask) => void;
  onTaskComplete?: (task: AgentTask) => void;
  onTaskError?: (task: AgentTask, error: Error) => void;
}

export class TaskQueue {
  private queue: QueueTask[] = [];
  private running = new Map<string, AgentTask>();
  private completed = new Map<string, AgentTask>();
  private concurrency: number;
  private onTaskStart?: (task: AgentTask) => void;
  private onTaskComplete?: (task: AgentTask) => void;
  private onTaskError?: (task: AgentTask, error: Error) => void;

  constructor(options: TaskQueueOptions = {}) {
    this.concurrency = options.concurrency ?? 8;
    this.onTaskStart = options.onTaskStart;
    this.onTaskComplete = options.onTaskComplete;
    this.onTaskError = options.onTaskError;
  }

  enqueue(task: QueueTask): string {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.processNext();
    return task.id;
  }

  dequeue(): QueueTask | undefined {
    return this.queue.shift();
  }

  cancel(taskId: string): boolean {
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      this.completed.set(taskId, {
        id: taskId,
        label: "",
        status: "cancelled",
        prompt: "",
        startTime: Date.now(),
        endTime: Date.now(),
        children: [],
        toolCalls: [],
      });
      return true;
    }

    const runningTask = this.running.get(taskId);
    if (runningTask) {
      runningTask.status = "cancelled";
      runningTask.endTime = Date.now();
      this.running.delete(taskId);
      this.completed.set(taskId, runningTask);
      this.processNext();
      return true;
    }

    return false;
  }

  getStatus(): {
    queued: number;
    running: number;
    completed: number;
    tasks: AgentTask[];
  } {
    const allTasks = [
      ...this.queue.map(q => ({
        id: q.id,
        parentId: q.parentId,
        label: q.label,
        status: "pending" as AgentStatus,
        prompt: q.prompt,
        startTime: 0,
        children: [],
        toolCalls: [],
      })),
      ...Array.from(this.running.values()),
      ...Array.from(this.completed.values()),
    ];

    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
      tasks: allTasks,
    };
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.running.get(taskId) ?? this.completed.get(taskId);
  }

  private async processNext(): Promise<void> {
    if (this.running.size >= this.concurrency) return;
    if (this.queue.length === 0) return;

    const task = this.dequeue();
    if (!task) return;

    const agentTask: AgentTask = {
      id: task.id,
      parentId: task.parentId,
      label: task.label,
      status: "running",
      prompt: task.prompt,
      startTime: Date.now(),
      children: [],
      toolCalls: [],
    };

    this.running.set(task.id, agentTask);
    this.onTaskStart?.(agentTask);

    try {
      const result = await task.execute();
      agentTask.result = result;
      agentTask.status = "completed";
      agentTask.endTime = Date.now();
      this.onTaskComplete?.(agentTask);
    } catch (error) {
      agentTask.status = "failed";
      agentTask.endTime = Date.now();
      agentTask.result = error instanceof Error ? error.message : String(error);
      this.onTaskError?.(agentTask, error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running.delete(task.id);
      this.completed.set(task.id, agentTask);
      this.processNext();
    }
  }
}
