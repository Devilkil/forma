import { useEffect } from "react";

interface ShortcutHandlers {
  onCreateNote?: () => void;
  onSearchFocus?: () => void;
  onSave?: () => void;
  onTogglePin?: () => void;
  onAttachmentPicker?: () => void;
  onOpenCommandPalette?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCmdOrCtrl = event.ctrlKey || event.metaKey;
      if (!isCmdOrCtrl) return;

      const key = event.key.toLowerCase();

      if (key === "k") {
        event.preventDefault();
        handlers.onOpenCommandPalette?.();
      } else if (key === "n") {
        event.preventDefault();
        handlers.onCreateNote?.();
      } else if (key === "f") {
        event.preventDefault();
        handlers.onSearchFocus?.();
      } else if (key === "s") {
        event.preventDefault();
        handlers.onSave?.();
      } else if (key === "=" || key === "+") {
        event.preventDefault();
        handlers.onZoomIn?.();
      } else if (key === "-") {
        event.preventDefault();
        handlers.onZoomOut?.();
      } else if (key === "0") {
        event.preventDefault();
        handlers.onResetZoom?.();
      } else if (event.shiftKey && key === "p") {
        event.preventDefault();
        handlers.onTogglePin?.();
      } else if (event.shiftKey && key === "a") {
        event.preventDefault();
        handlers.onAttachmentPicker?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
