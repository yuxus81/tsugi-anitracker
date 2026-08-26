import { describe, expect, it, beforeEach } from 'vitest';
import type { MediaCard } from '@/api/types';
import type { RelationSlice } from '@/api/anilist';
import type { LibraryEntry, SeasonSnap } from '@/store/library';
import { airingSeason, announcedSeason, entry, mediaCard, resetIds, season } from '@/test/factories';
import {
  MAX_BRIDGE_HOPS,
  MAX_SEQUEL_ROUNDS,
  decideScan,
  extendSequelChain,
  firstUnwatched,
  idsToRefresh,
  refreshedSeasons,
  scanOrder,
} from './scan';

/**
 * Der Startup-Scan war die größte ungetestete Funktion der App: er verschiebt
 * Einträge zwischen Kategorien, setzt Fortschritt zurück und meldet das dem
 * Nutzer — alles im Hintergrund, ohne dass jemand hinsieht. Hier hängt jede
 * dieser Entscheidungen an einem Test; das Netz drumherum bleibt in lib/scan.ts.
 */

beforeEach(resetIds);

/** Verknüpfungs-Ausschnitt, wie ihn AniList liefert. */
function slice(id: number, sequel: MediaCard | null = null, card: Partial<MediaCard> = {}): RelationSlice {
  return {
    id,
    relations: {
      edges: sequel ? [{ relationType: 'SEQUEL', node: { ...sequel, type: 'ANIME' } }] : [],
    } as RelationSlice['relations'],
    card: mediaCard({ id, ...card }),
  };
}

function lookupFrom(slices: RelationSlice[]): (id: number) => Promise<RelationSlice | undefined> {
  const map = new Map(slices.map((s) => [s.id, s]));
  return (id) => Promise.resolve(map.get(id));
}

describe('firstUnwatched', () => {
  it('bleibt auf der laufenden Staffel, solange Folgen offen sind', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], seasonIndex: 0, progress: 5 });
    expect(firstUnwatched(e)).toBe(0);
  });

  it('rückt weiter, wenn die aktuelle Staffel durchgeschaut ist', () => {
    const e = entry({ seasons: [season({ episodes: 12 }), season()], seasonIndex: 0, progress: 12 });
    expect(firstUnwatched(e)).toBe(1);
  });

  it('rückt nicht weiter, wenn die Staffel noch gar nicht erschienen ist', () => {
    const e = entry({ seasons: [announcedSeason({ episodes: 12 })], seasonIndex: 0, progress: 12 });
    expect(firstUnwatched(e)).toBe(0);
  });

  it('rückt nicht weiter, wenn die Folgenzahl unbekannt ist', () => {
    const e = entry({ seasons: [season({ episodes: null })], seasonIndex: 0, progress: 99 });
    expect(firstUnwatched(e)).toBe(0);
  });

  it('zeigt hinter das Ende, wenn die letzte Staffel fertig ist', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], seasonIndex: 0, progress: 12 });
    expect(firstUnwatched(e)).toBe(1);
  });
});

describe('scanOrder', () => {
  it('nimmt „Fortsetzung folgt“ zuerst, dann Abgeschlossen, dann den Rest', () => {
    const rows: LibraryEntry[] = [
      entry({ rootId: 1, status: 'watching', seasons: [season({ id: 1 })] }),
      entry({ rootId: 2, status: 'completed', seasons: [season({ id: 2 })] }),
      entry({ rootId: 3, status: 'continuation', seasons: [season({ id: 3 })] }),
      entry({ rootId: 4, status: 'planned', seasons: [season({ id: 4 })] }),
    ];
    expect(scanOrder(rows).map((e) => e.rootId)).toEqual([3, 2, 1, 4]);
  });

  it('lässt die übergebene Liste unangetastet', () => {
    const rows = [
      entry({ rootId: 1, status: 'watching', seasons: [season({ id: 1 })] }),
      entry({ rootId: 2, status: 'continuation', seasons: [season({ id: 2 })] }),
    ];
    scanOrder(rows);
    expect(rows.map((e) => e.rootId)).toEqual([1, 2]);
  });
});

