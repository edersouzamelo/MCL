import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- -p 3010",
    url: "http://127.0.0.1:3010/entrar",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      AUTH_SECRET: "playwright-secret",
      DEMO_AUTH_ENABLED: "true",
      DEMO_ACCESS_CODE: "MCL-DEMO-2026",
      DEMO_USER_PASSWORD: "MCL-DEMO-2026",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3010",
      NEXTAUTH_URL: "http://127.0.0.1:3010",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
