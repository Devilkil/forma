import type { Database, SqlJsStatic } from "sql.js";
import { randomUUID } from "node:crypto";
import { emptyBodyJson, welcomeBodyJson } from "./defaultContent.js";
import type { AppData, Note, NoteInput, NoteUpdate, NoteVersion, Project } from "./types.js";

const defaultProjectName = "Personal";

const now = () => new Date().toISOString();
const id = () => randomUUID();

type Persist = (bytes: Uint8Array) => void | Promise<void>;

export class NotesStore {
  private readonly db: Database;
  private readonly persist?: Persist;

  constructor(SQL: SqlJsStatic, bytes?: Uint8Array, persist?: Persist) {
    this.db = bytes?.length ? new SQL.Database(bytes) : new SQL.Database();
    this.persist = persist;
    this.migrate();
    this.seed();
  }

  getData(): AppData {
    return {
      projects: this.getProjects(),
      notes: this.getNotes()
    };
  }

  getProjects(): Project[] {
    return this.db.exec("SELECT * FROM projects ORDER BY lower(name) ASC;")[0]?.values.map(projectFromRow) ?? [];
  }

  getNotes(): Note[] {
    return this.db.exec("SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY is_pinned DESC, updated_at DESC;")[0]?.values.map(noteFromRow) ?? [];
  }

  createProject(name: string): Project {
    const cleanName = normalizeName(name);
    const timestamp = now();
    const project: Project = {
      id: id(),
      name: cleanName,
      createdAt: timestamp,
      updatedAt: timestamp,
      isShared: false,
      syncUrl: undefined
    };

    this.db.run(
      "INSERT INTO projects (id, name, created_at, updated_at, is_shared, sync_url) VALUES (?, ?, ?, ?, ?, ?);",
      [project.id, project.name, project.createdAt, project.updatedAt, project.isShared ? 1 : 0, project.syncUrl || null]
    );
    this.flush();
    return project;
  }

  updateProject(projectId: string, name: string): Project {
    const cleanName = normalizeName(name);
    const timestamp = now();
    this.db.run("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?;", [cleanName, timestamp, projectId]);
    const project = this.findProject(projectId);
    if (!project) throw new Error("Project not found");
    this.flush();
    return project;
  }

  setProjectShared(projectId: string, isShared: boolean, syncUrl?: string): Project {
    const timestamp = now();
    this.db.run("UPDATE projects SET is_shared = ?, sync_url = ?, updated_at = ? WHERE id = ?;", [isShared ? 1 : 0, syncUrl || null, timestamp, projectId]);
    const project = this.findProject(projectId);
    if (!project) throw new Error("Project not found");
    this.flush();
    return project;
  }

  deleteProject(projectId: string): AppData {
    const projects = this.getProjects();
    if (projects.length <= 1) {
      throw new Error("At least one project is required");
    }

    const fallback = projects.find((project) => project.id !== projectId);
    if (!fallback) throw new Error("No fallback project available");

    this.db.run("UPDATE notes SET project_id = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL;", [
      fallback.id,
      now(),
      projectId
    ]);
    this.db.run("DELETE FROM projects WHERE id = ?;", [projectId]);
    this.flush();
    return this.getData();
  }

