import { currentSeason, type LibraryEntry } from '@/store/library';

/**
 * Abgeleitete Anzeigewerte: was Ring, Balken und die Zeile unter der Karte
 * zeigen. Bewusst rein — keine Store-Zugriffe, keine Uhr aus dem Nichts.
 * Die Uhrzeit wird hereingereicht, damit ein Countdown testbar bleibt.
 */

/**
 * Wie voll der Fortschrittsring steht (0..1).
 *
 * Zwei Fallen, die beide den Ring unsichtbar machen würden: unbekannte
 * Folgenzahl (`episodes === null`) ergäbe eine Division durch null und damit
 * NaN im `stroke-dashoffset`, und ein Fortschritt über der Staffellänge
 * zeichnete den Ring rückwärts. Beides wird hier abgefangen, nicht im SVG.
 */
export function seasonPct(e: LibraryEntry): number {
  const s = currentSeason(e);
  if (!s?.episodes) return 0;
  return Math.max(0, Math.min(e.progress / s.episodes, 1));
}

/** Die Staffelnummer, wie der Nutzer sie liest — ab 1, nicht ab 0. */
export function seasonNo(e: LibraryEntry): number {
  return e.seasonIndex + 1;
}

/**
 * „1 · 4/12" — Staffel und Stand. Ein Fragezeichen statt „null", wenn die
 * Folgenzahl noch nicht feststeht (bei laufenden Staffeln der Normalfall).
 */
export function seasonProgressLabel(e: LibraryEntry): string {
  const s = currentSeason(e);
  return `${seasonNo(e)} · ${e.progress}/${s?.episodes ?? '?'}`;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Restzeit bis zur nächsten Folge. `airingAt` ist ein AniList-Zeitstempel in
 * SEKUNDEN, `now` in Millisekunden — die Einheiten unterscheiden sich, und
 * genau das ist die übliche Fehlerquelle.
 *
 * Ein bereits vergangener Termin ergibt Null, nicht negative Zeit: „vor
 * −3 Tagen" wäre auf einer Wartemarke Unsinn.
 */
export function countdownParts(airingAt: number | null, now: number): CountdownParts | null {
  if (airingAt == null) return null;
  const restSekunden = Math.max(0, airingAt - Math.floor(now / 1000));

  return {
    days: Math.floor(restSekunden / 86_400),
    hours: Math.floor((restSekunden % 86_400) / 3_600),
    minutes: Math.floor((restSekunden % 3_600) / 60),
  };
}
