import { beforeEach, describe, expect, test } from 'vitest';
import { useLibrary, type SeasonSnap, type WatchStatus } from '@/store/library';
import { useToasts } from '@/store/toast';
import { announcedSeason, resetIds, season } from '@/test/factories';

/**
 * Charakterisierungstests der Zustandsübergänge — das Herzstück der App: wo
 * ein Eintrag nach einer Aktion LIEGT. Bewusst gegen den echten Store, nicht
 * gegen eine Attrappe: ohne angemeldeten Nutzer überspringt der Store die
 * Supabase-Aufrufe von selbst (`currentUserId()` liefert null), und
 * IndexedDB übernimmt `fake-indexeddb`. So läuft echter Produktionscode.
 */

function reset() {
  resetIds();
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: true });
  useToasts.setState({ toasts: [] });
}

/** Kurzform: Eintrag über den echten Weg anlegen und zurückgeben. */
function add(args: {
  seasons: SeasonSnap[];
  status?: WatchStatus;
  watchedThrough?: number;
  currentEpisode?: number;
}) {
  const created = useLibrary.getState().addFranchise({
    seasons: args.seasons,
    genres: ['Action'],
    status: args.status ?? 'watching',
    watchedThrough: args.watchedThrough ?? 0,
    currentEpisode: args.currentEpisode ?? 0,
  });
  if (!created) throw new Error('addFranchise gab null zurück — Testaufbau falsch');
  return created;
}

const statusVon = (rootId: number) => useLibrary.getState().entries[rootId]?.status;
const eintrag = (rootId: number) => useLibrary.getState().entries[rootId];

beforeEach(reset);

describe('addFranchise', () => {
  test('legt einen Eintrag unter der Id der ersten Staffel ab', () => {
    const s1 = season({ id: 10 });
    const s2 = season({ id: 20 });

    const e = add({ seasons: [s1, s2] });

    expect(e.rootId).toBe(10);
    expect(useLibrary.getState().entries[10]).toBeDefined();
  });

  test('gibt null zurück, statt einen leeren Eintrag anzulegen', () => {
    const result = useLibrary.getState().addFranchise({
      seasons: [],
      genres: [],
      status: 'watching',
      watchedThrough: 0,
      currentEpisode: 0,
    });

    expect(result).toBeNull();
    expect(Object.keys(useLibrary.getState().entries)).toHaveLength(0);
  });

  test('„Geschaut" gewählt → alles Veröffentlichte gilt als geschaut', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12 })],
      status: 'completed',
    });

    expect(e.status).toBe('completed');
    expect(e.seasonIndex).toBe(1);
    expect(e.progress).toBe(12);
  });

  test('schneidet „bis Staffel X geschaut" auf die veröffentlichten Staffeln ab', () => {
    // Nutzer behauptet, bis Staffel 5 geschaut zu haben — es gibt nur zwei.
    const e = add({
      seasons: [season({ id: 1 }), season({ id: 2 })],
      status: 'watching',
      watchedThrough: 5,
    });

    expect(e.seasonIndex).toBeLessThanOrEqual(1);
  });

  test('der Zeiger stoppt an der ERSTEN unerschienenen Staffel, nicht an der letzten', () => {
    // Zwei angekündigte Staffeln: wer behauptet, alle drei geschaut zu haben,
    // darf nicht auf 2028 gesetzt werden — gewartet wird auf 2027.
    // (Mit nur EINER unerschienenen Staffel bliebe der Fehler unsichtbar,
    // weil eine andere Klemmung dasselbe Ergebnis liefert.)
    const e = add({
      seasons: [
        season({ id: 1, episodes: 12 }),
        announcedSeason({ id: 2, seasonYear: 2027 }),
        announcedSeason({ id: 3, seasonYear: 2028 }),
      ],
      status: 'watching',
      watchedThrough: 3,
    });

    expect(e.seasonIndex).toBe(1);
    expect(e.releaseNote).toBe('2027');
  });

  test('„bis Staffel 1 geschaut", Staffel 2 ist schon da → landet in „Noch zu schauen", nicht in „Weiter schauen"', () => {
    // Sonst würde die App so tun, als liefe Staffel 2 bereits.
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12 })],
      status: 'watching',
      watchedThrough: 1,
    });

    expect(e.status).toBe('nextup');
    expect(e.seasonIndex).toBe(1);
    expect(e.progress).toBe(0);
  });

  test('Zeiger auf einer angekündigten Staffel → „Fortsetzung folgt" mit Jahresvermerk', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), announcedSeason({ id: 2, seasonYear: 2027 })],
      status: 'watching',
      watchedThrough: 1,
    });

    expect(e.status).toBe('continuation');
    expect(e.releaseNote).toBe('2027');
  });
});

