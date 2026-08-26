import { useEffect, useState } from 'react';

/**
 * Ein Breakpoint, den React mitbekommt.
 *
 * `window.innerWidth` beim Rendern abzufragen liest sich richtig, ist aber
 * ein Standbild: React rendert nicht neu, wenn sich das Fenster ändert, also
 * bleibt der einmal ermittelte Wert für immer stehen. Dieser Hook hängt sich
 * an die MediaQueryList und meldet jede Änderung.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    // Beim Wechsel der Abfrage kann sich der Treffer schon geändert haben,
    // bevor ein Ereignis kommt — deshalb einmal direkt nachziehen.
    setMatches(list.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
