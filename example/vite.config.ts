import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "easing-scroll": fileURLToPath(
        new URL("../src/easing-scroll.ts", import.meta.url),
      ),
    },
  },
});
