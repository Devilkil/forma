---
name: yjs-state-management
description: Rules for managing CRDT sync with Yjs, Tiptap Collaboration, and Hocuspocus. Use when working on live collaboration or switching between personal and shared notes.
---
# Yjs & CRDT State Management

1. **Isolation**: When working with completely offline, personal notes, DO NOT load the `@tiptap/extension-collaboration` extension. It fundamentally changes how Tiptap manages local state and can interfere with IndexedDB JSON saves.
2. **Dynamic Extension Loading**: The editor must conditionally load Yjs extensions only when a note is deemed "Shared".
3. **Graceful Disconnects**: If the WebSocket drops, the user should be able to continue editing locally. Ensure the local Yjs document (`Y.Doc`) persists or syncs changes when reconnected.
4. **Hocuspocus Server**: The embedded Hocuspocus server should only be bound to a local port when necessary, shutting down when the user closes shared projects to minimize resource usage.