describe('setProgress — der Episoden-Stepper', () => {
  test('zählt hoch', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })] });

    useLibrary.getState().setProgress(e.rootId, 3);

    expect(eintrag(e.rootId).progress).toBe(3);
  });

  test('deckelt auf die Folgenzahl der Staffel', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })] });

    useLibrary.getState().setProgress(e.rootId, 99);

    expect(eintrag(e.rootId).progress).toBe(12);
  });

  test('lässt den Fortschritt nicht unter null fallen', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })] });

    useLibrary.getState().setProgress(e.rootId, -5);

    expect(eintrag(e.rootId).progress).toBe(0);
  });

  test('erste Episode aus der Watchlist heraus → Status wird „Schaue ich"', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })], status: 'planned' });
    expect(statusVon(e.rootId)).toBe('planned');

    useLibrary.getState().setProgress(e.rootId, 1);

    expect(statusVon(e.rootId)).toBe('watching');
  });

  test('erste Episode aus „Noch zu schauen" heraus → ebenfalls „Schaue ich"', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12 })],
      status: 'watching',
      watchedThrough: 1,
    });
    expect(statusVon(e.rootId)).toBe('nextup');

    useLibrary.getState().setProgress(e.rootId, 1);

    expect(statusVon(e.rootId)).toBe('watching');
  });

  test('letzte Episode, nächste Staffel ist da → rückt vor nach „Noch zu schauen", nicht ungefragt weiter', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12 })],
    });

    useLibrary.getState().setProgress(e.rootId, 12);

    const nach = eintrag(e.rootId);
    expect(nach.status).toBe('nextup');
    expect(nach.seasonIndex).toBe(1);
    expect(nach.progress).toBe(0);
  });

  test('letzte Episode, Fortsetzung nur angekündigt → „Fortsetzung folgt"', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), announcedSeason({ id: 2, seasonYear: 2027 })],
    });

    useLibrary.getState().setProgress(e.rootId, 12);

    const nach = eintrag(e.rootId);
    expect(nach.status).toBe('continuation');
    expect(nach.releaseNote).toBe('2027');
  });

  test('letzte Episode der letzten Staffel → „Geschaut"', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })] });

    useLibrary.getState().setProgress(e.rootId, 12);

    expect(statusVon(e.rootId)).toBe('completed');
  });

  test('meldet den Staffelwechsel als Hinweis', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12, title: 'Zweite Staffel' })],
    });

    useLibrary.getState().setProgress(e.rootId, 12);

    const texte = useToasts.getState().toasts.map((t) => t.text);
    expect(texte.join(' ')).toContain('Zweite Staffel');
  });

  test('eine noch laufende Staffel schließt nicht ab, auch wenn alle bisherigen Folgen gesehen sind', () => {
    // Wöchentliche Ausstrahlung: Folge 12 von 12 gesehen, Staffel läuft aber
    // noch (RELEASING) — der Eintrag darf nicht auf „Geschaut" springen.
    const e = add({ seasons: [season({ id: 1, episodes: 12, airStatus: 'RELEASING' })] });

    useLibrary.getState().setProgress(e.rootId, 12);

    expect(statusVon(e.rootId)).toBe('watching');
  });

  test('tut nichts bei unbekanntem Eintrag, statt abzustürzen', () => {
    expect(() => useLibrary.getState().setProgress(999_999, 3)).not.toThrow();
  });
});

