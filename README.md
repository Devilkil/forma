# 📝 Forma — Next-Generation Cross-Platform Desktop Notes App

> **Forma** is a fast, offline-first, private desktop note-taking application designed for project-based organization, rich-text editing, and **real-time peer-to-peer live collaboration** across Windows and macOS.

---

## ✨ Features

- 👥 **Granular Note-Level Live Sharing**: Share individual notes in real-time without exposing or syncing other private notes in your project.
- 🎨 **Multi-Cursor Awareness**: See your peers' live cursor positions, selections, and color-coded user badges in real-time.
- 📁 **Project & Drag-and-Drop Organization**: Group notes into projects, reorder notes, and drag-and-drop notes between projects.
- ⚡ **Offline-First SQLite Engine**: Powered by an embedded SQLite database (`project-notes.sqlite`) with automated timestamped backups.
- ✍️ **Rich TipTap Editor**: Supports headings, code blocks, task checklists, image attachments, link previews, export to Markdown/HTML/TXT, and version history restore.
- 🛡️ **Privacy & Security**: Built-in Passcode App Lock, encrypted local storage, and opt-in P2P WebSocket synchronization.
- 🔍 **Command Palette & Search**: Full-text search and command palette invoked instantly via `Ctrl+K` / `Cmd+K`.
- 💻 **Cross-Platform macOS & Windows**: Native titlebars, macOS traffic lights, native application menus, and window restoration.

---

## 📥 Downloads & Installation

### 🪟 Windows
- **Installer (`.exe`)**: Download [`Forma Setup 0.1.0.exe`](https://github.com/Devilkil/forma/releases)
- **Standalone Portable Executable**: [`win-unpacked/Forma.exe`](https://github.com/Devilkil/forma/releases)

*Default Data Path on Windows*: `%APPDATA%\project-notes\project-notes.sqlite`

---

### 🍏 macOS (MacBook)
- **Apple Silicon (M1 / M2 / M3 / M4)**: Download [`Forma-0.1.0-arm64.dmg`](https://github.com/Devilkil/forma/actions)
- **Intel Macs**: Download [`Forma-0.1.0-x64.dmg`](https://github.com/Devilkil/forma/actions)

*Default Data Path on macOS*: `~/Library/Application Support/project-notes/project-notes.sqlite`

---

## 🤝 How Real-Time Sharing & Joining Works

1. **Host a Note**:
   - Open any note in Forma and click the **`Share`** button in the top editor toolbar.
   - Forma starts a local Hocuspocus WebSocket sync server and generates a **Live Tunnel Link** (`ws://...`).
   - Click **Copy Link** to copy the secure tunnel URL to your clipboard.

2. **Join a Shared Session (Friends / Peers)**:
   - Your friend opens Forma on Windows or MacBook.
   - Click **`👥 Join Shared Note`** in the left sidebar or **`👥 Join Note`** in the top bar.
   - Paste the shared Tunnel URL and click **Join & Sync**.
   - Both users are instantly connected with live real-time editing and color-coded multi-cursors!

---

## 🛠️ Developer Setup & Commands

### Prerequisites
- Node.js 18+
- npm 9+

### Installation & Local Development
```bash
# Clone the repository
git clone https://github.com/Devilkil/forma.git
cd forma

# Install dependencies
npm install

# Start local dev server (Electron + Vite HMR)
npm run dev
```

### Build Executables
```bash
# Build production release for Windows (.exe & NSIS installer)
npm run dist:win

# Build production release for macOS (.dmg & .zip packages)
npm run dist:mac

# Run automated unit test suite
npm run test
```

---

## 📄 License
Private & Open Source under the MIT License. Developed with ❤️ for seamless note-taking and peer collaboration.
