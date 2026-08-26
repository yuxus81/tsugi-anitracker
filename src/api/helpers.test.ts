import { describe, expect, test } from 'vitest';
import { bestTitle, cover, formatLabel, seasonLabel } from '@/api/types';
import { isMainlineFormat, pickSequel, type RelationSlice } from '@/api/anilist';
import { mediaCard } from '@/test/factories';

describe('bestTitle — welcher der beiden AniList-Titel gewinnt', () => {
  test('Englisch schlägt Romaji', () => {
    expect(bestTitle({ title: { romaji: 'Kimetsu no Yaiba', english: 'Demon Slayer' } })).toBe('Demon Slayer');
  });

  test('fällt auf Romaji zurück, wenn kein englischer Titel da ist', () => {
    expect(bestTitle({ title: { romaji: 'Sousou no Frieren', english: null } })).toBe('Sousou no Frieren');
  });

  test('leerer englischer Titel gilt als nicht vorhanden, nicht als gültiger Titel', () => {
    expect(bestTitle({ title: { romaji: 'Romaji', english: '' } })).toBe('Romaji');
  });

  test('liefert „Unbekannt" statt einer leeren Überschrift', () => {
    expect(bestTitle({ title: { romaji: null, english: null } })).toBe('Unbekannt');
  });
});

describe('cover — das größte verfügbare Bild', () => {
  test('bevorzugt extraLarge', () => {
    const url = cover(mediaCard({ coverImage: { extraLarge: 'xl.jpg', large: 'l.jpg', color: null } }));

    expect(url).toBe('xl.jpg');
  });

  test('fällt auf large zurück', () => {
    const url = cover(mediaCard({ coverImage: { extraLarge: null, large: 'l.jpg', color: null } }));

    expect(url).toBe('l.jpg');
  });

  test('gibt null statt „undefined" als Bildquelle', () => {
    const url = cover(mediaCard({ coverImage: { extraLarge: null, large: null, color: null } }));

    expect(url).toBeNull();
  });
});

describe('isMainlineFormat — was als eigene Staffel zählt', () => {
  test.each([
    ['TV', true],
    ['MOVIE', true],
    ['ONA', true],
    ['TV_SHORT', false],
    ['SPECIAL', false],
    ['OVA', false],
    ['MUSIC', false],
    [null, false],
  ] as const)('%s → %s', (format, expected) => {
    expect(isMainlineFormat(format)).toBe(expected);
  });
});

describe('formatLabel und seasonLabel', () => {
  test('übersetzt das Format in die gewählte Sprache', () => {
    expect(formatLabel('MOVIE', 'de')).not.toBe(formatLabel('MOVIE', 'en'));
  });

  test('setzt Season und Jahr zusammen', () => {
    expect(seasonLabel({ season: 'FALL', seasonYear: 2026 }, 'de')).toContain('2026');
  });

  test('zeigt nur das Jahr, wenn die Season fehlt', () => {
    expect(seasonLabel({ season: null, seasonYear: 2026 }, 'de')).toBe('2026');
  });

  test('gibt null, wenn nicht einmal das Jahr bekannt ist', () => {
    expect(seasonLabel({ season: null, seasonYear: null }, 'de')).toBeNull();
  });
});

describe('pickSequel — der nächste Schritt in der Staffelkette', () => {
  function slice(edges: Array<{ relationType: string; node: Record<string, unknown> }>): RelationSlice {
    return {
      id: 1,
      card: mediaCard({ id: 1 }),
      relations: { edges },
    } as unknown as RelationSlice;
  }

  test('findet den SEQUEL-Knoten', () => {
    const next = mediaCard({ id: 2 });
    const s = slice([{ relationType: 'SEQUEL', node: { ...next, type: 'ANIME' } }]);

    expect(pickSequel(s)?.id).toBe(2);
  });

  test('ignoriert PREQUEL — sonst liefe die Kette rückwärts', () => {
    const s = slice([{ relationType: 'PREQUEL', node: { ...mediaCard({ id: 2 }), type: 'ANIME' } }]);

    expect(pickSequel(s)).toBeNull();
  });

  test('ignoriert einen Manga-Knoten, auch wenn er als SEQUEL verknüpft ist', () => {
    // AniList verknüpft quer über Medientypen; ein Manga ist keine Staffel.
    const s = slice([{ relationType: 'SEQUEL', node: { ...mediaCard({ id: 2 }), type: 'MANGA' } }]);

    expect(pickSequel(s)).toBeNull();
  });

  test('gibt null bei einem Eintrag ganz ohne Verknüpfungen', () => {
    expect(pickSequel(slice([]))).toBeNull();
  });
});
