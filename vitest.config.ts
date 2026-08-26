import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Tests laufen bewusst in einer Zeitzone WESTLICH von UTC. Datumsfehler
 * (fehlendes `timeZone: 'UTC'` beim Formatieren) verschieben ein Datum immer
 * Richtung Vergangenheit — in Deutschland (UTC+1/+2) bleibt der 1. Januar
 * dabei im Januar und der Fehler unsichtbar. In Los Angeles wird daraus der
 * 31. Dezember des Vorjahres, und der Test schlägt an.
 * Muss VOR dem Start der Worker gesetzt werden, weil Node die Zeitzone beim
 * ersten Date-Zugriff zwischenspeichert.
 */
process.env.TZ = 'America/Los_Angeles';

/**
 * Unit-, Komponenten- und Integrationstests. Die E2E- und Messläufe liegen
 * bewusst daneben in `e2e/` und laufen unter Playwright — jsdom kann weder
 * Layout noch echtes Scrollen, und genau darauf zielen die Messtests.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // `e2e` gehört Playwright; ohne diese Grenze versucht Vitest die
    // `.spec.ts`-Dateien mitzuladen und stolpert über `@playwright/test`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html'],
      // Die Domänenschicht ist der Teil, der falsche Zahlen erzeugen kann.
      // Dort ist eine hohe Schwelle sinnvoll, im UI-Rand nicht.
      include: ['src/domain/**', 'src/store/**', 'src/lib/**', 'src/components/**', 'src/pages/**'],
      exclude: ['**/*.test.*', '**/*.d.ts', 'src/test/**'],
      thresholds: {
        'src/domain/**': { statements: 95, branches: 90, functions: 95, lines: 95 },
      },
    },
  },
});
