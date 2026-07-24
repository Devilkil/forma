export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  syncUrl?: string;
};

export type Note = {
  id: string;
  projectId: string;
  title: string;
  bodyJson: string;
  bodyText: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  isShared?: boolean;
  syncUrl?: string;
};

export type NoteInput = {
  projectId: string;
  title?: string;
  bodyJson?: string;
  bodyText?: string;
};

export type NoteUpdate = Partial<{
  projectId: string;
  title: string;
  bodyJson: string;
  bodyText: string;
  isPinned: boolean;
  isArchived: boolean;
}>;

export type NoteVersion = {
  id: string;
  noteId: string;
  title: string;
  bodyJson: string;
  bodyText: string;
  createdAt: string;
};

export type NotesFilter =
  | { type: "all" }
  | { type: "pinned" }
  | { type: "archived" }
  | { type: "project"; projectId: string }
  | { type: "tag"; tag: string }
  | { type: "checklists" };

export type AppData = {
  projects: Project[];
  notes: Note[];
};

export type NotesApi = {
  getData(): Promise<AppData>;
  createProject(name: string): Promise<Project>;
  updateProject(id: string, name: string): Promise<Project>;
  deleteProject(id: string): Promise<AppData>;
  createNote(input: NoteInput): Promise<Note>;
  updateNote(id: string, updates: NoteUpdate): Promise<Note>;
  deleteNote(id: string): Promise<AppData>;
  searchNotes(query: string): Promise<Note[]>;
  importData?(data: AppData): Promise<AppData>;
  getNoteVersions?(noteId: string): Promise<NoteVersion[]>;
  restoreNoteVersion?(noteId: string, versionId: string): Promise<Note>;
  openPdf?(dataUrl: string, name: string): Promise<void>;
  openAttachment?(dataUrl: string, name: string): Promise<void>;
  openUrl?(url: string): Promise<void>;
  saveAttachment?(name: string, buffer: Uint8Array): Promise<string>;
  openLocalAsset?(uuid: string): Promise<void>;
  hostNote?: (noteId: string) => Promise<string>;
  stopHostNote?: (noteId: string) => Promise<void>;
  joinNote?: (noteId: string, tunnelUrl: string) => Promise<void>;
  hostProject?: (projectId: string) => Promise<string>;
  stopHostProject?: (projectId: string) => Promise<void>;
  joinProject?: (projectId: string, tunnelUrl: string) => Promise<void>;
};
