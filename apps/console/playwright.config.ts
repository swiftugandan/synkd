import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.SYNKD_E2E_CONSOLE_PORT ?? 4174);
const RUNTIME_PORT = Number(process.env.SYNKD_E2E_RUNTIME_PORT ?? 8791);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `pnpm --filter @synkd/cli exec tsx src/bin.ts dev --root ../../apps/parties --port ${RUNTIME_PORT}`,
      url: `http://127.0.0.1:${RUNTIME_PORT}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: "../..",
    },
    {
      command: `pnpm exec vite --host 127.0.0.1 --port ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_SYNKD_PROXY_TARGET: `http://127.0.0.1:${RUNTIME_PORT}`,
      },
    },
  ],
});
