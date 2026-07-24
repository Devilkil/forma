import React, { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
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
  Download,
  FileText,
  FileCode,
  History,
  MoreHorizontal,
  ChevronDown
} from "lucide-react";
import { exportNoteAsMarkdown, exportNoteAsHtml, exportNoteAsText } from "../../utils/exportUtils";

interface EditorToolbarProps {
  editor: Editor | null;
  noteTitle: string;
  onOpenAttachmentPicker: () => void;
  onOpenVersionHistory: () => void;
}

export function EditorToolbar({
  editor,
  noteTitle,
  onOpenAttachmentPicker,
  onOpenVersionHistory
}: EditorToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (!editor) return null;

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

  function handleExportMd() {
    if (!editor) return;
    exportNoteAsMarkdown(noteTitle, editor.getHTML());
    setShowExportMenu(false);
  }

  function handleExportHtml() {
    if (!editor) return;
    exportNoteAsHtml(noteTitle, editor.getHTML());
    setShowExportMenu(false);
  }

  function handleExportTxt() {
    if (!editor) return;
    exportNoteAsText(noteTitle, editor.getText());
    setShowExportMenu(false);
  }

  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor.isActive("bold") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          className={`toolbar-btn ${editor.isActive("italic") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          className={`toolbar-btn ${editor.isActive("underline") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          className={`toolbar-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          className={`toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        <button
          className={`toolbar-btn ${editor.isActive("taskList") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Task Checklist"
        >
          <CheckSquare size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor.isActive("blockquote") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote Block"
        >
          <Quote size={16} />
        </button>
        <button
          className={`toolbar-btn ${editor.isActive("codeBlock") ? "active" : ""}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          <Code2 size={16} />
        </button>
        <button
          className={`toolbar-btn ${editor.isActive("link") ? "active" : ""}`}
          onClick={setLink}
          title="Add Link (Ctrl+K in text)"
        >
          <LinkIcon size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onOpenAttachmentPicker}
          title="Attach Image or File (Ctrl+Shift+A)"
        >
          <Paperclip size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={onOpenVersionHistory}
          title="Version History"
        >
          <History size={16} />
        </button>

        <div className="export-menu-container">
          <button
            className="toolbar-btn export-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export Note"
          >
            <Download size={16} />
            <ChevronDown size={12} />
          </button>
          {showExportMenu && (
            <div className="export-menu-dropdown" onClick={() => setShowExportMenu(false)}>
              <button onClick={handleExportMd}>
                <FileText size={14} /> Export as Markdown (.md)
              </button>
              <button onClick={handleExportHtml}>
                <FileCode size={14} /> Export as HTML (.html)
              </button>
              <button onClick={handleExportTxt}>
                <FileText size={14} /> Export as Plain Text (.txt)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
