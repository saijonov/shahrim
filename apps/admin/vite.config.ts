import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Admin portal — a desktop web dashboard for government operators. It runs on
// its own port (5174) and proxies /api → the FastAPI backend (strips the /api
// prefix) and /media → uploaded photos, mirroring the Mini App's dev setup.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
      // Uploaded photos come back as /media/photos/... — passed through verbatim.
      "/media": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
