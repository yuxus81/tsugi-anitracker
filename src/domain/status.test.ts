import { describe, expect, test } from 'vitest';
import { STATUS_ORDER, type WatchStatus } from '@/store/library';
import { STATUS_THEME, statusTone } from '@/domain/status';

/**
 * Die Kategorie-Identität liegt an EINER Stelle: Farbe, Zeichen und Bauform
 * jeder Kategorie kommen aus dieser Tabelle. Der wichtigste Test hier ist der
 * Vollständigkeitstest — vergisst später jemand einen Status, fällt das hier
 * auf und nicht als farbloses Loch auf dem Handy.
 */

describe('STATUS_THEME — eine Quelle für alle fünf Kategorien', () => {
  test('kennt jeden Status, den der Store vergeben kann', () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_THEME[status], `Kategorie „${status}" fehlt in STATUS_THEME`).toBeDefined();
    }
  });

  test('führt keine Kategorie, die der Store gar nicht vergibt', () => {
    const bekannt = new Set<string>(STATUS_ORDER);

    for (const key of Object.keys(STATUS_THEME)) {
      expect(bekannt.has(key), `STATUS_THEME kennt „${key}", der Store nicht`).toBe(true);
    }
  });

  test('jede Kategorie hat eine eigene Farbe — keine zwei teilen sich eine', () => {
    const toene = STATUS_ORDER.map((s) => STATUS_THEME[s].tone);

    expect(new Set(toene).size).toBe(STATUS_ORDER.length);
  });

  test('jede Kategorie hat ein eigenes Zeichen', () => {
    const zeichen = STATUS_ORDER.map((s) => STATUS_THEME[s].icon);

    expect(new Set(zeichen).size).toBe(STATUS_ORDER.length);
  });

  test('jede Kategorie nennt ihren Übersetzungsschlüssel', () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_THEME[status].labelKey).toMatch(/^st[A-Z]/);
    }
  });

  test('Gold und Pink tauchen als Kategoriefarbe nicht auf — die tragen Wertung und Gefahr', () => {
    const toene = STATUS_ORDER.map((s) => STATUS_THEME[s].tone);

    expect(toene).not.toContain('gold');
    expect(toene).not.toContain('pink');
  });

  test('die Farbzuordnung entspricht der Entscheidung vom 26.08.2026', () => {
    // Watchlist wurde von Pink auf Lila geändert, Geschaut von Gold auf Grün,
    // und „Noch zu schauen" bekam dadurch Blau. Steht so in der V5-Übergabe.
    expect(STATUS_THEME.watching.tone).toBe('accent');
    expect(STATUS_THEME.nextup.tone).toBe('blue');
    expect(STATUS_THEME.planned.tone).toBe('purple');
    expect(STATUS_THEME.continuation.tone).toBe('slate');
    expect(STATUS_THEME.completed.tone).toBe('green');
  });
});

describe('statusTone — der Wert fürs data-st-Attribut', () => {
  test('gibt den Status unverändert zurück, wenn er bekannt ist', () => {
    expect(statusTone('planned')).toBe('planned');
  });

  test('fällt auf „watching" zurück, wenn nichts gesetzt ist', () => {
    // Seiten ohne eigene Kategorie (Entdecken, Einstellungen) brauchen
    // trotzdem eine Farbrolle, sonst bleibt der Schimmer oben farblos.
    expect(statusTone(null)).toBe('watching');
    expect(statusTone(undefined)).toBe('watching');
  });

  test('fällt auch bei einem unbekannten Wert auf „watching" zurück, statt undefined zu liefern', () => {
    expect(statusTone('quatsch' as WatchStatus)).toBe('watching');
  });
});
