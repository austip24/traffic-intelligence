import { defineConfig, devices } from "@playwright/test"

// Next.js 16 allows one `next dev` per project. If one is already running,
// point the tests at it: E2E_BASE_URL=http://localhost:3000 pnpm test:e2e
const externalBaseUrl = process.env.E2E_BASE_URL
const PORT = 3100
const baseURL = externalBaseUrl ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // The app talks to a remote database; allow for cold starts and keep
  // concurrency modest so one dev server and a small pool aren't swamped.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 2 : 3,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `pnpm dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
