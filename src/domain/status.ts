import type { DictKey } from '@/i18n';
import { STATUS_KEY, type WatchStatus } from '@/store/library';

/**
 * Kategorie-Identität an einer Stelle.
 *
 * Im V5-Design ist Farbe nie Dekoration: jede der fünf Farben trägt genau
 * eine Bedeutung. Dieselbe Rolle färbt die Karte, den Daumen der
 * Auswahlleiste, die Seitenschiene, den Schimmer am oberen Bildschirmrand,
 * die Abschnitts-Fahne, die Balken der Statistik und die Meldung — deshalb
 * erkennt man ohne Überschrift, in welcher Kategorie man ist.
 *
 * Getragen wird das über ein `data-st`-Attribut: `src/styles/status.css`
 * hängt daran die `--tone`-Variablen, alles darunter erbt sie. Diese Tabelle
 * ist die JavaScript-Seite derselben Wahrheit.
 *
 * Farbstand 26.08.2026: Watchlist wurde von Pink auf Lila geändert, Geschaut
 * von Gold auf Grün. Gold trägt seitdem nur noch die Wertung, Pink nur noch
 * Gefahr/Löschen — beides unabhängig vom Status.
 */

/** Kategorien im Design; entspricht `WatchStatus` aus dem Store. */
export type StatusTone = 'accent' | 'blue' | 'purple' | 'slate' | 'green';

/** Zeichen aus dem Icon-Satz (Kontur/Füllung-Paar). */
export type StatusIcon = 'play' | 'ready' | 'bookmark' | 'clock' | 'seal';

export interface StatusTheme {
  /** Farbrolle — deckungsgleich mit den Tailwind-Farbnamen. */
  tone: StatusTone;
  /** Das Zeichen, an dem man die Kategorie erkennt. */
  icon: StatusIcon;
  /** Übersetzungsschlüssel des Kategorienamens. */
  labelKey: DictKey;
  /**
   * Wie sich das Cover im RUHEZUSTAND verhält. Touch-Geräte haben kein
   * Hover — dort ist der Ruhezustand der einzige Zustand, den man je sieht.
   * Deshalb ist „Fortsetzung folgt" nur gedämpft und nicht entsättigt: ein
   * Cover, das für immer grau bliebe, wäre auf dem Handy ein Fehler.
   */
  rest: 'progress' | 'badge' | 'ribbon' | 'dimmed' | 'seal';
}

export const STATUS_THEME: Record<WatchStatus, StatusTheme> = {
  watching: { tone: 'accent', icon: 'play', labelKey: STATUS_KEY.watching, rest: 'progress' },
  nextup: { tone: 'blue', icon: 'ready', labelKey: STATUS_KEY.nextup, rest: 'badge' },
  planned: { tone: 'purple', icon: 'bookmark', labelKey: STATUS_KEY.planned, rest: 'ribbon' },
  continuation: { tone: 'slate', icon: 'clock', labelKey: STATUS_KEY.continuation, rest: 'dimmed' },
  completed: { tone: 'green', icon: 'seal', labelKey: STATUS_KEY.completed, rest: 'seal' },
};

/**
 * Der Wert fürs `data-st`-Attribut. Seiten ohne eigene Kategorie (Entdecken,
 * Einstellungen) brauchen trotzdem eine Farbrolle — sonst bliebe der
 * Schimmer am oberen Rand farblos und der Rahmen sähe kaputt aus.
 */
export function statusTone(status: WatchStatus | null | undefined): WatchStatus {
  return status && status in STATUS_THEME ? status : 'watching';
}
