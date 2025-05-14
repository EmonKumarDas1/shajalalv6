import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";

// https://vitejs.dev/config/
export default defineConfig({
  base:
    process.env.NODE_ENV === "development"
      ? "/"
      : process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tempo()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn(warning, warn) {
        return;
      },
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "framer-motion"],
          utils: ["date-fns", "clsx", "tailwind-merge"],
        },
      },
    },
  },
  esbuild: {
    logOverride: {
      "this-is-undefined-in-esm": "silent",
      "ts-error": "silent",
      "sourcemap-error": "silent",
    },
  },
});
