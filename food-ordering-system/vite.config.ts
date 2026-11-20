import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// Test settings live in vitest.config.ts (Vitest ships its own Vite version).
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // The C# backend lives in this folder too. Visual Studio locks files in
      // backend/**/.vs while it runs, which makes Vite's watcher fail with EBUSY.
      ignored: ["**/backend/**"],
    },
  },
});