describe('setStatus — manueller Wechsel', () => {
  test('auf „Geschaut" setzen schiebt den Zeiger ans Ende des Veröffentlichten', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 24 })],
    });

    useLibrary.getState().setStatus(e.rootId, 'completed');

    const nach = eintrag(e.rootId);
    expect(nach.seasonIndex).toBe(1);
    expect(nach.progress).toBe(24);
    expect(nach.releaseNote).toBeNull();
  });

  test('auf „Geschaut" setzen überspringt eine angekündigte Staffel', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), announcedSeason({ id: 2 })],
    });

    useLibrary.getState().setStatus(e.rootId, 'completed');

    expect(eintrag(e.rootId).seasonIndex).toBe(0);
  });

  test('auf „Watchlist" setzen lässt den Fortschritt in Ruhe', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })], currentEpisode: 4 });
    useLibrary.getState().setProgress(e.rootId, 4);

    useLibrary.getState().setStatus(e.rootId, 'planned');

    expect(eintrag(e.rootId).progress).toBe(4);
    expect(eintrag(e.rootId).status).toBe('planned');
  });
});

describe('setWatchedThrough — „bis hierhin geschaut" nachträglich korrigieren', () => {
  test('setzt Zeiger und Fortschritt neu', () => {
    const e = add({
      seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12 }), season({ id: 3, episodes: 12 })],
    });

    useLibrary.getState().setWatchedThrough(e.rootId, 2);

    const nach = eintrag(e.rootId);
    expect(nach.seasonIndex).toBe(2);
    expect(nach.progress).toBe(0);
  });

  test('alle Staffeln durch → Eintrag gilt als abgeschlossen', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12 })] });

    useLibrary.getState().setWatchedThrough(e.rootId, 2);

    expect(statusVon(e.rootId)).toBe('completed');
  });

  test('negative Eingabe wird auf null geklemmt', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })] });

    useLibrary.getState().setWatchedThrough(e.rootId, -3);

    expect(eintrag(e.rootId).seasonIndex).toBe(0);
  });
});

describe('Wertung, Notizen, Entfernen', () => {
  test('Wertung setzen und wieder löschen', () => {
    const e = add({ seasons: [season({ id: 1 })] });

    useLibrary.getState().setRating(e.rootId, 8);
    expect(eintrag(e.rootId).rating).toBe(8);

    useLibrary.getState().setRating(e.rootId, null);
    expect(eintrag(e.rootId).rating).toBeNull();
  });

  test('Notiz setzen', () => {
    const e = add({ seasons: [season({ id: 1 })] });

    useLibrary.getState().setNotes(e.rootId, 'Lieblingsfolge: 7');

    expect(eintrag(e.rootId).notes).toBe('Lieblingsfolge: 7');
  });

  test('Entfernen nimmt den Eintrag aus der Bibliothek', () => {
    const e = add({ seasons: [season({ id: 1 })] });

    useLibrary.getState().remove(e.rootId);

    expect(useLibrary.getState().entries[e.rootId]).toBeUndefined();
  });

  test('Profilname wird auf 24 Zeichen gekürzt und getrimmt', () => {
    useLibrary.getState().setUsername('   ' + 'x'.repeat(40) + '   ');

    expect(useLibrary.getState().username).toHaveLength(24);
  });

  test('leerer Profilname wird abgelehnt statt gespeichert', () => {
    useLibrary.getState().setUsername('Yunus');
    useLibrary.getState().setUsername('   ');

    expect(useLibrary.getState().username).toBe('Yunus');
  });
});

describe('updatedAt — Grundlage der Sortierung „zuletzt geändert oben"', () => {
  test('jede Änderung frischt den Zeitstempel auf', () => {
    const e = add({ seasons: [season({ id: 1, episodes: 12 })] });
    const vorher = eintrag(e.rootId).updatedAt;

    useLibrary.getState().setRating(e.rootId, 5);

    expect(eintrag(e.rootId).updatedAt).toBeGreaterThanOrEqual(vorher);
  });
});
