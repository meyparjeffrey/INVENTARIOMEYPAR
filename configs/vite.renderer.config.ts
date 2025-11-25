import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(process.cwd(), "."),
  resolve: {
    alias: {
      "@domain": path.resolve(process.cwd(), "src/domain"),
      "@application": path.resolve(process.cwd(), "src/application"),
      "@infrastructure": path.resolve(process.cwd(), "src/infrastructure"),
      "@presentation": path.resolve(process.cwd(), "src/presentation")
    }
  },
  plugins: [react()],
  build: {
    outDir: "dist/renderer",
    sourcemap: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});

