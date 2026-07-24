import React, { useState, useEffect, useRef } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import {
  Pin,
  Archive,
  Trash2,
  PanelLeft,
  History,
  Download,
  ZoomIn,
  ZoomOut,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Link as LinkIcon,
  Paperclip,
  NotebookPen,
  FileText,
  FileCode,
  Share2
} from "lucide-react";
import type { Note, Project } from "../../../shared/types";
import { exportNoteAsMarkdown, exportNoteAsHtml, exportNoteAsText } from "../../utils/exportUtils";

import { ProjectDropdown } from "./ProjectDropdown";

interface NoteEditorProps {
  selectedNote: Note | null;
  projects: Project[];
  editor: Editor | null;
  titleDraft: string;
  onTitleChange: (newTitle: string) => void;
  onUpdateNote: (updates: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  saveState: "idle" | "saving" | "saved";
  saveError: string | null;
  noteZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenAttachmentPicker: () => void;
  onOpenVersionHistory: () => void;
  onCreateNote: () => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  dateFormatter: Intl.DateTimeFormat;
  onShareNote?: (note: Note) => void;
}

export function NoteEditor({
  selectedNote,
  projects,
  editor,
  titleDraft,
  onTitleChange,
  onUpdateNote,
  onDeleteNote,
  saveState,
  saveError,
  noteZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenAttachmentPicker,
  onOpenVersionHistory,
  onCreateNote,
  sidebarVisible,
  onToggleSidebar,
  dateFormatter,
  onShareNote
}: NoteEditorProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = editorScrollRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        onZoomIn();
      } else if (e.deltaY > 0) {
        onZoomOut();
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [onZoomIn, onZoomOut]);

  if (!selectedNote) {
    return (
      <section className="editor-pane">
        <div className="empty-editor">
          <NotebookPen size={42} />
          <strong>Select or create a note</strong>
          <span>Your words will have a place to land.</span>
          <button onClick={onCreateNote}>New note</button>
        </div>
      </section>
    );
  }

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function saveLabel(state: "idle" | "saving" | "saved") {
    if (state === "saving") return "Saving...";
    if (state === "saved") return "Saved";
    return "Ready";
  }

  const words = selectedNote.bodyText ? selectedNote.bodyText.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = selectedNote.bodyText ? selectedNote.bodyText.length : 0;

  const isShared = selectedNote.isShared || false;

  return (
    <section className="editor-pane">
      <header className="editor-toolbar">
        <div className="toolbar-group">
          {!sidebarVisible && (
            <button className="icon-button" title="Show sidebar" onClick={onToggleSidebar}>
              <PanelLeft size={17} />
            </button>
          )}
        </div>

        <div className="toolbar-group center">
          <button className="icon-button" title="Version history" onClick={onOpenVersionHistory}>
            <History size={17} />
          </button>
          {onShareNote && (
            <button
              className={`link-action-button ${isShared ? "active" : ""}`}
              title="Share note"
              onClick={() => onShareNote(selectedNote)}
            >
              <Share2 size={14} /> {isShared ? "Live Synced" : "Share"}
            </button>
          )}
          <div className="export-menu-container">
            <button
              className="link-action-button"
              title="Export note"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download size={14} /> Export
            </button>
            {showExportMenu && (
              <div className="export-menu-dropdown" onClick={() => setShowExportMenu(false)}>
                <button onClick={() => editor && exportNoteAsMarkdown(selectedNote.title, editor.getHTML())}>
                  <FileText size={14} /> Markdown (.md)
                </button>
                <button onClick={() => editor && exportNoteAsHtml(selectedNote.title, editor.getHTML())}>
                  <FileCode size={14} /> HTML (.html)
                </button>
                <button onClick={() => editor && exportNoteAsText(selectedNote.title, editor.getText())}>
                  <FileText size={14} /> Plain Text (.txt)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-group right">
          <div className="zoom-controls">
            <button
              className="icon-button"
              title="Zoom out"
              disabled={noteZoom <= 0.8}
              onClick={onZoomOut}
            >
              <ZoomOut size={16} />
            </button>
            <button className="zoom-value" title="Reset zoom" onClick={onResetZoom}>
              {Math.round(noteZoom * 100)}%
            </button>
            <button
              className="icon-button"
              title="Zoom in"
              disabled={noteZoom >= 1.6}
              onClick={onZoomIn}
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="editor-header">
        <div>
          <input
            className="title-input"
            value={titleDraft}
            onChange={(e) => onTitleChange(e.target.value)}
          />
          <div className="editor-meta">
            <span>{dateFormatter.format(new Date(selectedNote.updatedAt))}</span>
            <span>•</span>
            <span>{saveError ?? saveLabel(saveState)}</span>
            <span>•</span>
            <span>{words} words ({chars} chars)</span>
            {isShared && (
              <>
                <span>•</span>
                <span className="sync-badge">🟢 Live Sync</span>
              </>
            )}
          </div>
        </div>

        <div className="editor-actions">
          <ProjectDropdown
            projects={projects}
            selectedProjectId={selectedNote.projectId}
            onSelectProject={(projectId) => onUpdateNote({ projectId })}
          />
          <button
            className={`icon-button ${selectedNote.isPinned ? "selected" : ""}`}
            title="Pin note"
            onClick={() => onUpdateNote({ isPinned: !selectedNote.isPinned })}
          >
            <Pin size={17} />
          </button>
          <button
            className="icon-button"
            title={selectedNote.isArchived ? "Restore note" : "Archive note"}
            onClick={() => onUpdateNote({ isArchived: !selectedNote.isArchived })}
          >
            <Archive size={17} />
          </button>
          <button
            className="icon-button danger"
            title="Delete note"
            onClick={() => {
              if (window.confirm(`Delete "${selectedNote.title}"?`)) {
                onDeleteNote(selectedNote.id);
              }
            }}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="format-toolbar">
        <button
          className={`tool-button ${editor?.isActive("heading", { level: 1 }) ? "active" : ""}`}
          title="Heading 1"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`}
          title="Heading 2"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("bold") ? "active" : ""}`}
          title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("italic") ? "active" : ""}`}
          title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("underline") ? "active" : ""}`}
          title="Underline"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("bulletList") ? "active" : ""}`}
          title="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("orderedList") ? "active" : ""}`}
          title="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("taskList") ? "active" : ""}`}
          title="Task checklist"
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
        >
          <CheckSquare size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("blockquote") ? "active" : ""}`}
          title="Block quote"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("codeBlock") ? "active" : ""}`}
          title="Code block"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 size={17} />
        </button>
        <button
          className={`tool-button ${editor?.isActive("link") ? "active" : ""}`}
          title="Link"
          onClick={setLink}
        >
          <LinkIcon size={17} />
        </button>
        <button
          className="tool-button"
          title="Attach File / Image"
          onClick={onOpenAttachmentPicker}
        >
          <Paperclip size={17} />
        </button>
      </div>

      <div ref={editorScrollRef} className="editor-scroll" onClick={() => editor?.chain().focus().run()}>
        <EditorContent
          editor={editor}
          style={
            {
              "--note-zoom": noteZoom,
              fontSize: `${Math.round(15 * noteZoom)}px`,
              zoom: noteZoom
            } as React.CSSProperties
          }
        />
      </div>
    </section>
  );
}
