import { describe, expect, test } from 'vitest';
import { buildFranchiseSeasons } from '@/domain/franchise';
import type { Franchise } from '@/api/anilist';
import type { MediaDetail } from '@/api/types';
import { mediaCard } from '@/test/factories';

/**
 * Der Franchise-Zeitstrahl entscheidet, welche Staffeln ein Eintrag überhaupt
 * kennt — und damit jede spätere Zahl: Fortschritt, Gesamtfolgen, Statistik.
 * Baut er falsch, ist der Rest der App zwangsläufig falsch.
 */

function detail(over: Partial<MediaDetail> = {}): MediaDetail {
  return { ...mediaCard(), description: null, bannerImage: null, relations: { edges: [] }, ...over } as MediaDetail;
}

function franchise(over: Partial<Franchise> = {}): Franchise {
  return { mainline: [], extras: [], ...over } as Franchise;
}

describe('buildFranchiseSeasons', () => {
  test('ohne Franchise-Daten bleibt der Titel selbst die einzige Staffel', () => {
    const seasons = buildFranchiseSeasons(detail({ id: 7 }), undefined);

    expect(seasons.map((s) => s.id)).toEqual([7]);
  });

  test('sortiert die Hauptlinie chronologisch nach Jahr', () => {
    const f = franchise({
      mainline: [
        mediaCard({ id: 3, seasonYear: 2023 }),
        mediaCard({ id: 1, seasonYear: 2019 }),
        mediaCard({ id: 2, seasonYear: 2021 }),
      ],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  test('mischt Kinofilme in den Zeitstrahl — sonst überspringt „Geschaut" sie stillschweigend', () => {
    const f = franchise({
      mainline: [mediaCard({ id: 1, seasonYear: 2020 }), mediaCard({ id: 3, seasonYear: 2022 })],
      extras: [{ relation: 'Fortsetzung', media: mediaCard({ id: 2, format: 'MOVIE', seasonYear: 2021 }) }],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  test('lässt Recap-Filme draußen — die erzählen nichts Neues', () => {
    const f = franchise({
      mainline: [mediaCard({ id: 1, seasonYear: 2020 })],
      extras: [{ relation: 'Zusammenfassung', media: mediaCard({ id: 9, format: 'MOVIE', seasonYear: 2020 }) }],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1]);
  });

  test('lässt Spin-off-Filme draußen', () => {
    const f = franchise({
      mainline: [mediaCard({ id: 1, seasonYear: 2020 })],
      extras: [{ relation: 'Spin-off', media: mediaCard({ id: 9, format: 'MOVIE', seasonYear: 2020 }) }],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1]);
  });

  test('lässt Serien-Extras draußen: nur Filme werden eingemischt', () => {
    const f = franchise({
      mainline: [mediaCard({ id: 1, seasonYear: 2020 })],
      extras: [{ relation: 'Nebengeschichte', media: mediaCard({ id: 9, format: 'OVA', seasonYear: 2020 }) }],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1]);
  });

  test('wirft Duplikate raus, wenn ein Film in Hauptlinie UND Extras steht', () => {
    const doppelt = mediaCard({ id: 2, format: 'MOVIE', seasonYear: 2021 });
    const f = franchise({
      mainline: [mediaCard({ id: 1, seasonYear: 2020 }), doppelt],
      extras: [{ relation: 'Fortsetzung', media: doppelt }],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1, 2]);
  });

  test('sortiert Einträge ohne Jahr ans Ende statt an den Anfang', () => {
    const f = franchise({
      mainline: [mediaCard({ id: 2, seasonYear: null }), mediaCard({ id: 1, seasonYear: 2020 })],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1, 2]);
  });

  test('hält bei gleichem Jahr die Hauptlinie vor den eingemischten Filmen', () => {
    const f = franchise({
      mainline: [mediaCard({ id: 1, seasonYear: 2021 })],
      extras: [{ relation: 'Fortsetzung', media: mediaCard({ id: 2, format: 'MOVIE', seasonYear: 2021 }) }],
    });

    const seasons = buildFranchiseSeasons(detail(), f);

    expect(seasons.map((s) => s.id)).toEqual([1, 2]);
  });
});
