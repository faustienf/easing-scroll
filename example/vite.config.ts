import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// `easing-scroll` resolves through the pnpm workspace link, so this example
// consumes the built package exactly as a published consumer would.
// Rebuild the library (`pnpm run build` at the repository root) after changing it.

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
