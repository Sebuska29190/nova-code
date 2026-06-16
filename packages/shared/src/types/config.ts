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
