import { defineConfig, devices } from '@playwright/test';

/**
 * E2E- und Messläufe. Was jsdom grundsätzlich nicht kann, wird hier geprüft:
 * echtes Layout, echtes Scrollen, echte Kontrastwerte, Safe-Areas.
 *
 * Der Dev-Server läuft auf einem eigenen Port, damit ein nebenher offenes
 * `npm run dev` nicht mitten in einen Testlauf hineinredet.
 */
const PORT = 5290;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Alle Tests teilen sich EINEN Vite-Dev-Server. Zu viele Arbeiter
  // gleichzeitig lassen ihn beim ersten Übersetzen der Module trödeln, und
  // Tests scheitern dann an der Wartezeit statt an der Sache.
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --mode test --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
