import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mini App is served from a single fixed domain (Telegram origin-restriction,
// PRD §5). During local dev a Cloudflare quick-tunnel proxies to this server,
// so its hosts must be allowed. /api is proxied to the FastAPI backend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [".trycloudflare.com", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
