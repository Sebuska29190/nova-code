import { create } from "zustand";

export interface MemoryEntry {
  name: string;
  description: string;
  type: "user" | "project" | "feedback" | "reference";
  content: string;
  source: string;
}

interface MemoryState {
  entries: MemoryEntry[];
  searchQuery: string;

  loadEntries: () => void;
  addEntry: (entry: Omit<MemoryEntry, "source">) => void;
  deleteEntry: (name: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  entries: [],
  searchQuery: "",

  loadEntries: () => {
    // Load from localStorage for now (will be replaced with engine integration)
    try {
      const stored = localStorage.getItem("nova-memory");
      if (stored) {
        set({ entries: JSON.parse(stored) });
      }
    } catch {
      // Ignore
    }
  },

  addEntry: (entry) => {
    const newEntry: MemoryEntry = { ...entry, source: "user" };
    const entries = [...get().entries, newEntry];
    set({ entries });
    localStorage.setItem("nova-memory", JSON.stringify(entries));
  },

  deleteEntry: (name) => {
    const entries = get().entries.filter((e) => e.name !== name);
    set({ entries });
    localStorage.setItem("nova-memory", JSON.stringify(entries));
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
