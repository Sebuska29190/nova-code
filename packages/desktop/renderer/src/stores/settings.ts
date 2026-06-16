import { create } from "zustand";

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: string[];
  activeModel: string;
}

const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "",
    enabled: false,
    models: ["claude-sonnet-4-20250514", "claude-3.5-haiku", "claude-3-opus"],
    activeModel: "claude-sonnet-4-20250514",
  },
  {
    id: "zai",
    name: "Z.AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: "",
    enabled: true,
    models: ["glm-5-turbo", "glm-5-plus", "glm-4-flash"],
    activeModel: "glm-5-turbo",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    enabled: false,
    models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    activeModel: "deepseek-chat",
  },
  {
    id: "qwen",
    name: "Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: "",
    enabled: false,
    models: ["qwen-max", "qwen-plus", "qwen-turbo"],
    activeModel: "qwen-max",
  },
  {
    id: "kimi",
    name: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKey: "",
    enabled: false,
    models: ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
    activeModel: "moonshot-v1-128k",
  },
  {
    id: "mimo",
    name: "MiMo",
    baseUrl: "https://api.mimo.ai/v1",
    apiKey: "",
    enabled: false,
    models: ["mimo-7b", "mimo-13b"],
    activeModel: "mimo-7b",
  },
];

interface SettingsState {
  providers: Provider[];
  theme: "dark" | "light" | "system";
  locale: "en" | "pl" | "zh";
  workingDirectory: string;
  maxTokens: number;
  activeProviderId: string;

  updateProvider: (id: string, patch: Partial<Omit<Provider, "id">>) => void;
  setActiveProvider: (id: string) => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setLocale: (locale: "en" | "pl" | "zh") => void;
  setWorkingDirectory: (dir: string) => void;
  setMaxTokens: (tokens: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  providers: DEFAULT_PROVIDERS,
  theme: "dark",
  locale: "en",
  workingDirectory: "",
  maxTokens: 8192,
  activeProviderId: "zai",

  updateProvider: (id, patch) =>
    set((s) => ({
      providers: s.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  setActiveProvider: (id) => set({ activeProviderId: id }),
  setTheme: (theme) => set({ theme }),
  setLocale: (locale) => set({ locale }),
  setWorkingDirectory: (dir) => set({ workingDirectory: dir }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
}));
