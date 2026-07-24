import React from "react";
import {
  Search,
  Plus,
  List,
  GalleryHorizontal,
  Users
} from "lucide-react";
import type { Note, NotesFilter, Project } from "../../../shared/types";
import { NoteCard } from "./NoteCard";

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  projects: Project[];
  filter: NotesFilter;
  searchInput: string;
  setSearchInput: (value: string) => void;
  sortMode: "edited" | "created" | "title";
  setSortMode: (mode: "edited" | "created" | "title") => void;
  viewMode: "list" | "gallery";
  setViewMode: (mode: "list" | "gallery") => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onContextMenu: (note: Note, e: React.MouseEvent) => void;
  dateFormatter: Intl.DateTimeFormat;
  onJoinSharedNote?: () => void;
}

export function NoteList({
  notes,
  selectedNoteId,
  projects,
  filter,
  searchInput,
  setSearchInput,
  sortMode,
  setSortMode,
  viewMode,
  setViewMode,
  onSelectNote,
  onCreateNote,
  onContextMenu,
  dateFormatter,
  onJoinSharedNote
}: NoteListProps) {
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  let title = "All notes";
  if (filter.type === "pinned") title = "Pinned";
  if (filter.type === "archived") title = "Archived";
  if (filter.type === "checklists") title = "Checklists";
  if (filter.type === "project") {
    const proj = projectMap.get(filter.projectId);
    title = proj ? proj.name : "Project";
  }

  return (
    <section className="note-list-pane">
      <div className="note-list-header">
        <div>
          <h1>{title}</h1>
          <span>
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        <div className="list-controls">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
            title="Sort notes"
          >
            <option value="edited">Edited</option>
            <option value="created">Created</option>
            <option value="title">Title</option>
          </select>

          <button
            className={`icon-button ${viewMode === "list" ? "selected" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <List size={16} />
          </button>
          <button
            className={`icon-button ${viewMode === "gallery" ? "selected" : ""}`}
            onClick={() => setViewMode("gallery")}
            title="Gallery view"
          >
            <GalleryHorizontal size={16} />
          </button>
          {onJoinSharedNote && (
            <button
              className="icon-button"
              onClick={onJoinSharedNote}
              title="Join shared note session"
            >
              <Users size={16} />
            </button>
          )}
          <button
            className="primary-icon-button"
            onClick={onCreateNote}
            title="New note (Ctrl+N)"
          >
            <Plus size={17} />
          </button>
        </div>
      </div>

      <div className="sidebar-search" style={{ padding: "0 12px", marginTop: 8 }}>
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="Search notes (Ctrl+F)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className={`note-list ${viewMode}`}>
        {notes.length === 0 ? (
          <div className="empty-list">
            <strong>No notes</strong>
            <span>Your notes will appear here.</span>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isSelected={note.id === selectedNoteId}
              onSelect={() => onSelectNote(note.id)}
              onContextMenu={(e) => onContextMenu(note, e)}
              dateFormatter={dateFormatter}
            />
          ))
        )}
      </div>
    </section>
  );
}
