import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRoller } from '@/lib/useRoller';

/**
 * DER ZUFALLSROLLER.
 *
 * Er rollt sichtbar durch die Liste und wird dabei langsamer, statt sofort
 * ein Ergebnis hinzuwerfen — die Bewegung ist die Entscheidung. Genau
 * deshalb ist er ein eigener Baustein: Home UND Bibliothek brauchen ihn, und
 * zweimal dieselbe Timer-Kette von Hand zu pflegen ginge einmal gut.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Die ganze Kette bis zum Stillstand ablaufen lassen. */
function bisZumEnde() {
  act(() => {
    vi.advanceTimersByTime(20_000);
  });
}

describe('Zufallsroller', () => {
  test('landet auf einem Eintrag aus der Liste — nicht daneben', () => {
    const { result } = renderHook(() => useRoller([11, 22, 33]));

    act(() => result.current.roll());
    bisZumEnde();

    expect([11, 22, 33]).toContain(result.current.highlightId);
  });

  test('rollt erst und steht dann still', () => {
    const { result } = renderHook(() => useRoller([11, 22, 33]));

    act(() => result.current.roll());
    expect(result.current.rolling).toBe(true);

    bisZumEnde();
    expect(result.current.rolling).toBe(false);
  });

  test('eine leere Liste lässt sich nicht würfeln', () => {
    const { result } = renderHook(() => useRoller([]));

    act(() => result.current.roll());

    expect(result.current.rolling).toBe(false);
    expect(result.current.highlightId).toBeNull();
  });

  test('ein zweiter Wurf mitten im Lauf wird ignoriert', () => {
    // Sonst laufen zwei Ketten gleichzeitig und die Markierung zuckt.
    const { result } = renderHook(() => useRoller([11, 22, 33]));

    act(() => result.current.roll());
    const beim = result.current.highlightId;
    act(() => result.current.roll());

    expect(result.current.highlightId).toBe(beim);
  });

  test('eine Liste mit einem einzigen Eintrag endet auf diesem', () => {
    const { result } = renderHook(() => useRoller([99]));

    act(() => result.current.roll());
    bisZumEnde();

    expect(result.current.highlightId).toBe(99);
    expect(result.current.rolling).toBe(false);
  });

  test('beim Verlassen der Seite bleibt kein Timer stehen', () => {
    const { result, unmount } = renderHook(() => useRoller([11, 22, 33]));

    act(() => result.current.roll());
    unmount();

    // Ein überlebender Timer würde nach dem Aushängen `setState` rufen —
    // React meldet das als Warnung, und der Test soll das aufdecken.
    expect(() => bisZumEnde()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
