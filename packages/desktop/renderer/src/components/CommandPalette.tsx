import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAppStore } from "../stores/app";
import { useChatStore } from "../stores/chat";
import { useSettingsStore } from "../stores/settings";

const RECENT_KEY = "nova-cmd-recent";

function getRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  const ids = getRecentIds().filter((r) => r !== id);
  ids.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 5)));
}

function matchesQuery(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface Command {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "new-chat",
        label: "New Chat",
        icon: "💬",
        shortcut: "Ctrl+N",
        action: () => {
          useChatStore.getState().clearMessages();
          useAppStore.getState().setActiveView("chat");
        },
      },
      {
        id: "clear-chat",
        label: "Clear Chat",
        icon: "🗑️",
        shortcut: "Ctrl+Shift+Del",
        action: () => useChatStore.getState().clearMessages(),
      },
      {
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        icon: "📋",
        shortcut: "Ctrl+B",
        action: () => useAppStore.getState().toggleSidebar(),
      },
      {
        id: "settings",
        label: "Settings",
        icon: "⚙️",
        shortcut: "Ctrl+,",
        action: () => useAppStore.getState().setActiveView("settings"),
      },
      {
        id: "skills",
        label: "Skills",
        icon: "⚡",
        shortcut: "Ctrl+Shift+S",
        action: () => useAppStore.getState().setActiveView("skills"),
      },
      {
        id: "plugins",
        label: "Plugins",
        icon: "🔌",
        shortcut: "Ctrl+Shift+P",
        action: () => useAppStore.getState().setActiveView("plugins"),
      },
      {
        id: "toggle-theme",
        label: "Toggle Theme",
        icon: "🎨",
        shortcut: "Ctrl+Shift+T",
        action: () => {
          const s = useSettingsStore.getState();
          const next = s.theme === "dark" ? "light" : "dark";
          s.setTheme(next);
          useAppStore.getState().setTheme(next);
        },
      },
      {
        id: "abort",
        label: "Abort Generation",
        icon: "⏹️",
        shortcut: "Ctrl+C",
        action: () => {
          if (useChatStore.getState().isGenerating && window.nova) {
            window.nova.engine.abort();
          }
        },
      },
      {
        id: "focus-input",
        label: "Focus Input",
        icon: "✏️",
        shortcut: "Ctrl+L",
        action: () =>
          document.querySelector<HTMLTextAreaElement>("textarea")?.focus(),
      },
      {
        id: "export-chat",
        label: "Export Chat",
        icon: "📤",
        shortcut: "Ctrl+Shift+E",
        action: () => {
          const msgs = useChatStore.getState().messages;
          const text = msgs.map((m) => `[${m.role}] ${m.content}`).join("\n\n");
          const blob = new Blob([text], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `chat-${Date.now()}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) {
      const recentIds = getRecentIds();
      const recentCmds = recentIds
        .map((id) => commands.find((c) => c.id === id))
        .filter(Boolean) as Command[];
      const rest = commands.filter((c) => !recentIds.includes(c.id));
      return [...recentCmds, ...rest];
    }
    return commands.filter((c) => matchesQuery(query, c.label));
  }, [query, commands]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const execute = useCallback(
    (cmd: Command) => {
      pushRecent(cmd.id);
      onClose();
      cmd.action();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) execute(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, execute, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-neutral-800">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
          />
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              No commands found
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-nova-600/20 text-nova-300"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                <span className="text-base w-6 text-center">{cmd.icon}</span>
                <span className="flex-1 text-left">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="text-[11px] text-neutral-500 bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 font-mono">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
