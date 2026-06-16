import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  thinking?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: string;
  result?: string;
  status: "running" | "completed" | "error";
}

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  currentModel: string;
  currentProvider: string;

  addMessage: (msg: ChatMessage) => void;
  appendToLastMessage: (text: string) => void;
  setStreamingDone: () => void;
  setGenerating: (val: boolean) => void;
  setModel: (model: string) => void;
  setProvider: (provider: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isGenerating: false,
  currentModel: "glm-5-turbo",
  currentProvider: "zai",

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  appendToLastMessage: (text) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + text };
      }
      return { messages: msgs };
    }),

  setStreamingDone: () =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant" && last.isStreaming) {
        msgs[msgs.length - 1] = { ...last, isStreaming: false };
      }
      return { messages: msgs };
    }),

  setGenerating: (isGenerating) => set({ isGenerating }),
  setModel: (currentModel) => set({ currentModel }),
  setProvider: (currentProvider) => set({ currentProvider }),
  clearMessages: () => set({ messages: [] }),
}));
