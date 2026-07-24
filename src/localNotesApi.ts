import { emptyBodyJson, welcomeBodyJson } from "../shared/defaultContent";
import type { AppData, Note, NoteInput, NoteUpdate, NotesApi, Project } from "../shared/types";

const storageKey = "project-notes-browser-data";
let memoryData: AppData | null = null;

const now = () => new Date().toISOString();
const id = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function createLocalNotesApi(): NotesApi {
  let data = loadData();

  function commit(nextData: AppData) {
    data = nextData;
    safeSetItem(storageKey, JSON.stringify(data));
  }

  return {
    async getData() {
      return data;
    },
    async createProject(name: string) {
      const timestamp = now();
      const project: Project = {
        id: id(),
        name: normalizeName(name),
        createdAt: timestamp,
        updatedAt: timestamp,
        isShared: false
      };
      commit({ ...data, projects: [...data.projects, project] });
      return project;
    },
    async updateProject(projectId: string, name: string) {
      const timestamp = now();
      const project = data.projects.find((item) => item.id === projectId);
      if (!project) throw new Error("Project not found");
      const updated = { ...project, name: normalizeName(name), updatedAt: timestamp };
      commit({
        ...data,
        projects: data.projects.map((item) => (item.id === projectId ? updated : item))
      });
      return updated;
    },
    async deleteProject(projectId: string) {
      if (data.projects.length <= 1) throw new Error("At least one project is required");
      const fallback = data.projects.find((project) => project.id !== projectId);
      if (!fallback) throw new Error("No fallback project available");
      const timestamp = now();
      const nextData = {
        projects: data.projects.filter((project) => project.id !== projectId),
        notes: data.notes.map((note) =>
          note.projectId === projectId ? { ...note, projectId: fallback.id, updatedAt: timestamp } : note
        )
      };
      commit(nextData);
      return nextData;
    },
    async createNote(input: NoteInput) {
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
      commit({ ...data, notes: [note, ...data.notes] });
      return note;
    },
    async updateNote(noteId: string, updates: NoteUpdate) {
      const note = data.notes.find((item) => item.id === noteId);
      if (!note) throw new Error("Note not found");
      const archivedChanged = updates.isArchived !== undefined && updates.isArchived !== note.isArchived;
      const updated: Note = {
        ...note,
        ...updates,
        title: updates.title !== undefined ? normalizeTitle(updates.title) : note.title,
        updatedAt: now(),
        archivedAt: archivedChanged ? (updates.isArchived ? now() : null) : note.archivedAt
      };
      commit({ ...data, notes: data.notes.map((item) => (item.id === noteId ? updated : item)) });
      return updated;
    },
    async deleteNote(noteId: string) {
      const nextData = { ...data, notes: data.notes.filter((note) => note.id !== noteId) };
      commit(nextData);
      return nextData;
    },
    async searchNotes(query: string) {
      const needle = query.trim().toLowerCase();
      return data.notes
        .filter((note) => !note.isArchived)
        .filter((note) => !needle || note.title.toLowerCase().includes(needle) || note.bodyText.toLowerCase().includes(needle))
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.localeCompare(a.updatedAt));
    },
    async importData(nextData: AppData) {
      if (!nextData.projects?.length || !Array.isArray(nextData.notes)) throw new Error("Invalid backup file");
      commit(nextData);
      return data;
    },
    async openPdf(dataUrl: string) {
      window.open(dataUrl, "_blank", "noopener,noreferrer");
    },
    async openAttachment(dataUrl: string) {
      window.open(dataUrl, "_blank", "noopener,noreferrer");
    },
    async openUrl(url: string) {
      if (!/^https?:\/\//i.test(url)) throw new Error("Only web links can be opened");
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
}

function loadData(): AppData {
  if (memoryData) return memoryData;

  const stored = safeGetItem(storageKey);
  if (stored) {
    try {
      return JSON.parse(stored) as AppData;
    } catch {
      safeRemoveItem(storageKey);
    }
  }

  const timestamp = now();
  const project: Project = {
    id: id(),
    name: "Notes",
    createdAt: timestamp,
    updatedAt: timestamp,
    isShared: false
  };
  const note: Note = {
    id: id(),
    projectId: project.id,
    title: "Welcome",
    bodyJson: welcomeBodyJson,
    bodyText:
      "Welcome to Project Notes. Create projects, save rich notes, pin important ideas, and keep everything private on this computer.",
    isPinned: false,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };

  const data = { projects: [project], notes: [note] };
  safeSetItem(storageKey, JSON.stringify(data));
  return data;
}

function safeGetItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryData = JSON.parse(value) as AppData;
  }
}

function safeRemoveItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    memoryData = null;
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