  createNote(input: NoteInput): Note {
    const timestamp = now();
    const note: Note = {
      id: id(),
      projectId: input.projectId,
      title: normalizeTitle(input.title),
      bodyJson: input.bodyJson ?? emptyBodyJson,
      bodyText: input.bodyText ?? "",
      isPinned: false,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null
    };

    this.db.run(
      `INSERT INTO notes (
        id, project_id, title, body_json, body_text, is_pinned, is_archived,
        created_at, updated_at, archived_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [
        note.id,
        note.projectId,
        note.title,
        note.bodyJson,
        note.bodyText,
        Number(note.isPinned),
        Number(note.isArchived),
        note.createdAt,
        note.updatedAt,
        note.archivedAt
      ]
    );
    this.flush();
    return note;
  }

  updateNote(noteId: string, updates: NoteUpdate): Note {
    const current = this.findNote(noteId);
    if (!current) throw new Error("Note not found");

    this.db.run("INSERT INTO note_versions (id, note_id, title, body_json, body_text, created_at) VALUES (?, ?, ?, ?, ?, ?);", [id(), current.id, current.title, current.bodyJson, current.bodyText, now()]);

    const archivedChanged = updates.isArchived !== undefined && updates.isArchived !== current.isArchived;
    const next = {
      projectId: updates.projectId ?? current.projectId,
      title: updates.title !== undefined ? normalizeTitle(updates.title) : current.title,
      bodyJson: updates.bodyJson ?? current.bodyJson,
      bodyText: updates.bodyText ?? current.bodyText,
      isPinned: updates.isPinned ?? current.isPinned,
      isArchived: updates.isArchived ?? current.isArchived,
      updatedAt: now(),
      archivedAt: archivedChanged ? (updates.isArchived ? now() : null) : current.archivedAt
    };

    this.db.run(
      `UPDATE notes
       SET project_id = ?, title = ?, body_json = ?, body_text = ?, is_pinned = ?,
           is_archived = ?, updated_at = ?, archived_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [
        next.projectId,
        next.title,
        next.bodyJson,
        next.bodyText,
        Number(next.isPinned),
        Number(next.isArchived),
        next.updatedAt,
        next.archivedAt,
        noteId
      ]
    );
    const note = this.findNote(noteId);
    if (!note) throw new Error("Note not found");
    this.flush();
    return note;
  }

  getNoteVersions(noteId: string): NoteVersion[] {
    return this.db.exec("SELECT * FROM note_versions WHERE note_id = ? ORDER BY created_at DESC LIMIT 20;", [noteId])[0]?.values.map(versionFromRow) ?? [];
  }

  restoreNoteVersion(noteId: string, versionId: string): Note {
    const version = this.db.exec("SELECT * FROM note_versions WHERE id = ? AND note_id = ?;", [versionId, noteId])[0]?.values.map(versionFromRow)[0];
    if (!version) throw new Error("Version not found");
    return this.updateNote(noteId, { title: version.title, bodyJson: version.bodyJson, bodyText: version.bodyText });
  }

  setNoteShared(noteId: string, isShared: boolean, syncUrl?: string): Note {
    const timestamp = now();
    this.db.run("UPDATE notes SET is_shared = ?, sync_url = ?, updated_at = ? WHERE id = ?;", [isShared ? 1 : 0, syncUrl || null, timestamp, noteId]);
    const note = this.findNote(noteId);
    if (!note) throw new Error("Note not found");
    this.flush();
    return note;
  }

  deleteNote(noteId: string): AppData {
    this.db.run("UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?;", [now(), now(), noteId]);
    this.flush();
    return this.getData();
  }

  searchNotes(query: string): Note[] {
    const needle = `%${query.trim().toLowerCase()}%`;
    if (!query.trim()) return this.getNotes().filter((note) => !note.isArchived);

    return (
      this.db.exec(
        `SELECT * FROM notes
         WHERE deleted_at IS NULL
           AND is_archived = 0
           AND (lower(title) LIKE ? OR lower(body_text) LIKE ?)
         ORDER BY is_pinned DESC, updated_at DESC;`,
        [needle, needle]
      )[0]?.values.map(noteFromRow) ?? []
    );
  }

