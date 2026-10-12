import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxyTarget =
  process.env.VITE_SINKD_PROXY_TARGET ?? "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
    proxy: {
      "/parties": {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
      },
      "/healthz": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});