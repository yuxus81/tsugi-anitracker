import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchRelationSlices } from '@/api/anilist';

/**
 * DIE KOMPLEXITÄTSGRENZE VON ANILIST.
 *
 * AniList rechnet jeder Abfrage eine „Komplexität" zu und lehnt alles über
 * 500 mit HTTP 400 ab. `fetchRelationSlices` bündelt mehrere Titel in EINE
 * Abfrage (je Titel ein Alias) — jeder Alias kostet dabei rund 54 Punkte,
 * weil an ihm der komplette Kartensatz UND dessen Verknüpfungen hängen.
 *
 * Gemessen am 26.08.2026 gegen die echte API:
 *   8 Titel  → geht durch
 *   10 Titel → „Max query complexity should be 500 but got 648."
 *
 * Der Startup-Scan hat mit 12 Titeln pro Bündel angefragt. Er ist damit bei
 * JEDEM Durchgang gescheitert — still, weil der Fehler abgefangen und
 * verschluckt wurde. „Neue Staffel erschienen" und „Fortsetzung angekündigt"
 * haben schlicht nie ausgelöst.
 *
 * Die Grenze gehört deshalb HIERHIN und nicht in die Aufrufer: `scanLibrary`
 * und `fetchFranchise` rufen beide auf, und der Zweite gab bisher gar keine
 * Obergrenze mit. Eine Regel, die jeder Aufrufer selbst einhalten muss, hält
 * irgendwann einer nicht ein.
 */

const antwort = vi.fn();

/** Ein Alias-Block, wie AniList ihn zurückgibt. */
function medium(id: number) {
  return {
    id,
    title: { romaji: `Romaji ${id}`, english: `English ${id}` },
    coverImage: { extraLarge: null, large: null, color: null },
    format: 'TV',
    status: 'FINISHED',
    episodes: 12,
    duration: 24,
    averageScore: 80,
    season: 'SPRING',
    seasonYear: 2024,
    genres: ['Action'],
    isAdult: false,
    nextAiringEpisode: null,
    startDate: { year: 2024, month: 4, day: 1 },
    relations: { edges: [] },
  };
}

beforeEach(() => {
  antwort.mockReset();
  // Jede Anfrage bekommt genau die Aliase zurück, nach denen sie gefragt hat.
  antwort.mockImplementation(async (_url: string, init: RequestInit) => {
    const { variables } = JSON.parse(String(init.body)) as {
      variables: Record<string, number>;
    };
    const data: Record<string, unknown> = {};
    for (const [alias, id] of Object.entries(variables)) data[alias] = medium(id);
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', antwort);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Wie viele Aliase steckten in Anfrage Nummer `i`? */
function anzahlIn(i: number): number {
  const body = JSON.parse(String(antwort.mock.calls[i][1].body)) as {
    variables: Record<string, number>;
  };
  return Object.keys(body.variables).length;
}

describe('fetchRelationSlices bündelt, aber nicht zu viel', () => {
  test('fragt gar nicht erst, wenn nichts zu holen ist', async () => {
    await fetchRelationSlices([]);

    expect(antwort).not.toHaveBeenCalled();
  });

  test('eine kleine Menge geht in EINER Anfrage raus', async () => {
    await fetchRelationSlices([1, 2, 3]);

    expect(antwort).toHaveBeenCalledTimes(1);
    expect(anzahlIn(0)).toBe(3);
  });

  test('KEINE Anfrage überschreitet die Komplexitätsgrenze', async () => {
    // Das ist der eigentliche Punkt. 12 Titel waren 648 Punkte — abgelehnt.
    await fetchRelationSlices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    expect(antwort.mock.calls.length).toBeGreaterThan(1);
    for (let i = 0; i < antwort.mock.calls.length; i++) {
      expect(anzahlIn(i), `Anfrage ${i} hat zu viele Titel gebündelt`).toBeLessThanOrEqual(8);
    }
  });

  test('auch eine sehr große Menge bleibt in jeder Anfrage unter der Grenze', async () => {
    const viele = Array.from({ length: 56 }, (_, i) => i + 1);

    await fetchRelationSlices(viele);

    for (let i = 0; i < antwort.mock.calls.length; i++) {
      expect(anzahlIn(i)).toBeLessThanOrEqual(8);
    }
  });

  test('trotz Aufteilung kommt jeder angefragte Titel zurück', async () => {
    // Sonst wäre die Aufteilung schlimmer als der Fehler: der Scan würde
    // stillschweigend nur einen Teil der Bibliothek prüfen.
    const viele = Array.from({ length: 20 }, (_, i) => i + 1);

    const map = await fetchRelationSlices(viele);

    expect(map.size).toBe(20);
    for (const id of viele) expect(map.has(id), `Titel ${id} fehlt`).toBe(true);
  });

  test('bündelt so voll wie erlaubt — nicht einen Titel pro Anfrage', async () => {
    // Die Bündelung ist der Grund, warum die App weit unter dem
    // Anfragelimit von AniList bleibt. Zu kleine Bündel wären die andere
    // Art, dasselbe kaputtzumachen.
    await fetchRelationSlices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(anzahlIn(0)).toBe(8);
    expect(antwort).toHaveBeenCalledTimes(2);
  });

  test('ein Abbruchsignal wird an jede Teilanfrage weitergereicht', async () => {
    const ctrl = new AbortController();

    await fetchRelationSlices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], ctrl.signal);

    for (const call of antwort.mock.calls) {
      expect(call[1].signal).toBe(ctrl.signal);
    }
  });
});
