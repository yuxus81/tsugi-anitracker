import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Umgebungsvariablen: `lib/env.ts` bricht beim Start ab, wenn Supabase-Werte
 * fehlen. Im Test stehen Platzhalter — echte Netzwerkaufrufe fängt msw ab,
 * echte Supabase-Aufrufe fängt der Store-Mock in den jeweiligen Tests.
 */
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

/**
 * jsdom kennt weder `matchMedia` noch `IntersectionObserver` noch
 * `scrollTo`. Ohne diese Attrappen stürzen Komponenten ab, die auf
 * `prefers-reduced-motion` oder auf Sichtbarkeit reagieren — der Test würde
 * dann an der Umgebung scheitern statt am Verhalten.
 */
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    } as unknown as typeof window.IntersectionObserver;
  }

  window.scrollTo = (() => {}) as typeof window.scrollTo;

  // jsdom hat gar kein Layout und deshalb auch kein Element.scrollTo. Der
  // Rahmen scrollt seinen Inhaltsbereich bei jedem Bildschirmwechsel nach
  // oben — ohne diese Attrappe stürben alle Rahmen-Tests an der Umgebung
  // statt am Verhalten. Ob wirklich gescrollt wird, misst Playwright.
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function scrollTo() {} as typeof Element.prototype.scrollTo;
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

afterAll(() => {
  vi.unstubAllEnvs();
});
