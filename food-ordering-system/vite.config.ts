import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// Test settings live in vitest.config.ts (Vitest ships its own Vite version).
export default defineConfig({
  plugins: [react()],
});
