import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useMediaQuery } from '@/lib/useMediaQuery';

/**
 * Breakpoints, die React WIRKLICH mitbekommt. `window.innerWidth` beim
 * Rendern abzufragen sieht richtig aus, ist aber tot: dreht jemand das Gerät
 * oder zieht das Fenster schmal, rechnet niemand nach. Genau daran hing der
 * Partikel-Fehler auf der Entdecken-Seite — auf einem schmalen Fenster liefen
 * weiter 22 statt 8 Partikel.
 *
 * Dieser Hook trägt außerdem die Seitenschiene ab 900 px im neuen Design.
 */

type Listener = (e: MediaQueryListEvent) => void;

/** Steuerbare matchMedia-Attrappe: Treffer lässt sich zur Laufzeit umschalten. */
function installMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  let matches = initial;

  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: Listener) => void listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => void listeners.delete(cb),
    addListener: (cb: Listener) => void listeners.add(cb),
    removeListener: (cb: Listener) => void listeners.delete(cb),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  return {
    set(next: boolean) {
      matches = next;
      for (const cb of listeners) cb({ matches: next } as MediaQueryListEvent);
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  test('meldet den Anfangszustand der Abfrage', () => {
    installMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery('(min-width: 900px)'));

    expect(result.current).toBe(true);
  });

  test('meldet false, wenn die Abfrage nicht zutrifft', () => {
    installMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery('(min-width: 900px)'));

    expect(result.current).toBe(false);
  });

  test('rechnet nach, wenn sich die Fenstergröße ändert — das ist der ganze Punkt', () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 900px)'));
    expect(result.current).toBe(false);

    act(() => mm.set(true));

    expect(result.current).toBe(true);
  });

  test('hängt seinen Zuhörer beim Aufräumen wieder ab', () => {
    const mm = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 900px)'));
    expect(mm.listenerCount).toBe(1);

    unmount();

    expect(mm.listenerCount).toBe(0);
  });

  test('läuft ohne matchMedia durch, statt die Seite abstürzen zu lassen', () => {
    // Ältere Umgebungen und manche Test-Renderer kennen matchMedia nicht.
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;

    const { result } = renderHook(() => useMediaQuery('(min-width: 900px)'));

    expect(result.current).toBe(false);
  });
});
