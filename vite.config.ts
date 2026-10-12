import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { singleFile } from "./scripts/single-file";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 15000000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  plugins: [react(), tailwindcss(), singleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
