import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Lock, History, RotateCcw, X } from "lucide-react";
import type { AppData, Note, NoteUpdate, NoteVersion, NotesFilter, Project } from "../shared/types";
import { emptyBodyJson } from "../shared/defaultContent";
import { createLocalNotesApi } from "./localNotesApi";
import { unzipSync, strFromU8 } from "fflate";
import "./styles.css";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { NoteList } from "./components/NoteList/NoteList";
import { NoteEditor } from "./components/Editor/NoteEditor";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { ShareModal } from "./components/ShareModal/ShareModal";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const USER_COLORS = [
  '#f783ac', '#af52de', '#ff9500', '#34c759', 
  '#007aff', '#ff3b30', '#5856d6', '#ffcc00'
];

function getRandomUser() {
  const names = ['User', 'Peer', 'Collaborator', 'Guest', 'Editor'];
  const name = `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 100)}`;
  const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  return { name, color };
}

const notesApi = window.notes ?? createLocalNotesApi();

function App() {
  const [data, setData] = useState<AppData>({ projects: [], notes: [] });
  const [filter, setFilter] = useState<NotesFilter>({ type: "all" });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [projectMenu, setProjectMenu] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [locked, setLocked] = useState(() => Boolean(readSetting("lockHash", "")));
  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [sortMode, setSortMode] = useState<"edited" | "created" | "title">("edited");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(() => readSetting("sidebarWidth", 240));
  const [listWidth, setListWidth] = useState(() => readSetting("listWidth", 300));
  const [noteZoom, setNoteZoom] = useState(() => clampNumber(readSetting("noteZoom", 1), 0.8, 1.6));
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    mode: "host" | "join";
    target: Note | Project | null;
    tunnelUrl: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    mode: "host",
    target: null,
    tunnelUrl: null,
    isLoading: false,
  });
  const [currentUser] = useState(() => {
    const saved = localStorage.getItem("forma-user-profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const profile = getRandomUser();
    localStorage.setItem("forma-user-profile", JSON.stringify(profile));
    return profile;
  });

  const resizeState = useRef<{ column: "sidebar" | "list"; startX: number; startWidth: number } | null>(null);
  const suppressEditorUpdate = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const newProjectInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSaves = useRef(new Map<string, NoteUpdate>());

  const selectedNote = data.notes.find((note) => note.id === selectedNoteId) ?? null;

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.notes
      .filter((note) => {
        if (filter.type === "pinned" && !note.isPinned) return false;
        if (filter.type === "archived" && !note.isArchived) return false;
        if (filter.type === "all" && note.isArchived) return false;
        if (filter.type === "project" && (note.projectId !== filter.projectId || note.isArchived)) return false;
        if (filter.type === "tag" && (note.isArchived || !note.bodyText.toLowerCase().includes(filter.tag.toLowerCase()))) return false;
        if (filter.type === "checklists" && (note.isArchived || !hasCompletedChecklist(note.bodyJson))) return false;
        if (!needle) return true;
        return note.title.toLowerCase().includes(needle) || note.bodyText.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        const pinSort = Number(b.isPinned) - Number(a.isPinned);
        if (pinSort !== 0) return pinSort;
        if (sortMode === "title") return a.title.localeCompare(b.title);
        if (sortMode === "created") return b.createdAt.localeCompare(a.createdAt);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [data.notes, filter, query, sortMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput), 180);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => safeSetting("sidebarWidth", sidebarWidth), [sidebarWidth]);
  useEffect(() => safeSetting("listWidth", listWidth), [listWidth]);
  const selectedNoteIsShared = selectedNote?.isShared;
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

function normalizeWsUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return "ws://127.0.0.1:1234";
  if (!url.startsWith("ws://") && !url.startsWith("wss://") && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = url.includes("loca.lt") ? `wss://${url}` : `ws://${url}`;
  } else if (url.startsWith("https://")) {
    url = url.replace(/^https:\/\//, "wss://");
  } else if (url.startsWith("http://")) {
    url = url.replace(/^http:\/\//, "ws://");
  }
  return url;
}

  useEffect(() => {
    if (selectedNoteIsShared && selectedNoteId) {
      const url = normalizeWsUrl(selectedNote.syncUrl || "ws://127.0.0.1:1234");
      const newProvider = new HocuspocusProvider({
        url,
        name: selectedNoteId,
      });
      setProvider(newProvider);
      return () => {
        newProvider.destroy();
        setProvider(null);
      };
    } else {
      setProvider(null);
    }
  }, [selectedNoteIsShared, selectedNoteId, selectedNote?.syncUrl]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: selectedNoteIsShared ? false : undefined // disable local history if shared
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ["data"]
      }),
      Image.configure({
        inline: false,
        allowBase64: true
      }),
      FileAttachment,
      PdfAttachment,
      NotionEmbed,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start writing..."
      }),
      ...(provider ? [
        Collaboration.configure({
          document: provider.document
        }),
        CollaborationCursor.configure({
          provider: provider,
          user: currentUser
        })
      ] : [])
    ],
    content: emptyBodyJson,
    editorProps: {
      attributes: {
        class: "note-editor"
      },
      handleDOMEvents: {
        click(_view, event) {
          const target = event.target as HTMLElement;
          const block = target.closest<HTMLElement>(".file-attachment-block, .pdf-attachment, [data-file-attachment]");
          if (block) {
            const anchor = block.querySelector<HTMLAnchorElement>("a");
            const href = anchor?.getAttribute("href");
            const fileName = anchor?.getAttribute("download") || anchor?.textContent?.trim() || "attachment";
            if (href) {
              event.preventDefault();
              event.stopPropagation();
              if (href.startsWith("data:")) {
                void openAttachedFile(href, fileName);
              } else if (href.startsWith("forma-asset://")) {
                void notesApi.openLocalAsset?.(href.replace("forma-asset://", ""));
              } else {
                void openExternalUrl(href);
              }
              return true;
            }
          }
          const anchor = target.closest("a");
          const href = anchor?.getAttribute("href");
          if (!anchor || !href) return false;
          event.preventDefault();
          const fileName = anchor.getAttribute("download") || anchor.textContent?.trim() || "attachment";
          if (href.startsWith("data:")) {
            void openAttachedFile(href, fileName);
          } else if (href.startsWith("forma-asset://")) {
            void notesApi.openLocalAsset?.(href.replace("forma-asset://", ""));
          } else {
            void openExternalUrl(href);
          }
          return true;
        }
      }
    },
    onUpdate({ editor }) {
      if (suppressEditorUpdate.current || !selectedNoteId) return;
      queueSave(selectedNoteId, {
        bodyJson: JSON.stringify(editor.getJSON()),
        bodyText: editor.getText()
      });
    },
  }, [provider]);

  useEffect(() => {
    void loadData();
    return () => {
      void flushPendingSaves();
    };
  }, []);

  useEffect(() => {
    function openEditorLink(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const block = target.closest<HTMLElement>(".file-attachment-block, .pdf-attachment, [data-file-attachment], .notion-embed");
      if (block) {
        const anchor = block.querySelector<HTMLAnchorElement>("a");
        const href = anchor?.getAttribute("href");
        const fileName = anchor?.getAttribute("download") || anchor?.textContent?.trim() || "attachment";
        if (href) {
          event.preventDefault();
          event.stopPropagation();
          if (href.startsWith("data:")) {
            void openAttachedFile(href, fileName);
          } else if (href.startsWith("forma-asset://")) {
            void notesApi.openLocalAsset?.(href.replace("forma-asset://", ""));
          } else {
            void openExternalUrl(href);
          }
          return;
        }
      }

      const anchor = target.closest<HTMLAnchorElement>(".note-editor a, .editor-scroll a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href) return;

      event.preventDefault();
      event.stopPropagation();
      const fileName = anchor.getAttribute("download") || anchor.textContent?.trim() || "attachment";
      if (href.startsWith("data:")) {
        void openAttachedFile(href, fileName);
      } else if (href.startsWith("forma-asset://")) {
        void notesApi.openLocalAsset?.(href.replace("forma-asset://", ""));
      } else {
        void openExternalUrl(href);
      }
    }
    document.addEventListener("click", openEditorLink, true);
    return () => document.removeEventListener("click", openEditorLink, true);
  }, []);

  useKeyboardShortcuts({
    onCreateNote: () => void createNote(),
    onSearchFocus: () => setSearchInput(""),
    onSave: () => void flushPendingSaves(),
    onTogglePin: () => {
      if (selectedNote) void updateNote(selectedNote.id, { isPinned: !selectedNote.isPinned });
    },
    onAttachmentPicker: () => openAttachmentPicker(),
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onZoomIn: () => setNoteZoom((z) => clampNumber(Number((z + 0.1).toFixed(1)), 0.8, 1.6)),
    onZoomOut: () => setNoteZoom((z) => clampNumber(Number((z - 0.1).toFixed(1)), 0.8, 1.6)),
    onResetZoom: () => setNoteZoom(1)
  });

  useEffect(() => {
    if (!selectedNote && filteredNotes[0]) {
      setSelectedNoteId(filteredNotes[0].id);
    }
    if (selectedNote && !filteredNotes.some((note) => note.id === selectedNote.id)) {
      setSelectedNoteId(filteredNotes[0]?.id ?? null);
    }
  }, [filteredNotes, selectedNote]);

  useEffect(() => {
    if (!editor || !selectedNote) {
      setTitleDraft("");
      return;
    }

    setTitleDraft(selectedNote.title);
    suppressEditorUpdate.current = true;
    editor.commands.setContent(JSON.parse(selectedNote.bodyJson || emptyBodyJson));
    window.setTimeout(() => {
      suppressEditorUpdate.current = false;
    }, 0);
  }, [editor, selectedNoteId]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resize = resizeState.current;
      if (!resize) return;
      const delta = event.clientX - resize.startX;
      const editorMinimum = window.innerWidth <= 1050 ? 340 : 380;
      const availableForColumn = window.innerWidth - editorMinimum - 16 - (resize.column === "sidebar" ? listWidth : sidebarWidth);
      if (resize.column === "sidebar") setSidebarWidth(Math.min(360, Math.max(180, Math.min(resize.startWidth + delta, availableForColumn))));
      if (resize.column === "list") setListWidth(Math.min(480, Math.max(240, Math.min(resize.startWidth + delta, availableForColumn))));
    }
    function stopResize() {
      resizeState.current = null;
      document.body.classList.remove("is-resizing-columns");
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [listWidth, sidebarWidth]);

  function startResize(column: "sidebar" | "list", event: React.PointerEvent<HTMLDivElement>) {
    resizeState.current = { column, startX: event.clientX, startWidth: column === "sidebar" ? sidebarWidth : listWidth };
    document.body.classList.add("is-resizing-columns");
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  async function loadData() {
    try {
      const dataPromise = notesApi.getData();
      const timeoutPromise = new Promise<AppData>((_, reject) =>
        window.setTimeout(() => reject(new Error("Timeout loading notes database")), 3500)
      );
      const nextData = await Promise.race([dataPromise, timeoutPromise]);
      setData(nextData);
      setSelectedNoteId(nextData.notes.find((note) => !note.isArchived)?.id ?? nextData.notes[0]?.id ?? null);
      setBootError(null);
    } catch (error) {
      console.warn("Notes API boot warning:", error);
      try {
        const localApi = createLocalNotesApi();
        const fallbackData = await localApi.getData();
        setData(fallbackData);
        setSelectedNoteId(fallbackData.notes.find((note) => !note.isArchived)?.id ?? fallbackData.notes[0]?.id ?? null);
        setBootError(null);
      } catch (innerError) {
        setBootError(innerError instanceof Error ? innerError.message : "The notes database could not be opened.");
      }
    } finally {
      setBooting(false);
    }
  }

  function queueSave(noteId: string, updates: NoteUpdate) {
    setSaveState("saving");
    setSaveError(null);
    pendingSaves.current.set(noteId, { ...(pendingSaves.current.get(noteId) ?? {}), ...updates });
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flushPendingSaves(), 350);
  }

  async function flushPendingSaves() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const pending = Array.from(pendingSaves.current.entries());
    pendingSaves.current.clear();
    if (!pending.length) return;
    try {
      for (const [noteId, updates] of pending) {
        const saved = await notesApi.updateNote(noteId, updates);
        setData((current) => ({ ...current, notes: current.notes.map((note) => (note.id === saved.id ? saved : note)) }));
      }
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1300);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this note");
      setSaveState("idle");
    }
  }

  async function createProject(name: string) {
    if (!name?.trim()) return;
    const project = await notesApi.createProject(name);
    setData((current) => ({ ...current, projects: [...current.projects, project] }));
    setFilter({ type: "project", projectId: project.id });
    setNewProjectName("");
    setIsCreatingProject(false);
  }

  async function renameProject(project: Project) {
    const name = window.prompt("Rename project", project.name);
    if (!name?.trim()) return;
    const updated = await notesApi.updateProject(project.id, name);
    setData((current) => ({
      ...current,
      projects: current.projects.map((item) => (item.id === updated.id ? updated : item))
    }));
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete "${project.name}"? Notes will move to another project.`)) return;
    const nextData = await notesApi.deleteProject(project.id);
    setData(nextData);
    setFilter({ type: "all" });
    setProjectMenu(null);
  }

  async function createNote() {
    const projectId =
      filter.type === "project"
        ? filter.projectId
        : selectedNote?.projectId ?? data.projects[0]?.id;
    if (!projectId) return;
    const note = await notesApi.createNote({ projectId, title: "Untitled", bodyJson: emptyBodyJson, bodyText: "" });
    setData((current) => ({ ...current, notes: [note, ...current.notes] }));
    setSelectedNoteId(note.id);
    setFilter({ type: "project", projectId });
  }

  async function updateNote(noteId: string, updates: NoteUpdate) {
    const saved = await notesApi.updateNote(noteId, updates);
    setData((current) => ({ ...current, notes: current.notes.map((n) => (n.id === saved.id ? saved : n)) }));
  }

  function handleTitleChange(newTitle: string) {
    setTitleDraft(newTitle);
    if (selectedNoteId) {
      queueSave(selectedNoteId, { title: newTitle });
    }
  }

  async function deleteNote(noteId: string) {
    const nextData = await notesApi.deleteNote(noteId);
    setData(nextData);
    setSelectedNoteId(nextData.notes[0]?.id ?? null);
  }

  function openAttachmentPicker() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length || !editor) return;
    for (const file of Array.from(files)) {
      if (notesApi.saveAttachment) {
        const buffer = await readFileAsArrayBuffer(file);
        const fileName = await notesApi.saveAttachment(file.name, buffer);
        const protocolUrl = `forma-asset://${fileName}`;
        
        if (isImageFile(file)) {
          editor.chain().focus().setImage({ src: protocolUrl, alt: file.name }).run();
        } else {
          const fileType = getFileType(file.name);
          const sizeStr = formatFileSize(file.size);
          editor.chain().focus().insertContent({
            type: "fileAttachment",
            attrs: {
              src: protocolUrl,
              name: file.name,
              fileType,
              size: sizeStr
            }
          }).run();
        }
      }
    }
    event.target.value = "";
  }

  async function openVersionHistory() {
    if (!selectedNoteId || !notesApi.getNoteVersions) return;
    const history = await notesApi.getNoteVersions(selectedNoteId);
    setVersions(history);
    setShowHistoryModal(true);
  }

  async function restoreVersion(versionId: string) {
    if (!selectedNoteId || !notesApi.restoreNoteVersion) return;
    const restored = await notesApi.restoreNoteVersion(selectedNoteId, versionId);
    setData((current) => ({ ...current, notes: current.notes.map((n) => (n.id === restored.id ? restored : n)) }));
    setShowHistoryModal(false);
  }

  async function handleHostNote(note: Note) {
    if (notesApi.hostNote) {
      setShareModalState({
        isOpen: true,
        mode: "host",
        target: note,
        tunnelUrl: note.syncUrl || "ws://127.0.0.1:1234",
        isLoading: true
      });
      try {
        const tunnelUrl = await notesApi.hostNote(note.id);
        setShareModalState((prev) => ({ ...prev, tunnelUrl, isLoading: false }));
        void loadData();
      } catch (err) {
        console.error("Failed to host note:", err);
      }
    }
  }

  async function handleStopHostNote(note: Note) {
    if (notesApi.stopHostNote) {
      try {
        await notesApi.stopHostNote(note.id);
        setShareModalState((prev) => ({ ...prev, isOpen: false }));
        void loadData();
      } catch (err) {
        console.error("Failed to stop hosting note:", err);
      }
    }
  }

  function handleOpenJoinNoteModal(note: Note) {
    setShareModalState({
      isOpen: true,
      mode: "join",
      target: note,
      tunnelUrl: null,
      isLoading: false
    });
  }

  async function handleOpenGeneralJoinModal() {
    if (selectedNote) {
      handleOpenJoinNoteModal(selectedNote);
    } else {
      await createNote();
      // After createNote, data.notes contains the new note
      const latestNote = data.notes[0];
      if (latestNote) {
        handleOpenJoinNoteModal(latestNote);
      }
    }
  }

  async function handleJoinNote(note: Note, tunnelUrl: string) {
    if (notesApi.joinNote) {
      await notesApi.joinNote(note.id, tunnelUrl);
      void loadData();
    }
  }

  async function handleMoveNoteToProject(noteId: string, projectId: string) {
    const targetProject = data.projects.find(p => p.id === projectId);
    await updateNote(noteId, { projectId });
    if (targetProject) {
      // Optional toast or quick confirmation if needed
    }
  }

  async function unlockApp(e: React.FormEvent) {
    e.preventDefault();
    const targetHash = readSetting("lockHash", "");
    if (!targetHash) {
      setLocked(false);
      return;
    }
    const hash = await hashText(passcode);
    if (hash === targetHash) {
      setLocked(false);
      setPasscode("");
      setPassError(null);
    } else {
      setPassError("Incorrect passcode");
    }
  }

  async function setPasscodeAndLock() {
    const code = window.prompt("Enter a new passcode to lock Project Notes:");
    if (!code) return;
    const hash = await hashText(code);
    safeSetting("lockHash", hash);
    setLocked(true);
  }

  const notesCountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const note of data.notes) {
      if (!note.isArchived) map[note.projectId] = (map[note.projectId] || 0) + 1;
    }
    return map;
  }, [data.notes]);

  const allVisibleCount = data.notes.filter((n) => !n.isArchived).length;
  const pinnedCount = data.notes.filter((n) => n.isPinned && !n.isArchived).length;
  const archivedCount = data.notes.filter((n) => n.isArchived).length;

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-loader" />
        <p>Opening Forma...</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="boot-screen">
        <h2>Could not open notes database</h2>
        <p>{bootError}</p>
        <button className="recovery-button" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="boot-screen">
        <Lock size={36} />
        <h2>Forma is Locked</h2>
        <form onSubmit={unlockApp} style={{ display: "grid", gap: 10 }}>
          <input
            type="password"
            placeholder="Enter Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
          />
          {passError && <div style={{ color: "#ff453a" }}>{passError}</div>}
          <button type="submit" className="primary-icon-button" style={{ width: "100%", height: 32 }}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div
      className={`app-shell ${sidebarVisible ? "" : "sidebar-collapsed"}`}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--list-width": `${listWidth}px`
        } as React.CSSProperties
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="visually-hidden"
        onChange={handleFileSelect}
      />

      <Sidebar
        projects={data.projects}
        filter={filter}
        setFilter={setFilter}
        allVisibleCount={allVisibleCount}
        pinnedCount={pinnedCount}
        archivedCount={archivedCount}
        notesCountByProject={notesCountByProject}
        onStartProjectCreation={() => setIsCreatingProject(true)}
        isCreatingProject={isCreatingProject}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        onSubmitProjectCreation={async (e) => {
          e.preventDefault();
          await createProject(newProjectName);
        }}
        onCancelProjectCreation={() => setIsCreatingProject(false)}
        newProjectInputRef={newProjectInputRef}
        projectMenu={projectMenu}
        setProjectMenu={setProjectMenu}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onMoveNoteToProject={handleMoveNoteToProject}
        onLockApp={setPasscodeAndLock}
        visible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onJoinSharedNote={handleOpenGeneralJoinModal}
      />

      <div
        className="column-resize-handle"
        role="separator"
        aria-label="Resize sidebar"
        onPointerDown={(e) => startResize("sidebar", e)}
      />

      <NoteList
        notes={filteredNotes}
        selectedNoteId={selectedNoteId}
        projects={data.projects}
        filter={filter}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        sortMode={sortMode}
        setSortMode={setSortMode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onSelectNote={(id) => setSelectedNoteId(id)}
        onCreateNote={createNote}
        onContextMenu={(note, e) => {
          e.preventDefault();
          if (window.confirm(`Delete "${note.title}"?`)) void deleteNote(note.id);
        }}
        dateFormatter={dateFormatter}
        onJoinSharedNote={handleOpenGeneralJoinModal}
      />

      <div
        className="column-resize-handle"
        role="separator"
        aria-label="Resize note list"
        onPointerDown={(e) => startResize("list", e)}
      />

      <NoteEditor
        selectedNote={selectedNote}
        projects={data.projects}
        editor={editor}
        titleDraft={titleDraft}
        onTitleChange={handleTitleChange}
        onUpdateNote={(updates) => {
          if (selectedNoteId) void updateNote(selectedNoteId, updates);
        }}
        onDeleteNote={deleteNote}
        saveState={saveState}
        saveError={saveError}
        noteZoom={noteZoom}
        onZoomIn={() => setNoteZoom((z) => clampNumber(Number((z + 0.1).toFixed(1)), 0.8, 1.6))}
        onZoomOut={() => setNoteZoom((z) => clampNumber(Number((z - 0.1).toFixed(1)), 0.8, 1.6))}
        onResetZoom={() => setNoteZoom(1)}
        onOpenAttachmentPicker={openAttachmentPicker}
        onOpenVersionHistory={openVersionHistory}
        onCreateNote={createNote}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        dateFormatter={dateFormatter}
        onShareNote={handleHostNote}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={data.notes}
        projects={data.projects}
        onSelectNote={(id) => setSelectedNoteId(id)}
        onCreateNote={createNote}
        onSelectFilter={(f) => setFilter(f)}
      />

      {showHistoryModal && (
        <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Version History</h2>
              <button className="icon-button" onClick={() => setShowHistoryModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {versions.length === 0 ? (
                <p>No history versions saved yet.</p>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="version-item">
                    <div>
                      <strong>{dateFormatter.format(new Date(v.createdAt))}</strong>
                      <span>{v.title || "Untitled"}</span>
                    </div>
                    <span className="command-item-badge">Restore</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {shareModalState.isOpen && (
        <ShareModal
          mode={shareModalState.mode}
          target={shareModalState.target}
          projects={data.projects}
          tunnelUrl={shareModalState.tunnelUrl}
          isLoading={shareModalState.isLoading}
          onClose={() => setShareModalState((prev) => ({ ...prev, isOpen: false }))}
          onHostNote={handleHostNote}
          onStopHostNote={handleStopHostNote}
          onJoinNote={handleJoinNote}
        />
      )}
    </div>
  );
}

function hasCompletedChecklist(bodyJson: string) {
  try {
    return bodyJson.includes('"checked":true');
  } catch {
    return false;
  }
}

function readSetting<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(`project-notes-setting-${key}`);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetting<T>(key: string, value: T) {
  try {
    localStorage.setItem(`project-notes-setting-${key}`, JSON.stringify(value));
  } catch {}
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

async function hashText(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

async function openExternalUrl(url: string) {
  const normalized = normalizeUrl(url);
  if (!normalized) return;
  try {
    if (notesApi.openUrl) {
      await notesApi.openUrl(normalized);
    } else {
      window.open(normalized, "_blank", "noopener,noreferrer");
    }
  } catch {
    window.open(normalized, "_blank", "noopener,noreferrer");
  }
}

async function openAttachedFile(dataUrl: string, name: string) {
  try {
    if (notesApi.openAttachment) {
      await notesApi.openAttachment(dataUrl, name);
    } else {
      window.open(dataUrl, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    window.alert(error instanceof Error ? `Could not open ${name}: ${error.message}` : `Could not open ${name}`);
  }
}

function readFileAsArrayBuffer(file: File) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(new Uint8Array(reader.result as ArrayBuffer)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsArrayBuffer(file);
  });
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(apng|avif|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function getFileType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (ext === "pdf") return "pdf";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) return "image";
  if (["txt", "md", "json", "js", "ts", "py", "html", "css"].includes(ext)) return "doc";
  return ext.toUpperCase() || "file";
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}



const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      name: { default: "Attachment" },
      fileType: { default: "file" },
      size: { default: "" }
    };
  },
  parseHTML() {
    return [
      { tag: "div[data-file-attachment]" },
      { tag: "div[data-pdf-attachment]" }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const fileType = (HTMLAttributes.fileType || "file").toLowerCase();
    const typeLabel = fileType.toUpperCase();
    const src = HTMLAttributes.src || "";
    const fileName = HTMLAttributes.name || "Attachment";
    const fileSize = HTMLAttributes.size || "";
    const cleanDocTitle = fileName.replace(/\.[^/.]+$/, "");

    let previewContent = null;

    if (fileType === "pdf" && src) {
      previewContent = [
        "div",
        { class: "file-attachment-preview-card" },
        [
          "iframe",
          {
            src: `${src}#toolbar=0&navpanes=0`,
            class: "pdf-preview-iframe",
            title: fileName
          }
        ]
      ];
    } else if (fileType === "image" && src) {
      previewContent = [
        "div",
        { class: "file-attachment-preview-card" },
        [
          "div",
          { class: "image-preview-popover" },
          ["img", { src: src, class: "preview-inner-image", alt: fileName }]
        ]
      ];
    }

    const blockContent: [string, ...any[]] = [
      "div",
      { "data-file-attachment": "", class: `file-attachment-block type-${fileType}` },
      [
        "span",
        { class: "file-attachment-badge" },
        typeLabel
      ],
      [
        "a",
        {
          href: src,
          class: "file-attachment-link",
          download: fileName
        },
        fileName
      ],
      fileSize ? ["span", { class: "file-attachment-size" }, fileSize] : ""
    ];

    if (previewContent) {
      blockContent.push(previewContent);
    }

    return blockContent;
  }
});

const PdfAttachment = Node.create({
  name: "pdfAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      name: { default: "Document.pdf" }
    };
  },
  parseHTML() {
    return [{ tag: "div[data-pdf-attachment]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-pdf-attachment": "", class: "pdf-attachment" }, [
      "a", { href: HTMLAttributes.src, class: "pdf-link" }, HTMLAttributes.name
    ]];
  }
});

const NotionEmbed = Node.create({
  name: "notionEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      url: { default: null },
      title: { default: "Notion page" }
    };
  },
  parseHTML() {
    return [{ tag: "div[data-notion-embed]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-notion-embed": "", class: "notion-embed" }, [
      "span", { class: "notion-embed-label" }, "NOTION"
    ], [
      "a", { href: HTMLAttributes.url, class: "notion-embed-link" }, HTMLAttributes.title
    ], [
      "span", { class: "notion-embed-caption" }, "Open in your default browser"
    ]];
  }
});

export default App;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
