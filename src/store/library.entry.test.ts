import { describe, expect, test } from 'vitest';
import {
  currentSeason,
  entriesByStatus,
  entryCover,
  entryTitle,
  findEntryFor,
  isReleased,
  lastWatchedSeason,
  meanDuration,
  releaseLabel,
  seasonSnapFrom,
  totalEpisodes,
  watchedEpisodes,
  type LibraryEntry,
} from '@/store/library';
import { announcedSeason, entry, mediaCard, season } from '@/test/factories';

/**
 * Charakterisierungstests der bestehenden Regeln — sie halten fest, was die
 * App HEUTE tut, bevor das Design ausgetauscht wird. Jeder Test hier wurde
 * einmal gegen absichtlich verbogenen Produktionscode laufen gelassen; wer
 * dabei grün blieb, ist geflogen (Protokoll: BISS-NACHWEIS.md).
 */

describe('watchedEpisodes — die Zahl, die der Nutzer als „gesehen" liest', () => {
  test('zählt abgeschlossene Staffeln voll plus den Fortschritt der laufenden', () => {
    const e = entry({
      seasons: [season({ episodes: 12 }), season({ episodes: 24 }), season({ episodes: 13 })],
      seasonIndex: 2,
      progress: 5,
    });

    expect(watchedEpisodes(e)).toBe(12 + 24 + 5);
  });

  test('zählt bei Zeiger auf Staffel 1 nur den Fortschritt', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], seasonIndex: 0, progress: 7 });

    expect(watchedEpisodes(e)).toBe(7);
  });

  test('behandelt eine Staffel mit unbekannter Folgenzahl als 0, statt NaN zu liefern', () => {
    const e = entry({
      seasons: [season({ episodes: null }), season({ episodes: 12 })],
      seasonIndex: 1,
      progress: 3,
    });

    expect(watchedEpisodes(e)).toBe(3);
  });
});

describe('totalEpisodes — nur Veröffentlichtes zählt mit', () => {
  test('summiert erschienene und laufende Staffeln', () => {
    const e = entry({
      seasons: [season({ episodes: 12 }), season({ episodes: 24, airStatus: 'RELEASING' })],
    });

    expect(totalEpisodes(e)).toBe(36);
  });

  test('lässt eine angekündigte Staffel draußen — sonst stünde der Balken nie voll', () => {
    const e = entry({
      seasons: [season({ episodes: 12 }), announcedSeason({ episodes: 12 })],
    });

    expect(totalEpisodes(e)).toBe(12);
  });
});

describe('isReleased', () => {
  test.each([
    ['FINISHED', true],
    ['RELEASING', true],
    ['NOT_YET_RELEASED', false],
    ['CANCELLED', false],
    ['HIATUS', false],
    [null, false],
  ] as const)('%s → %s', (airStatus, expected) => {
    expect(isReleased(season({ airStatus }))).toBe(expected);
  });
});

describe('lastWatchedSeason — was wirklich fertig geschaut wurde', () => {
  test('zeigt bei „Fortsetzung folgt" die Staffel VOR dem Zeiger', () => {
    const s1 = season({ title: 'Staffel eins' });
    const s2 = announcedSeason({ title: 'Staffel zwei' });
    const e = entry({ seasons: [s1, s2], seasonIndex: 1, status: 'continuation' });

    expect(lastWatchedSeason(e)?.title).toBe('Staffel eins');
  });

  test('gibt undefined, wenn noch nichts abgeschlossen wurde', () => {
    const e = entry({ seasonIndex: 0, status: 'watching' });

    expect(lastWatchedSeason(e)).toBeUndefined();
  });

  test('zeigt bei „Geschaut" die aktuelle Staffel selbst', () => {
    const s1 = season({ title: 'Erste' });
    const s2 = season({ title: 'Zweite' });
    const e = entry({ seasons: [s1, s2], seasonIndex: 1, status: 'completed' });

    expect(lastWatchedSeason(e)?.title).toBe('Zweite');
  });
});

describe('meanDuration — Grundlage der Statistik-Stunden', () => {
  test('mittelt die bekannten Laufzeiten', () => {
    const e = entry({ seasons: [season({ duration: 20 }), season({ duration: 30 })] });

    expect(meanDuration(e)).toBe(25);
  });

  test('fällt auf 24 Minuten zurück, wenn keine Laufzeit bekannt ist', () => {
    const e = entry({ seasons: [season({ duration: null })] });

    expect(meanDuration(e)).toBe(24);
  });

  test('ignoriert unbekannte Laufzeiten statt sie als 0 einzurechnen', () => {
    const e = entry({ seasons: [season({ duration: 20 }), season({ duration: null })] });

    expect(meanDuration(e)).toBe(20);
  });
});

