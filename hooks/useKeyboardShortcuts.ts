"use client";

import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onUndo: () => void;
  onRedo: () => void;
  onSpaceDown?: () => void;
  onSpaceUp?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onEnter?: () => void;
}

export default function useKeyboardShortcuts(opts: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        opts.onUndo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        opts.onRedo();
      } else if (e.code === "Space") {
        e.preventDefault();
        opts.onSpaceDown?.();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        opts.onCopy?.();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        opts.onPaste?.();
      } else if (e.key === "Enter") {
        opts.onEnter?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        opts.onSpaceUp?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [opts]);
}


