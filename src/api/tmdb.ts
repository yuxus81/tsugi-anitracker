import type { MediaCard } from './types';

/**
 * TMDB-Overlay für deutsche Titel + Beschreibungen. AniList bleibt das
 * strukturelle Rückgrat der App (Franchise-Relationen, Airing, Discovery);
 * TMDB wird ausschließlich für den *Anzeigetext* befragt. Titel und
 * Beschreibung kommen aus DEMSELBEN Suchaufruf (TMDBs Search-Response
 * enthält bereits `overview`) — die deutsche Beschreibung kostet also keinen
 * zusätzlichen Request. Jede Antwort wird dauerhaft in localStorage gecacht.
 *
 * Ohne `VITE_TMDB_KEY` ist das Overlay komplett inaktiv: `tmdbEnabled` ist
 * `false`, es werden keine Requests abgesetzt, und überall greifen die
 * bisherigen AniList-Texte (Romaji/Englisch-Titel, englische Beschreibung)
 * als Fallback.
 */

const KEY = import.meta.env.VITE_TMDB_KEY;
export const tmdbEnabled = Boolean(KEY);

const BASE = 'https://api.themoviedb.org/3';
const CACHE_PREFIX = 'tmdb-de:';

export interface GermanMeta {
  title: string | null;
  overview: string | null;
}

const EMPTY_META: GermanMeta = { title: null, overview: null };

/** localStorage-Cache: `undefined` = nie gefragt, sonst das (evtl. leere) Ergebnis. */
function cacheGet(id: number): GermanMeta | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + id);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { title: parsed.title ?? null, overview: parsed.overview ?? null };
    }
    // Legacy-Format aus einer früheren Version (reiner Titel-String).
    return { title: raw || null, overview: null };
  } catch {
    return undefined;
  }
}

function cacheSet(id: number, meta: GermanMeta): void {
  try {
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(meta));
  } catch {
    /* privater Modus / voller Speicher — dann eben nicht cachen */
  }
}

export interface TitleQuery {
  id: number;
  romaji: string | null;
  english: string | null;
  isMovie: boolean;
  year: number | null;
}

export function cardQuery(m: MediaCard): TitleQuery {
  return {
    id: m.id,
    romaji: m.title.romaji,
    english: m.title.english,
    isMovie: m.format === 'MOVIE',
    year: m.seasonYear,
  };
}

const inflight = new Map<number, Promise<GermanMeta>>();

async function search(
  kind: 'tv' | 'movie',
  query: string,
  year: number | null,
  signal?: AbortSignal,
): Promise<GermanMeta> {
  const params = new URLSearchParams({
    api_key: KEY as string,
    language: 'de-DE',
    query,
    include_adult: 'false',
  });
  if (year) params.set(kind === 'movie' ? 'primary_release_year' : 'first_air_date_year', String(year));

  const res = await fetch(`${BASE}/search/${kind}?${params.toString()}`, { signal });
  if (!res.ok) return EMPTY_META;
  const json = (await res.json()) as {
    results?: Array<{ name?: string; title?: string; overview?: string }>;
  };
  const top = json.results?.[0];
  if (!top) return EMPTY_META;
  const title = (kind === 'movie' ? top.title : top.name)?.trim() || null;
  const overview = top.overview?.trim() || null;
  return { title, overview };
}

/**
 * Deutscher Titel + Beschreibung für einen AniList-Eintrag — best effort.
 * Ergebnis (auch das negative) wird gecacht. Bei Netzfehlern wird NICHT
 * gecacht, damit ein späterer Versuch noch greifen kann.
 */
export async function fetchGermanMeta(q: TitleQuery, signal?: AbortSignal): Promise<GermanMeta> {
  if (!tmdbEnabled) return EMPTY_META;

  const cached = cacheGet(q.id);
  if (cached !== undefined) return cached;

  const running = inflight.get(q.id);
  if (running) return running;

  const run = (async () => {
    const primary = q.english || q.romaji;
    if (!primary) return EMPTY_META;
    try {
      const kind: 'tv' | 'movie' = q.isMovie ? 'movie' : 'tv';
      let meta = await search(kind, primary, q.year, signal);
      // Wenn die Suche mit dem englischen Titel nichts fand, mit Romaji nachfassen.
      if (!meta.title && q.romaji && q.romaji !== primary) {
        meta = await search(kind, q.romaji, q.year, signal);
      }
      cacheSet(q.id, meta);
      return meta;
    } catch {
      return EMPTY_META;
    } finally {
      inflight.delete(q.id);
    }
  })();

  inflight.set(q.id, run);
  return run;
}
