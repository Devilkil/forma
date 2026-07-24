const { contextBridge, ipcRenderer } = require("electron");

import type { AppData, NoteInput, NoteUpdate, NotesApi } from "../../shared/types.js";

const notesApi: NotesApi = {
  getData: () => ipcRenderer.invoke("notes:getData"),
  createProject: (name: string) => ipcRenderer.invoke("notes:createProject", name),
  updateProject: (id: string, name: string) => ipcRenderer.invoke("notes:updateProject", id, name),
  deleteProject: (id: string) => ipcRenderer.invoke("notes:deleteProject", id),
  createNote: (input: NoteInput) => ipcRenderer.invoke("notes:createNote", input),
  updateNote: (id: string, updates: NoteUpdate) => ipcRenderer.invoke("notes:updateNote", id, updates),
  deleteNote: (id: string) => ipcRenderer.invoke("notes:deleteNote", id),
  searchNotes: (query: string) => ipcRenderer.invoke("notes:searchNotes", query),
  importData: (data: AppData) => ipcRenderer.invoke("notes:importData", data),
  getNoteVersions: (noteId: string) => ipcRenderer.invoke("notes:getNoteVersions", noteId),
  restoreNoteVersion: (noteId: string, versionId: string) => ipcRenderer.invoke("notes:restoreNoteVersion", noteId, versionId),
  openPdf: (dataUrl: string, name: string) => ipcRenderer.invoke("attachments:openPdf", dataUrl, name),
  openAttachment: (dataUrl: string, name: string) => ipcRenderer.invoke("attachments:openAttachment", dataUrl, name),
  openUrl: (url: string) => ipcRenderer.invoke("links:openUrl", url),
  saveAttachment: (name: string, buffer: Uint8Array) => ipcRenderer.invoke("attachments:saveAttachment", name, buffer),
  openLocalAsset: (uuid: string) => ipcRenderer.invoke("attachments:openLocalAsset", uuid),
  hostNote: (noteId: string) => ipcRenderer.invoke("sync:hostNote", noteId),
  stopHostNote: (noteId: string) => ipcRenderer.invoke("sync:stopHostNote", noteId),
  joinNote: (noteId: string, tunnelUrl: string) => ipcRenderer.invoke("sync:joinNote", noteId, tunnelUrl),
  hostProject: (projectId: string) => ipcRenderer.invoke("sync:hostProject", projectId),
  stopHostProject: (projectId: string) => ipcRenderer.invoke("sync:stopHostProject", projectId),
  joinProject: (projectId: string, tunnelUrl: string) => ipcRenderer.invoke("sync:joinProject", projectId, tunnelUrl)
};

contextBridge.exposeInMainWorld("notes", notesApi);
