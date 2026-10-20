import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { concile } from "@concile/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react(), concile(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});