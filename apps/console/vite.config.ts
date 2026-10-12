import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxyTarget =
  process.env.VITE_SYNKD_PROXY_TARGET ??
  process.env.VITE_SINKD_PROXY_TARGET ??
  "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: false,
    proxy: {
      "/v1": { target: proxyTarget, changeOrigin: true },
      "/healthz": { target: proxyTarget, changeOrigin: true },
      "/metrics": { target: proxyTarget, changeOrigin: true },
      "/parties": { target: proxyTarget, changeOrigin: true, ws: true },
    },
  },
});
