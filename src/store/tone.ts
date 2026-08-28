import { useEffect } from 'react';
import { create } from 'zustand';
import type { WatchStatus } from '@/store/library';

/**
 * Welche Kategorie färbt gerade den Bildschirm (Schimmer oben, Tab-Kapsel,
 * Seitenschiene). Die Bildschirme melden ihre aktuelle Kategorie hier an; der
 * Rahmen (App) liest sie für `data-st` auf `.app`. 1:1 zum SCREEN_TONE-Konzept
 * aus design-lab/v5-nativ/app.js.
 */
interface ToneState {
  tone: WatchStatus;
  setTone: (t: WatchStatus) => void;
}

export const useTone = create<ToneState>((set) => ({
  tone: 'watching',
  setTone: (tone) => set((s) => (s.tone === tone ? s : { tone })),
}));

/** In einem Bildschirm aufrufen: setzt die Rahmenfarbe, solange er sichtbar ist. */
export function useScreenTone(tone: WatchStatus) {
  const setTone = useTone((s) => s.setTone);
  useEffect(() => {
    setTone(tone);
  }, [tone, setTone]);
}
