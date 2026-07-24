import { beforeEach, describe, expect, it } from "vitest";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import { NotesStore } from "../shared/NotesStore";
import { emptyBodyJson } from "../shared/defaultContent";

let SQL: SqlJsStatic;

beforeEach(async () => {
  SQL ??= await initSqlJs();
});

function createStore() {
  return new NotesStore(SQL);
}

describe("NotesStore", () => {
  it("seeds a default project and welcome note", () => {
    const store = createStore();
    const data = store.getData();

    expect(data.projects).toHaveLength(1);
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0].title).toBe("Welcome");
  });

  it("creates, updates, and deletes projects while preserving notes", () => {
    const store = createStore();
    const project = store.createProject("Client Work");
    const renamed = store.updateProject(project.id, "Client Notes");
    const note = store.createNote({ projectId: renamed.id, title: "Kickoff" });

    expect(renamed.name).toBe("Client Notes");
    expect(note.projectId).toBe(renamed.id);

    const data = store.deleteProject(renamed.id);
    const moved = data.notes.find((item) => item.id === note.id);

    expect(data.projects.some((item) => item.id === renamed.id)).toBe(false);
    expect(moved?.projectId).not.toBe(renamed.id);
  });

  it("creates and updates notes", () => {
    const store = createStore();
    const project = store.getProjects()[0];
    const note = store.createNote({ projectId: project.id, title: "Plan", bodyJson: emptyBodyJson, bodyText: "" });
    const updated = store.updateNote(note.id, {
      title: "Launch Plan",
      bodyText: "Ship the first desktop version",
      isPinned: true
    });

    expect(updated.title).toBe("Launch Plan");
    expect(updated.bodyText).toContain("desktop");
    expect(updated.isPinned).toBe(true);
  });

  it("archives, restores, and soft-deletes notes", () => {
    const store = createStore();
    const project = store.getProjects()[0];
    const note = store.createNote({ projectId: project.id, title: "Old note" });
    const archived = store.updateNote(note.id, { isArchived: true });

    expect(archived.isArchived).toBe(true);
    expect(archived.archivedAt).toBeTruthy();

    const restored = store.updateNote(note.id, { isArchived: false });
    expect(restored.isArchived).toBe(false);
    expect(restored.archivedAt).toBeNull();

    const data = store.deleteNote(note.id);
    expect(data.notes.some((item) => item.id === note.id)).toBe(false);
  });

  it("searches note title and body text while excluding archived notes", () => {
    const store = createStore();
    const project = store.getProjects()[0];
    const visible = store.createNote({ projectId: project.id, title: "Roadmap", bodyText: "Offline SQLite notes" });
    const archived = store.createNote({ projectId: project.id, title: "Roadmap archive", bodyText: "SQLite" });
    store.updateNote(archived.id, { isArchived: true });

    const results = store.searchNotes("sqlite");

    expect(results.map((note) => note.id)).toContain(visible.id);
    expect(results.map((note) => note.id)).not.toContain(archived.id);
  });

  it("exports and imports a complete notes dataset", () => {
    const store = createStore();
    const project = store.createProject("Imported Project");
    store.createNote({ projectId: project.id, title: "Imported note", bodyText: "Backup content" });
    const backup = store.getData();
    const restored = createStore();
    const result = restored.importData(backup);

    expect(result.projects.map((item) => item.id)).toContain(project.id);
    expect(result.notes.some((item) => item.title === "Imported note" && item.bodyText === "Backup content")).toBe(true);
  });
});
