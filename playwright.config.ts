import { defineConfig, devices } from "@playwright/test";

const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
const e2eDemoPassword = process.env.E2E_DEMO_USER_PASSWORD;

if (!e2eAuthSecret || !e2eDemoPassword) {
  throw new Error("Defina E2E_AUTH_SECRET e E2E_DEMO_USER_PASSWORD antes de executar os testes E2E.");
}

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
      AUTH_SECRET: e2eAuthSecret,
      DEMO_AUTH_ENABLED: "true",
      DEMO_USER_PASSWORD: e2eDemoPassword,
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