describe('idsToRefresh', () => {
  it('nimmt immer die letzte bekannte Staffel — dort hängt das Sequel', () => {
    const e = entry({ seasons: [season({ id: 1 }), season({ id: 2 })] });
    expect(idsToRefresh([e])).toContain(2);
  });

  it('lässt fertige Staffeln aus der Mitte weg', () => {
    const e = entry({ seasons: [season({ id: 1 }), season({ id: 2 }), season({ id: 3 })] });
    expect(idsToRefresh([e])).toEqual([3]);
  });

  it('nimmt laufende, angekündigte und folgenlose Staffeln mit', () => {
    const e = entry({
      seasons: [
        airingSeason({ id: 1 }),
        announcedSeason({ id: 2 }),
        season({ id: 3, episodes: null }),
        season({ id: 4 }),
      ],
    });
    expect(idsToRefresh([e]).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('nennt jede Id nur einmal, auch über Einträge hinweg', () => {
    const shared = season({ id: 7 });
    const ids = idsToRefresh([entry({ seasons: [shared] }), entry({ seasons: [shared] })]);
    expect(ids).toEqual([7]);
  });

  it('kommt mit einem Eintrag ohne Staffeln klar', () => {
    expect(idsToRefresh([entry({ seasons: [] })])).toEqual([]);
  });
});

describe('refreshedSeasons', () => {
  it('frischt Folgenzahl und Air-Status aus dem Abgleich auf', () => {
    const e = entry({ seasons: [airingSeason({ id: 1, episodes: null })] });
    const fresh = refreshedSeasons(e, new Map([[1, slice(1, null, { episodes: 24, status: 'FINISHED' })]]));
    expect(fresh[0].episodes).toBe(24);
    expect(fresh[0].airStatus).toBe('FINISHED');
  });

  it('lässt Staffeln unangetastet, zu denen nichts geliefert wurde', () => {
    const only = season({ id: 1, episodes: 12 });
    const e = entry({ seasons: [only] });
    expect(refreshedSeasons(e, new Map())[0]).toEqual(only);
  });
});

describe('extendSequelChain', () => {
  it('hängt eine neu angekündigte Staffel hinten an', async () => {
    const s2 = mediaCard({ id: 2, format: 'TV' });
    const out = await extendSequelChain([season({ id: 1 })], lookupFrom([slice(1, s2), slice(2)]));
    expect(out.map((s) => s.id)).toEqual([1, 2]);
  });

  it('überspringt eine Brücken-OVA, ohne sie einzureihen', async () => {
    const bridge = mediaCard({ id: 2, format: 'SPECIAL' });
    const real = mediaCard({ id: 3, format: 'TV' });
    const out = await extendSequelChain(
      [season({ id: 1 })],
      lookupFrom([slice(1, bridge), slice(2, real), slice(3)]),
    );
    expect(out.map((s) => s.id)).toEqual([1, 3]);
  });

  it('verbraucht für die Brücke kein Staffel-Budget', async () => {
    // Jede Runde läuft über eine Brücke. Wäre die Brücke eine Runde wert,
    // käme nur die Hälfte an.
    const slices: RelationSlice[] = [];
    for (let n = 1; n <= MAX_SEQUEL_ROUNDS; n++) {
      const bridgeId = n * 10;
      slices.push(slice(n, mediaCard({ id: bridgeId, format: 'SPECIAL' })));
      slices.push(slice(bridgeId, mediaCard({ id: n + 1, format: 'TV' })));
    }
    slices.push(slice(MAX_SEQUEL_ROUNDS + 1));
    const out = await extendSequelChain([season({ id: 1 })], lookupFrom(slices));
    expect(out).toHaveLength(1 + MAX_SEQUEL_ROUNDS);
  });

  it('hängt höchstens MAX_SEQUEL_ROUNDS Staffeln pro Lauf an', async () => {
    const slices = Array.from({ length: 12 }, (_, i) =>
      slice(i + 1, mediaCard({ id: i + 2, format: 'TV' })),
    );
    const out = await extendSequelChain([season({ id: 1 })], lookupFrom(slices));
    expect(out).toHaveLength(1 + MAX_SEQUEL_ROUNDS);
  });

  it('gibt auf, wenn die Brücke nirgendwo hinführt', async () => {
    const bridge = mediaCard({ id: 2, format: 'SPECIAL' });
    const out = await extendSequelChain([season({ id: 1 })], lookupFrom([slice(1, bridge), slice(2)]));
    expect(out.map((s) => s.id)).toEqual([1]);
  });

  it('bricht ab, wenn eine Brücken-Kette länger als MAX_BRIDGE_HOPS ist', async () => {
    // Hinter der Brückenkette liegt eine ECHTE Staffel, genau einen Sprung zu
    // weit. Ohne sie wäre der Test auch mit unbegrenzten Sprüngen grün — er
    // würde die Grenze gar nicht messen.
    const slices: RelationSlice[] = [slice(1, mediaCard({ id: 10, format: 'SPECIAL' }))];
    for (let h = 0; h < MAX_BRIDGE_HOPS; h++) {
      slices.push(slice(10 + h, mediaCard({ id: 11 + h, format: 'SPECIAL' })));
    }
    slices.push(slice(10 + MAX_BRIDGE_HOPS, mediaCard({ id: 99, format: 'TV' })), slice(99));
    const out = await extendSequelChain([season({ id: 1 })], lookupFrom(slices));
    expect(out.map((s) => s.id)).toEqual([1]);
  });

  it('läuft nicht im Kreis, wenn das Sequel schon in der Kette steht', async () => {
    const back = mediaCard({ id: 1, format: 'TV' });
    const out = await extendSequelChain(
      [season({ id: 1 }), season({ id: 2 })],
      lookupFrom([slice(2, back), slice(1)]),
    );
    expect(out.map((s) => s.id)).toEqual([1, 2]);
  });

  it('bricht ab, wenn eine Brücke zurück in die Kette zeigt', async () => {
    const back = mediaCard({ id: 1, format: 'SPECIAL' });
    const out = await extendSequelChain(
      [season({ id: 1 }), season({ id: 2 })],
      lookupFrom([slice(2, back), slice(1)]),
    );
    expect(out.map((s) => s.id)).toEqual([1, 2]);
  });

  it('hält still, wenn zur letzten Staffel nichts zu holen ist', async () => {
    const out = await extendSequelChain([season({ id: 1 })], lookupFrom([]));
    expect(out.map((s) => s.id)).toEqual([1]);
  });

  it('behält die bisherige Kette, wenn das Nachladen scheitert', async () => {
    const out = await extendSequelChain([season({ id: 1 })], () => Promise.reject(new Error('offline')));
    expect(out.map((s) => s.id)).toEqual([1]);
  });

  it('kommt mit einer leeren Kette klar, statt zu stolpern', async () => {
    await expect(extendSequelChain([], lookupFrom([]))).resolves.toEqual([]);
  });
});

describe('decideScan', () => {
  const zwei = (over: Partial<SeasonSnap> = {}): SeasonSnap[] => [
    season({ id: 1, episodes: 12 }),
    season({ id: 2, title: 'Zweite', ...over }),
  ];

  it('schiebt einen abgeschlossenen Eintrag auf „Noch zu schauen“, wenn die neue Staffel da ist', () => {
    const seasons = zwei();
    const e = entry({ status: 'completed', seasons: [seasons[0]], seasonIndex: 0, progress: 12 });
    const d = decideScan(e, seasons);
    expect(d.patch).toMatchObject({ status: 'nextup', seasonIndex: 1, progress: 0, releaseNote: null });
    expect(d.toast).toEqual({ key: 'scanNewSeason', title: 'Zweite' });
  });

  it('holt „Fortsetzung folgt“ ebenso ab', () => {
    const seasons = zwei();
    const e = entry({
      status: 'continuation',
      seasons: [seasons[0]],
      seasonIndex: 0,
      progress: 12,
      releaseNote: '2027',
    });
    expect(decideScan(e, seasons).patch).toMatchObject({ status: 'nextup', releaseNote: null });
  });

  it('reißt niemanden aus „Schaue ich“ heraus', () => {
    const seasons = zwei();
    const e = entry({ status: 'watching', seasons: [seasons[0]], seasonIndex: 0, progress: 12 });
    const d = decideScan(e, seasons);
    expect(d.patch.status).toBeUndefined();
    expect(d.patch.progress).toBeUndefined();
    expect(d.toast).toBeNull();
  });

  it('meldet eine angekündigte Fortsetzung mit ihrem Jahr', () => {
    const seasons = [
      season({ id: 1, episodes: 12 }),
      announcedSeason({ id: 2, title: 'Zweite', seasonYear: 2027 }),
    ];
    const e = entry({ status: 'completed', seasons: [seasons[0]], seasonIndex: 0, progress: 12 });
    const d = decideScan(e, seasons);
    expect(d.patch).toMatchObject({ status: 'continuation', seasonIndex: 1, progress: 0, releaseNote: '2027' });
    expect(d.toast).toEqual({ key: 'scanAnnounced', title: 'Zweite' });
  });

  it('setzt keinen Jahresvermerk, wenn AniList kein Jahr kennt', () => {
    const seasons = [season({ id: 1, episodes: 12 }), announcedSeason({ id: 2, seasonYear: null })];
    const e = entry({ status: 'completed', seasons: [seasons[0]], seasonIndex: 0, progress: 12 });
    expect(decideScan(e, seasons).patch.releaseNote).toBeNull();
  });

  it('zieht bei „Fortsetzung folgt“ nur den Termin nach — ohne zweite Meldung', () => {
    const seasons = [season({ id: 1, episodes: 12 }), announcedSeason({ id: 2, seasonYear: 2028 })];
    const e = entry({ status: 'continuation', seasons, seasonIndex: 1, progress: 0, releaseNote: '2027' });
    const d = decideScan(e, seasons);
    expect(d.patch.releaseNote).toBe('2028');
    expect(d.patch.status).toBeUndefined();
    expect(d.toast).toBeNull();
  });

  it('lässt einen unveränderten Termin in Ruhe', () => {
    const seasons = [season({ id: 1, episodes: 12 }), announcedSeason({ id: 2, seasonYear: 2027 })];
    const e = entry({ status: 'continuation', seasons, seasonIndex: 1, progress: 0, releaseNote: '2027' });
    expect(decideScan(e, seasons).patch).toEqual({ seasons });
  });

  it('schließt ab, wenn die erwartete Fortsetzung verschwunden ist', () => {
    const seasons = [season({ id: 1, episodes: 12 })];
    const e = entry({ status: 'continuation', seasons, seasonIndex: 0, progress: 12, releaseNote: '2027' });
    expect(decideScan(e, seasons).patch).toMatchObject({ status: 'completed', releaseNote: null });
  });

  it('macht aus einem laufenden Eintrag ohne Fortsetzung nichts', () => {
    const seasons = [airingSeason({ id: 1, episodes: 12 })];
    const e = entry({ status: 'watching', seasons, seasonIndex: 0, progress: 3 });
    expect(decideScan(e, seasons).patch).toEqual({ seasons });
  });

  it('gibt die aufgefrischten Staffeln immer mit — auch ohne Statuswechsel', () => {
    const seasons = zwei();
    const e = entry({ status: 'watching', seasons: [seasons[0]], seasonIndex: 0, progress: 1 });
    expect(decideScan(e, seasons).patch.seasons).toBe(seasons);
  });
});