describe('releaseLabel — Datumsangabe an angekündigten Staffeln', () => {
  test('bevorzugt das exakte Startdatum', () => {
    const label = releaseLabel({ startDate: { year: 2026, month: 10, day: 3 }, season: null, seasonYear: null }, 'de-DE');

    expect(label).toBe('Oktober 2026');
  });

  test('bildet eine bekannte Season auf ihren üblichen Startmonat ab', () => {
    const label = releaseLabel({ startDate: null, season: 'FALL', seasonYear: 2026 }, 'de-DE');

    expect(label).toBe('Oktober 2026');
  });

  test('fällt auf das nackte Jahr zurück, wenn die Season fehlt', () => {
    expect(releaseLabel({ startDate: null, season: null, seasonYear: 2027 }, 'de-DE')).toBe('2027');
  });

  test('gibt null, wenn gar nichts bekannt ist — der Aufrufer zeigt dann „Datum unbekannt"', () => {
    expect(releaseLabel({ startDate: null, season: null, seasonYear: null }, 'de-DE')).toBeNull();
  });

  test('rechnet nicht über die Zeitzone in den Vormonat zurück', () => {
    // Ohne timeZone: 'UTC' landet der 1. Januar in westlichen Zonen im Dezember.
    const label = releaseLabel({ startDate: { year: 2026, month: 1, day: 1 }, season: null, seasonYear: null }, 'de-DE');

    expect(label).toBe('Januar 2026');
  });
});

describe('findEntryFor — eine beliebige Staffel-Id zurück zum Franchise', () => {
  test('findet den Eintrag über eine spätere Staffel, nicht nur über die Wurzel', () => {
    const s1 = season({ id: 100 });
    const s2 = season({ id: 200 });
    const e = entry({ seasons: [s1, s2], rootId: 100 });
    const entries: Record<number, LibraryEntry> = { 100: e };

    expect(findEntryFor(entries, 200)?.rootId).toBe(100);
  });

  test('gibt undefined für eine unbekannte Id', () => {
    const entries: Record<number, LibraryEntry> = { 100: entry({ rootId: 100 }) };

    expect(findEntryFor(entries, 999)).toBeUndefined();
  });
});

describe('entriesByStatus — Gruppierung für Home und Bibliothek', () => {
  test('legt für jeden der fünf Status ein Fach an, auch für leere', () => {
    const grouped = entriesByStatus({});

    expect(Object.keys(grouped).sort()).toEqual(
      ['completed', 'continuation', 'nextup', 'planned', 'watching'].sort(),
    );
    expect(Object.values(grouped).every((list) => list.length === 0)).toBe(true);
  });

  test('sortiert innerhalb eines Status: zuletzt geändert steht oben', () => {
    const alt = entry({ rootId: 1, seasons: [season({ id: 1 })], status: 'watching', updatedAt: 1000 });
    const neu = entry({ rootId: 2, seasons: [season({ id: 2 })], status: 'watching', updatedAt: 5000 });

    const grouped = entriesByStatus({ 1: alt, 2: neu });

    expect(grouped.watching.map((e) => e.rootId)).toEqual([2, 1]);
  });
});

describe('Titel und Cover', () => {
  test('entryTitle nimmt den Titel der ERSTEN Staffel als Franchise-Namen', () => {
    const e = entry({ seasons: [season({ title: 'Frieren' }), season({ title: 'Frieren II' })], seasonIndex: 1 });

    expect(entryTitle(e)).toBe('Frieren');
  });

  test('entryTitle liefert einen Strich statt abzustürzen, wenn keine Staffel da ist', () => {
    expect(entryTitle(entry({ seasons: [] }))).toBe('—');
  });

  test('entryCover zeigt das Cover der AKTUELLEN Staffel', () => {
    const e = entry({
      seasons: [season({ coverUrl: 'eins.jpg' }), season({ coverUrl: 'zwei.jpg' })],
      seasonIndex: 1,
    });

    expect(entryCover(e)).toBe('zwei.jpg');
  });

  test('entryCover fällt auf die erste Staffel zurück, wenn die aktuelle keins hat', () => {
    const e = entry({
      seasons: [season({ coverUrl: 'eins.jpg' }), season({ coverUrl: null })],
      seasonIndex: 1,
    });

    expect(entryCover(e)).toBe('eins.jpg');
  });

  test('currentSeason folgt dem Zeiger', () => {
    const e = entry({ seasons: [season({ id: 1 }), season({ id: 2 })], seasonIndex: 1 });

    expect(currentSeason(e)?.id).toBe(2);
  });
});

describe('seasonSnapFrom — die Offline-Kopie eines AniList-Treffers', () => {
  test('übernimmt den besten Titel und das Cover', () => {
    const snap = seasonSnapFrom(
      mediaCard({ id: 42, title: { romaji: 'Kimetsu', english: 'Demon Slayer' } }),
    );

    expect(snap.id).toBe(42);
    expect(snap.title).toBe('Demon Slayer');
    expect(snap.coverUrl).toContain('42');
  });

  test('rettet den Air-Status in das Feld, an dem isReleased hängt', () => {
    const snap = seasonSnapFrom(mediaCard({ status: 'NOT_YET_RELEASED' }));

    expect(snap.airStatus).toBe('NOT_YET_RELEASED');
    expect(isReleased(snap)).toBe(false);
  });
});
