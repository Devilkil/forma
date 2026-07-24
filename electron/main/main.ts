import { app, BrowserWindow, ipcMain, shell, protocol, net } from "electron";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import type { SqlJsStatic } from "sql.js";
import { NotesStore } from "../../shared/NotesStore.js";
import type { AppData, NoteInput, NoteUpdate } from "../../shared/types.js";
import { Server as HocuspocusServer } from "@hocuspocus/server";
import localtunnel from "localtunnel";

import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const isDev = !app.isPackaged;

let store: NotesStore | null = null;
let lastBackupAt = 0;

async function getStore() {
  if (store) return store;

  await app.whenReady();
  const userDataDir = path.join(app.getPath("appData"), "project-notes");
  app.setPath("userData", userDataDir);
  const databasePath = path.join(userDataDir, "project-notes.sqlite");

  // Use the pure-JS asm.js build (no WASM) — works reliably inside app.asar in packaged Electron
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const initSqlJs = require("sql.js/dist/sql-asm.js") as (config?: object) => Promise<SqlJsStatic>;
  const SQL: SqlJsStatic = await initSqlJs();

  const bytes = fs.existsSync(databasePath) ? fs.readFileSync(databasePath) : undefined;
  store = new NotesStore(SQL, bytes, (nextBytes) => {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    rotateDatabaseBackups(databasePath);
    fs.writeFileSync(databasePath, nextBytes);
  });
  return store;
}

