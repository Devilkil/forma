import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  FileText,
  Folder,
  Pin,
  Archive,
  CheckSquare,
  Sparkles,
  ArrowRight,
  X
} from "lucide-react";
import type { Note, Project } from "../../../shared/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  projects: Project[];
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onSelectFilter: (filter: any) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  notes,
  projects,
  onSelectNote,
  onCreateNote,
  onSelectFilter
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const needle = query.trim().toLowerCase();

  // Search items
  const matchedNotes = notes
    .filter(
      (n) =>
        !n.isArchived &&
        (n.title.toLowerCase().includes(needle) || n.bodyText.toLowerCase().includes(needle))
    )
    .slice(0, 5);

  const matchedProjects = projects
    .filter((p) => p.name.toLowerCase().includes(needle))
    .slice(0, 3);

  const actions = [
    {
      id: "action-new-note",
      label: "Create New Note",
      icon: Plus,
      run: () => {
        onCreateNote();
        onClose();
      }
    },
    {
      id: "action-all-notes",
      label: "View All Notes",
      icon: FileText,
      run: () => {
        onSelectFilter({ type: "all" });
        onClose();
      }
    },
    {
      id: "action-pinned",
      label: "View Pinned Notes",
      icon: Pin,
      run: () => {
        onSelectFilter({ type: "pinned" });
        onClose();
      }
    },
    {
      id: "action-checklists",
      label: "View Checklists",
      icon: CheckSquare,
      run: () => {
        onSelectFilter({ type: "checklists" });
        onClose();
      }
    },
    {
      id: "action-archived",
      label: "View Archive",
      icon: Archive,
      run: () => {
        onSelectFilter({ type: "archived" });
        onClose();
      }
    }
  ].filter((a) => !needle || a.label.toLowerCase().includes(needle));

  const items = [
    ...actions.map((a) => ({ type: "action" as const, item: a })),
    ...matchedNotes.map((n) => ({ type: "note" as const, item: n })),
    ...matchedProjects.map((p) => ({ type: "project" as const, item: p }))
  ];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter" && items[selectedIndex]) {
      e.preventDefault();
      executeItem(items[selectedIndex]);
    }
  }

  function executeItem(entry: (typeof items)[0]) {
    if (entry.type === "action") {
      entry.item.run();
    } else if (entry.type === "note") {
      onSelectNote(entry.item.id);
      onClose();
    } else if (entry.type === "project") {
      onSelectFilter({ type: "project", projectId: entry.item.id });
      onClose();
    }
  }

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-header">
          <Search className="command-palette-icon" size={18} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command or search notes... (Press Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button className="command-palette-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="command-palette-body">
          {items.length === 0 ? (
            <div className="command-palette-empty">No results found</div>
          ) : (
            items.map((entry, idx) => {
              const isSelected = idx === selectedIndex;
              if (entry.type === "action") {
                const Icon = entry.item.icon;
                return (
                  <div
                    key={entry.item.id}
                    className={`command-palette-item ${isSelected ? "selected" : ""}`}
                    onClick={() => executeItem(entry)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Icon size={16} className="command-item-icon action" />
                    <span className="command-item-text">{entry.item.label}</span>
                    <span className="command-item-badge">Action</span>
                  </div>
                );
              }

              if (entry.type === "note") {
                return (
                  <div
                    key={`note-${entry.item.id}`}
                    className={`command-palette-item ${isSelected ? "selected" : ""}`}
                    onClick={() => executeItem(entry)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <FileText size={16} className="command-item-icon note" />
                    <div className="command-item-note-info">
                      <span className="command-item-text">{entry.item.title || "Untitled"}</span>
                      {entry.item.bodyText && (
                        <span className="command-item-subtext">
                          {entry.item.bodyText.slice(0, 60)}
                        </span>
                      )}
                    </div>
                    <ArrowRight size={14} className="command-item-arrow" />
                  </div>
                );
              }

              if (entry.type === "project") {
                return (
                  <div
                    key={`project-${entry.item.id}`}
                    className={`command-palette-item ${isSelected ? "selected" : ""}`}
                    onClick={() => executeItem(entry)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Folder size={16} className="command-item-icon project" />
                    <span className="command-item-text">Project: {entry.item.name}</span>
                    <span className="command-item-badge">Filter</span>
                  </div>
                );
              }

              return null;
            })
          )}
        </div>
        <div className="command-palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>esc</kbd> to dismiss</span>
        </div>
      </div>
    </div>
  );
}
