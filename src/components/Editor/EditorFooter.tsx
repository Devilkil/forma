import React from "react";
import { Clock, Check, Loader2, AlertCircle } from "lucide-react";

interface EditorFooterProps {
  bodyText: string;
  saveState: "idle" | "saving" | "saved";
  saveError: string | null;
  noteZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function EditorFooter({
  bodyText,
  saveState,
  saveError,
  noteZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom
}: EditorFooterProps) {
  const words = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;
  const characters = bodyText.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="editor-footer">
      <div className="editor-stats">
        <span>{words} {words === 1 ? "word" : "words"}</span>
        <span className="dot">•</span>
        <span>{characters} {characters === 1 ? "char" : "chars"}</span>
        <span className="dot">•</span>
        <span>{readingTimeMinutes} min read</span>
      </div>

      <div className="editor-footer-right">
        {saveError ? (
          <span className="save-indicator error" title={saveError}>
            <AlertCircle size={14} /> Error saving
          </span>
        ) : saveState === "saving" ? (
          <span className="save-indicator saving">
            <Loader2 size={14} className="spin" /> Saving...
          </span>
        ) : saveState === "saved" ? (
          <span className="save-indicator saved">
            <Check size={14} /> Saved
          </span>
        ) : null}

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={onZoomOut} title="Zoom out">
            -
          </button>
          <span className="zoom-level" onClick={onResetZoom} title="Reset zoom">
            {Math.round(noteZoom * 100)}%
          </span>
          <button className="zoom-btn" onClick={onZoomIn} title="Zoom in">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
