/// <reference types="node" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Version shown in Settings -> About. CI sets VITE_APP_VERSION; locally use the root package.json.
process.env.VITE_APP_VERSION ||= JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version;
const persian = process.env.VITE_STORE === 'bazaar' || process.env.VITE_STORE === 'myket';

export default defineConfig({
  // "/" for normal hosting, Electron and Capacitor; "/<repo>/" for GitHub Pages (set VITE_BASE in CI).
  base: process.env.VITE_BASE || "/",
  plugins: [react({ jsxImportSource: persian ? '@mini-sumo/locale' : undefined }), {
    name: 'iranian-store-language',
    transformIndexHtml(html) {
      return persian ? html.replace('<html lang="en">', '<html lang="fa" dir="rtl">').replace('<title>Mini Sumo</title>', '<title>مینی سومو</title>') : html;
    },
  }],
  resolve: {
    alias: {
      '@mini-sumo/locale': fileURLToPath(new URL('./src/locale', import.meta.url)),
      // Offline mode runs the server's framework-free simulation in the browser.
      "@mini-sumo/sim": fileURLToPath(new URL("../server/src/sim.ts", import.meta.url)),
    },
  },
  // One .env at the repository root serves both server and client (only VITE_* reaches the client).
  envDir: "../..",
  server: {
    port: 5173,
    // Listen on the LAN so phones on the same network can join during development.
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
});
