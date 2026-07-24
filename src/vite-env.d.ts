/// <reference types="vite/client" />

import type { NotesApi } from "../shared/types";

declare global {
  interface Window {
    notes?: NotesApi;
  }
}
