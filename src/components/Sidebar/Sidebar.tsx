import React from "react";
import {
  Folder,
  Plus,
  Lock,
  Archive,
  CheckSquare,
  Pin,
  StickyNote,
  PanelLeft,
  MoreHorizontal,
  Search,
  Users
} from "lucide-react";
import type { NotesFilter, Project } from "../../../shared/types";

interface SidebarProps {
  projects: Project[];
  filter: NotesFilter;
  setFilter: (filter: NotesFilter) => void;
  allVisibleCount: number;
  pinnedCount: number;
  archivedCount: number;
  notesCountByProject: Record<string, number>;
  onStartProjectCreation: () => void;
  isCreatingProject: boolean;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  onSubmitProjectCreation: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancelProjectCreation: () => void;
  newProjectInputRef: React.RefObject<HTMLInputElement>;
  projectMenu: string | null;
  setProjectMenu: (id: string | null) => void;
  onRenameProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onMoveNoteToProject?: (noteId: string, projectId: string) => void;
  onLockApp: () => void;
  visible: boolean;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
  onJoinSharedNote?: () => void;
}

export function Sidebar({
  projects,
  filter,
  setFilter,
  allVisibleCount,
  pinnedCount,
  archivedCount,
  notesCountByProject,
  onStartProjectCreation,
  isCreatingProject,
  newProjectName,
  setNewProjectName,
  onSubmitProjectCreation,
  onCancelProjectCreation,
  newProjectInputRef,
  projectMenu,
  setProjectMenu,
  onRenameProject,
  onDeleteProject,
  onMoveNoteToProject,
  onLockApp,
  visible,
  onOpenCommandPalette,
  onJoinSharedNote
}: SidebarProps) {
  const [dragOverProjectId, setDragOverProjectId] = React.useState<string | null>(null);

  if (!visible) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-section" style={{ marginBottom: 12 }}>
        <button
          className="filter-button search-palette-button"
          onClick={onOpenCommandPalette}
          title="Search notes and commands (Ctrl+K)"
        >
          <Search size={15} />
          <span>Search...</span>
          <kbd className="palette-kbd">Ctrl+K</kbd>
        </button>
      </div>

      <section className="sidebar-section">
        <div className="section-title">Overview</div>
        <div className="section-body">
          <button
            className={`filter-button ${filter.type === "all" ? "active" : ""}`}
            onClick={() => setFilter({ type: "all" })}
          >
            <StickyNote size={15} />
            <span>All notes</span>
            <em>{allVisibleCount}</em>
          </button>

          <button
            className={`filter-button ${filter.type === "pinned" ? "active" : ""}`}
            onClick={() => setFilter({ type: "pinned" })}
          >
            <Pin size={15} />
            <span>Pinned</span>
            <em>{pinnedCount}</em>
          </button>

          <button
            className={`filter-button ${filter.type === "checklists" ? "active" : ""}`}
            onClick={() => setFilter({ type: "checklists" })}
          >
            <CheckSquare size={15} />
            <span>Checklists</span>
          </button>

          <button
            className={`filter-button ${filter.type === "archived" ? "active" : ""}`}
            onClick={() => setFilter({ type: "archived" })}
          >
            <Archive size={15} />
            <span>Archive</span>
            <em>{archivedCount}</em>
          </button>

          {onJoinSharedNote && (
            <button
              className="filter-button"
              onClick={onJoinSharedNote}
              title="Join a shared note session using a tunnel URL"
            >
              <Users size={15} style={{ color: "var(--accent)" }} />
              <span>Join Shared Note</span>
            </button>
          )}
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-title">
          <span>Projects</span>
          <button className="icon-button" title="New folder" onClick={onStartProjectCreation}>
            <Plus size={15} />
          </button>
        </div>

        <div className="section-body">
          {isCreatingProject && (
            <form className="new-project-row" onSubmit={onSubmitProjectCreation}>
              <Folder size={15} />
              <input
                ref={newProjectInputRef}
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onBlur={() => {
                  if (!newProjectName.trim()) onCancelProjectCreation();
                }}
              />
            </form>
          )}

          {projects.map((project) => {
            const isActive = filter.type === "project" && filter.projectId === project.id;
            const count = notesCountByProject[project.id] || 0;
            const isMenuOpen = projectMenu === project.id;

            const isDragOver = dragOverProjectId === project.id;

            return (
              <div
                key={project.id}
                className={`project-row ${isDragOver ? "drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverProjectId !== project.id) setDragOverProjectId(project.id);
                }}
                onDragLeave={() => {
                  if (dragOverProjectId === project.id) setDragOverProjectId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverProjectId(null);
                  const noteId = e.dataTransfer.getData("text/plain");
                  if (noteId && onMoveNoteToProject) {
                    onMoveNoteToProject(noteId, project.id);
                  }
                }}
              >
                <button
                  className={`project-button ${isActive ? "active" : ""}`}
                  onClick={() => setFilter({ type: "project", projectId: project.id })}
                >
                  <Folder size={15} />
                  <span>{project.name}</span>
                  <em>{count}</em>
                </button>

                <button
                  className="icon-button project-more"
                  title="Project options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectMenu(isMenuOpen ? null : project.id);
                  }}
                >
                  <MoreHorizontal size={14} />
                </button>

                {isMenuOpen && (
                  <div className="project-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setProjectMenu(null);
                        onRenameProject(project);
                      }}
                    >
                      Rename
                    </button>
                    {projects.length > 1 && (
                      <button
                        className="danger"
                        onClick={() => {
                          setProjectMenu(null);
                          onDeleteProject(project);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sidebar-section" style={{ marginTop: "auto" }}>
        <button className="filter-button" onClick={onLockApp}>
          <Lock size={15} />
          <span>Lock app</span>
        </button>
      </section>
    </aside>
  );
}
