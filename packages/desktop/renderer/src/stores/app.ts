import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  theme: "dark" | "light" | "system";
  activeView: "chat" | "settings" | "plugins" | "skills";

  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setActiveView: (view: "chat" | "settings" | "plugins" | "skills") => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  theme: "dark",
  activeView: "chat",

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setActiveView: (activeView) => set({ activeView }),
}));
