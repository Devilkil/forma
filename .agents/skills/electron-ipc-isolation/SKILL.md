---
name: electron-ipc-isolation
description: Rules for handling IPC communication between React (Renderer process) and Electron (Main process). Use when creating new IPC handlers, file system access, or opening native OS sockets.
---
# Electron IPC & Isolation Rules

1. **Context Isolation**: Always maintain context isolation. Do NOT expose `require` or native node modules in the renderer process.
2. **Preload Script**: Only expose necessary methods via `contextBridge` in the `preload.ts` script. Keep APIs narrow and strictly typed.
3. **Asynchronous IPC**: Use `ipcRenderer.invoke` and `ipcMain.handle` for two-way asynchronous communication instead of `send/on` to avoid memory leaks and unhandled callbacks.
4. **File System Access**: All file system writes (like saving attachments or loading local config) MUST happen in the Main process and be invoked via IPC.
5. **Security**: Validate all inputs sent from the renderer before passing them to native APIs like `shell.openExternal` or `fs.writeFile`.