  importData(data: AppData): AppData {
    if (!data?.projects?.length || !Array.isArray(data.notes)) throw new Error("Invalid backup file");
    this.db.run("DELETE FROM notes; DELETE FROM projects;");
    for (const project of data.projects) {
      this.db.run("INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);", [project.id, project.name, project.createdAt, project.updatedAt]);
    }
    for (const note of data.notes) {
      this.db.run(
        `INSERT INTO notes (id, project_id, title, body_json, body_text, is_pinned, is_archived, created_at, updated_at, archived_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [note.id, note.projectId, note.title, note.bodyJson, note.bodyText, Number(note.isPinned), Number(note.isArchived), note.createdAt, note.updatedAt, note.archivedAt]
      );
    }
    this.flush();
    return this.getData();
  }

  export(): Uint8Array {
    return this.db.export();
  }

  private migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_shared INTEGER DEFAULT 0,
        sync_url TEXT
      );
    `);

    // Migration to add is_shared if it doesn't exist
    try {
      this.db.run("ALTER TABLE projects ADD COLUMN is_shared INTEGER DEFAULT 0;");
    } catch {
      // Column might already exist
    }
    
    // Migration to add sync_url
    try {
      this.db.run("ALTER TABLE projects ADD COLUMN sync_url TEXT;");
    } catch {
      // Column might already exist
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        title TEXT NOT NULL,
        body_json TEXT NOT NULL,
        body_text TEXT NOT NULL DEFAULT '',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        deleted_at TEXT,
        is_shared INTEGER DEFAULT 0,
        sync_url TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_notes_project_updated ON notes(project_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_notes_archive_pin ON notes(is_archived, is_pinned, updated_at);
    `);

    // Migrations for notes table
    try {
      this.db.run("ALTER TABLE notes ADD COLUMN is_shared INTEGER DEFAULT 0;");
    } catch {}
    try {
      this.db.run("ALTER TABLE notes ADD COLUMN sync_url TEXT;");
    } catch {}

    this.db.run(`
      CREATE TABLE IF NOT EXISTS note_versions (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body_json TEXT NOT NULL,
        body_text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_note_versions_note_created ON note_versions(note_id, created_at);
    `);
  }

  private seed() {
    const projectCount = this.db.exec("SELECT COUNT(*) FROM projects;")[0]?.values[0]?.[0] as number | undefined;
    if (projectCount && projectCount > 0) return;

    const project = this.createProject(defaultProjectName);
    this.createNote({
      projectId: project.id,
      title: "Welcome",
      bodyJson: welcomeBodyJson,
      bodyText:
        "Welcome to Project Notes. Create projects, save rich notes, pin important ideas, and keep everything private on this computer."
    });
  }

  private findProject(projectId: string): Project | null {
    return this.db.exec("SELECT * FROM projects WHERE id = ?;", [projectId])[0]?.values.map(projectFromRow)[0] ?? null;
  }

  private findNote(noteId: string): Note | null {
    return this.db.exec("SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL;", [noteId])[0]?.values.map(noteFromRow)[0] ?? null;
  }

  private flush() {
    this.persist?.(this.export());
  }
}

function normalizeName(name: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Project name is required");
  return cleanName;
}

function normalizeTitle(title?: string) {
  const cleanTitle = title?.trim() ?? "";
  return cleanTitle || "Untitled";
}

function projectFromRow(row: any[]): Project {
  return {
    id: row[0] as string,
    name: row[1] as string,
    createdAt: row[2] as string,
    updatedAt: row[3] as string,
    isShared: Boolean(row[4] ?? 0),
    syncUrl: row[5] ? (row[5] as string) : undefined
  };
}

function noteFromRow(row: unknown[]): Note {
  return {
    id: String(row[0]),
    projectId: String(row[1]),
    title: String(row[2]),
    bodyJson: String(row[3]),
    bodyText: String(row[4]),
    isPinned: Boolean(row[5]),
    isArchived: Boolean(row[6]),
    createdAt: String(row[7]),
    updatedAt: String(row[8]),
    archivedAt: (row[9] as string | null) ?? null,
    isShared: Boolean(row[11] ?? 0),
    syncUrl: row[12] ? (row[12] as string) : undefined
  };
}

function versionFromRow(row: unknown[]): NoteVersion {
  return { id: String(row[0]), noteId: String(row[1]), title: String(row[2]), bodyJson: String(row[3]), bodyText: String(row[4]), createdAt: String(row[5]) };
}