function rotateDatabaseBackups(databasePath: string) {
  if (!fs.existsSync(databasePath)) return;
  if (Date.now() - lastBackupAt < 60_000) return;
  lastBackupAt = Date.now();
  const backupDirectory = path.join(path.dirname(databasePath), "backups");
  fs.mkdirSync(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `project-notes-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`);
  fs.copyFileSync(databasePath, backupPath);
  const backups = fs.readdirSync(backupDirectory)
    .filter((file) => file.endsWith(".sqlite"))
    .sort()
    .reverse();
  for (const oldBackup of backups.slice(5)) fs.rmSync(path.join(backupDirectory, oldBackup), { force: true });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "Forma",
    backgroundColor: "#f6f3ec",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: process.platform === "darwin" ? { x: 14, y: 14 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Native macOS Application Menu for Cmd+C, Cmd+V, Cmd+Q, Cmd+Z shortcuts
  if (process.platform === "darwin") {
    const { Menu } = require("electron");
    const template: any[] = [
      {
        label: app.name,
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" }
        ]
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      },
      {
        label: "Window",
        submenu: [
          { role: "minimize" },
          { role: "zoom" },
          { type: "separator" },
          { role: "front" }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    // Keep the app focused on notes instead of exposing default desktop menu on Windows/Linux.
    window.setMenuBarVisibility(false);
    window.setAutoHideMenuBar(true);
  }

  // Web links belong in the user's Windows default browser, never in the notes window.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isWebUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  if (isDev) {
    void window.loadURL("http://localhost:5173");
  } else {
    void window.loadFile(path.join(__dirname, "../../../dist/index.html"));
  }
}

function isWebUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function registerIpc() {
  ipcMain.handle("notes:getData", async () => (await getStore()).getData());
  ipcMain.handle("notes:createProject", async (_event, name: string) => (await getStore()).createProject(name));
  ipcMain.handle("notes:updateProject", async (_event, id: string, name: string) =>
    (await getStore()).updateProject(id, name)
  );
  ipcMain.handle("notes:deleteProject", async (_event, id: string) => (await getStore()).deleteProject(id));
  ipcMain.handle("notes:createNote", async (_event, input: NoteInput) => (await getStore()).createNote(input));
  ipcMain.handle("notes:updateNote", async (_event, id: string, updates: NoteUpdate) =>
    (await getStore()).updateNote(id, updates)
  );
  ipcMain.handle("notes:deleteNote", async (_event, id: string) => (await getStore()).deleteNote(id));
  ipcMain.handle("notes:searchNotes", async (_event, query: string) => (await getStore()).searchNotes(query));
  ipcMain.handle("notes:importData", async (_event, data: AppData) => (await getStore()).importData(data));
  ipcMain.handle("notes:getNoteVersions", async (_event, noteId: string) => (await getStore()).getNoteVersions(noteId));
  ipcMain.handle("notes:restoreNoteVersion", async (_event, noteId: string, versionId: string) => (await getStore()).restoreNoteVersion(noteId, versionId));
  ipcMain.handle("attachments:openPdf", async (_event, dataUrl: string, name: string) => {
    const filePath = writeTemporaryAttachment(dataUrl, name || "document.pdf");
    await shell.openExternal(pathToFileURL(filePath).href);
  });
  ipcMain.handle("attachments:openAttachment", async (_event, dataUrl: string, name: string) => {
    const filePath = writeTemporaryAttachment(dataUrl, name || "attachment");
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
  });
  ipcMain.handle("links:openUrl", async (_event, url: string) => {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Only web links can be opened");
    await shell.openExternal(parsed.href);
  });
  
  ipcMain.handle("attachments:saveAttachment", async (_event, name: string, buffer: Uint8Array) => {
    const uuid = randomUUID();
    const safeName = name.replace(/[^a-z0-9._-]/gi, "_") || "attachment";
    const fileName = `${uuid}-${safeName}`;
    const attachmentsDir = path.join(app.getPath("userData"), "attachments");
    fs.mkdirSync(attachmentsDir, { recursive: true });
    const filePath = path.join(attachmentsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return fileName;
  });

  ipcMain.handle("attachments:openLocalAsset", async (_event, uuid: string) => {
    const filePath = path.join(app.getPath("userData"), "attachments", uuid);
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
  });

  ipcMain.handle("sync:hostNote", async (_event, noteId: string) => {
    return await hostNote(noteId);
  });

  ipcMain.handle("sync:stopHostNote", async (_event, noteId: string) => {
    await stopHostNote(noteId);
  });

  ipcMain.handle("sync:joinNote", async (_event, noteId: string, tunnelUrl: string) => {
    const store = await getStore();
    store.setNoteShared(noteId, true, tunnelUrl);
  });


}

let hocuspocusServer: HocuspocusServer | null = null;
let activeTunnel: any = null;

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

async function hostNote(noteId: string): Promise<string> {
  if (hocuspocusServer) {
    await stopHostNote(noteId);
  }

  const store = await getStore();
  store.setNoteShared(noteId, true);

  hocuspocusServer = new HocuspocusServer({
    port: 1234,
    address: "0.0.0.0",
    quiet: true,
  });

  await hocuspocusServer.listen();
  const lanIp = getLocalIpAddress();
  console.log(`[Forma Sync] Server listening on 0.0.0.0:1234 (LAN IP: ${lanIp}) for note:`, noteId);

  const localUrl = `ws://${lanIp}:1234`;
  store.setNoteShared(noteId, true, localUrl);

  tryConnectNoteTunnel(noteId, store).catch((err) => {
    console.warn("[Forma Sync] Tunnel failed (note works on local Wi-Fi):", err.message);
  });

  return localUrl;
}

async function stopHostNote(noteId: string) {
  if (activeTunnel) {
    try { await activeTunnel.close(); } catch {}
    activeTunnel = null;
  }
  if (hocuspocusServer) {
    try { await hocuspocusServer.destroy(); } catch {}
    hocuspocusServer = null;
  }
  const store = await getStore();
  store.setNoteShared(noteId, false);
}

async function tryConnectNoteTunnel(noteId: string, store: any) {
  const tunnelPromise = localtunnel({ port: 1234 });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("localtunnel connection timeout")), 15000)
  );

  const tunnel: any = await Promise.race([tunnelPromise, timeoutPromise]);
  activeTunnel = tunnel;

  const publicUrl = tunnel.url.replace(/^http/, "ws");
  console.log("[Forma Sync] Note Tunnel ready:", tunnel.url);
  store.setNoteShared(noteId, true, publicUrl);

  tunnel.on("close", () => {
    console.log("[Forma Sync] Note Tunnel closed");
    activeTunnel = null;
  });
}



function writeTemporaryAttachment(dataUrl: string, name: string) {
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("Invalid attachment");
  const header = dataUrl.slice(0, separator);
  const payload = dataUrl.slice(separator + 1);
  const bytes = header.includes(";base64") ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
  const safeName = name.replace(/[^a-z0-9._-]/gi, "_") || "attachment";
  const filePath = path.join(app.getPath("temp"), `project-notes-${Date.now()}-${safeName}`);
  fs.writeFileSync(filePath, bytes);
  return filePath;
}

registerIpc();

protocol.registerSchemesAsPrivileged([
  { scheme: 'forma-asset', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true, standard: true, stream: true } }
]);

app.whenReady().then(() => {
  protocol.handle("forma-asset", (request) => {
    const url = request.url.replace("forma-asset://", "");
    const decodedUrl = decodeURIComponent(url);
    const filePath = path.join(app.getPath("userData"), "attachments", decodedUrl);
    return net.fetch(pathToFileURL(filePath).href);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
