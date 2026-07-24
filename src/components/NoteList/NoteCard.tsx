import React from "react";
import { Pin, Radio } from "lucide-react";
import type { Note } from "../../../shared/types";

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  dateFormatter: Intl.DateTimeFormat;
}

export function NoteCard({
  note,
  isSelected,
  onSelect,
  onContextMenu,
  dateFormatter
}: NoteCardProps) {
  const formattedDate = dateFormatter.format(new Date(note.updatedAt));
  const snippet = note.bodyText ? note.bodyText.slice(0, 80) : "No additional text";

  return (
    <button
      className={`note-card ${isSelected ? "active" : ""}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", note.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="note-card-title">
        {note.isPinned && <Pin size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />}
        {note.isShared && (
          <span title="Live Synced Note">
            <Radio size={13} className="pulse-icon" style={{ color: "#34c759", flexShrink: 0 }} />
          </span>
        )}
        <span>{note.title || "Untitled"}</span>
      </div>
      <div className="note-card-row">
        <span className="note-card-date">{formattedDate}</span>
        <span className="note-card-snippet">{snippet}</span>
      </div>
    </button>
  );
}
