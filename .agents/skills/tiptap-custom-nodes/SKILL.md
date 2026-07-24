---
name: tiptap-custom-nodes
description: Guidelines for building custom Tiptap and ProseMirror extensions safely in TypeScript. Use when adding or editing node view extensions or handling click events inside the editor.
---
# Tiptap Custom Nodes Best Practices

1. **TypeScript Definitions**: Always strictly type your `HTMLAttributes` and `addAttributes()`.
2. **Node Views**: When using complex interactive nodes (like file attachments), consider using Node Views or properly handling DOM events (`editorProps.handleDOMEvents`) to prevent Tiptap from swallowing clicks.
3. **Storage vs Rendering**: Do not store massive binary data in node attributes. Store a reference (e.g., UUID or local path) and resolve it dynamically in the UI or Node View.
4. **Click Interception**: For attachments, use `event.stopPropagation()` and `event.preventDefault()` inside custom click handlers to prevent standard editor cursor movement.
5. **Schema Compatibility**: Any changes to node schemas (like changing attribute names) can break existing stored documents. Provide a migration strategy or use graceful fallbacks.
