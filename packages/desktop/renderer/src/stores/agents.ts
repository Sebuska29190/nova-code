import { create } from "zustand";

export interface AgentToolCall {
  id: string;
  name: string;
  input: string;
  result?: string;
  status: "running" | "completed" | "error";
  startTime: number;
  endTime?: number;
}

export interface AgentTask {
  id: string;
  parentId?: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  prompt: string;
  result?: string;
  tokenUsage?: { input: number; output: number };
  startTime: number;
  endTime?: number;
  children: AgentTask[];
  toolCalls: AgentToolCall[];
}

interface AgentState {
  agents: AgentTask[];
  activeAgentId: string | null;

  addAgent: (agent: AgentTask) => void;
  updateAgent: (id: string, patch: Partial<AgentTask>) => void;
  addToolCall: (agentId: string, toolCall: AgentToolCall) => void;
  updateToolCall: (
    agentId: string,
    toolCallId: string,
    patch: Partial<AgentToolCall>
  ) => void;
  removeAgent: (id: string) => void;
  setActiveAgent: (id: string | null) => void;
}

function updateInTree(
  agents: AgentTask[],
  id: string,
  patch: Partial<AgentTask>
): AgentTask[] {
  return agents.map((agent) => {
    if (agent.id === id) return { ...agent, ...patch };
    if (agent.children.length > 0)
      return { ...agent, children: updateInTree(agent.children, id, patch) };
    return agent;
  });
}

function addToolCallInTree(
  agents: AgentTask[],
  agentId: string,
  toolCall: AgentToolCall
): AgentTask[] {
  return agents.map((agent) => {
    if (agent.id === agentId)
      return { ...agent, toolCalls: [...agent.toolCalls, toolCall] };
    if (agent.children.length > 0)
      return {
        ...agent,
        children: addToolCallInTree(agent.children, agentId, toolCall),
      };
    return agent;
  });
}

function updateToolCallInTree(
  agents: AgentTask[],
  agentId: string,
  toolCallId: string,
  patch: Partial<AgentToolCall>
): AgentTask[] {
  return agents.map((agent) => {
    if (agent.id === agentId)
      return {
        ...agent,
        toolCalls: agent.toolCalls.map((tc) =>
          tc.id === toolCallId ? { ...tc, ...patch } : tc
        ),
      };
    if (agent.children.length > 0)
      return {
        ...agent,
        children: updateToolCallInTree(
          agent.children,
          agentId,
          toolCallId,
          patch
        ),
      };
    return agent;
  });
}

function addChildInTree(
  agents: AgentTask[],
  parentId: string,
  child: AgentTask
): AgentTask[] {
  return agents.map((agent) => {
    if (agent.id === parentId)
      return { ...agent, children: [...agent.children, child] };
    if (agent.children.length > 0)
      return {
        ...agent,
        children: addChildInTree(agent.children, parentId, child),
      };
    return agent;
  });
}

function removeFromTree(agents: AgentTask[], id: string): AgentTask[] {
  return agents
    .filter((agent) => agent.id !== id)
    .map((agent) => ({
      ...agent,
      children: removeFromTree(agent.children, id),
    }));
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  activeAgentId: null,

  addAgent: (agent) => set((s) => {
    if (!agent.parentId) return { agents: [...s.agents, agent] };
    return { agents: addChildInTree(s.agents, agent.parentId, agent) };
  }),

  updateAgent: (id, patch) =>
    set((s) => ({ agents: updateInTree(s.agents, id, patch) })),

  addToolCall: (agentId, toolCall) =>
    set((s) => ({
      agents: addToolCallInTree(s.agents, agentId, toolCall),
    })),

  updateToolCall: (agentId, toolCallId, patch) =>
    set((s) => ({
      agents: updateToolCallInTree(s.agents, agentId, toolCallId, patch),
    })),

  removeAgent: (id) =>
    set((s) => ({
      agents: removeFromTree(s.agents, id),
      activeAgentId: s.activeAgentId === id ? null : s.activeAgentId,
    })),

  setActiveAgent: (activeAgentId) => set({ activeAgentId }),
}));
