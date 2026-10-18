import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { concile } from "@concile/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

// concile() starts the Concile backend with `vite` and serves it on the same address:
// the app, /api and /_dashboard all live at http://localhost:5173.
export default defineConfig({
    plugins: [
        react(),
        concile(),
        tailwindcss()
    ],

    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },

});
