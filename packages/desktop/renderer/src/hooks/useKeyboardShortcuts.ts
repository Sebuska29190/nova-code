import { useState, useEffect, useCallback, useRef } from "react";

export interface ShortcutCallbacks {
  onNewChat: () => void;
  onClearChat: () => void;
  onToggleSidebar: () => void;
  onFocusInput: () => void;
  onSettings: () => void;
  onSkills: () => void;
  onPlugins: () => void;
  onToggleTheme: () => void;
  onAbortGeneration: () => void;
  onExportChat: () => void;
}

export function useKeyboardShortcuts(
  callbacks: ShortcutCallbacks,
  isGenerating: boolean
) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const cbRef = useRef(callbacks);
  const openRef = useRef(false);
  const genRef = useRef(false);

  cbRef.current = callbacks;
  openRef.current = isPaletteOpen;
  genRef.current = isGenerating;

  const togglePalette = useCallback(() => setIsPaletteOpen((v) => !v), []);
  const closePalette = useCallback(() => setIsPaletteOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const cb = cbRef.current;

      if (e.key === "k" && mod) {
        e.preventDefault();
        setIsPaletteOpen((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        if (openRef.current) {
          setIsPaletteOpen(false);
          return;
        }
        if (genRef.current) {
          cb.onAbortGeneration();
          return;
        }
        return;
      }

      if (openRef.current) return;

      if (e.key === "n" && mod && !e.shiftKey) {
        e.preventDefault();
        cb.onNewChat();
        return;
      }

      if (e.key === "b" && mod && !e.shiftKey) {
        e.preventDefault();
        cb.onToggleSidebar();
        return;
      }

      if (e.key === "l" && mod && !e.shiftKey) {
        e.preventDefault();
        cb.onFocusInput();
        return;
      }

      if (e.key === "," && mod && !e.shiftKey) {
        e.preventDefault();
        cb.onSettings();
        return;
      }

      if (e.key === "Delete" && mod && e.shiftKey) {
        e.preventDefault();
        cb.onClearChat();
        return;
      }

      if (e.key === "s" && mod && e.shiftKey) {
        e.preventDefault();
        cb.onSkills();
        return;
      }

      if (e.key === "p" && mod && e.shiftKey) {
        e.preventDefault();
        cb.onPlugins();
        return;
      }

      if (e.key === "t" && mod && e.shiftKey) {
        e.preventDefault();
        cb.onToggleTheme();
        return;
      }

      if (e.key === "e" && mod && e.shiftKey) {
        e.preventDefault();
        cb.onExportChat();
        return;
      }

      if (e.key === "c" && mod && !e.shiftKey) {
        if (genRef.current) {
          e.preventDefault();
          cb.onAbortGeneration();
        }
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { isPaletteOpen, togglePalette, closePalette };
}
