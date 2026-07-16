import type { MediaCard, MediaDetail, MediaSeason, PageOf } from './types';

/**
 * AniList GraphQL client. One request per view: the Discover page, the detail
 * page and the franchise walker each bundle everything they need into a single
 * query (GraphQL aliases), so the app stays far below AniList's rate limit by
 * construction — the structural fix for V1's "API überlastet" failures.
 */

const ENDPOINT = 'https://graphql.anilist.co';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal,
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      if (attempt >= 2) throw new ApiError(0, 'Keine Verbindung zu AniList');
      attempt += 1;
      await new Promise((r) => setTimeout(r, 700 * attempt));
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 2) throw new ApiError(res.status, 'AniList ist gerade überlastet');
      const retryAfter = Number(res.headers.get('Retry-After')) || attempt + 1;
      attempt += 1;
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 5) * 1000));
      continue;
    }
    if (!res.ok) throw new ApiError(res.status, `AniList-Fehler (${res.status})`);

    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (!json.data) throw new ApiError(400, json.errors?.[0]?.message ?? 'Leere Antwort');
    return json.data;
  }
}

// ---- Field fragments ---------------------------------------------------------

export const CARD_FIELDS = `
  id
  title { romaji english }
  coverImage { extraLarge large color }
  format status episodes duration averageScore season seasonYear genres isAdult
  nextAiringEpisode { episode airingAt }
`;

const CARD_PAGE = (alias: string, args: string) => `
  ${alias}: Page(page: 1, perPage: 18) {
    media(type: ANIME, isAdult: false, countryOfOrigin: JP, ${args}) { ${CARD_FIELDS} }
  }
`;

// ---- Discover: the whole page in ONE request ----------------------------------

export interface DiscoverData {
  trending: PageOf<MediaCard>;
  season: PageOf<MediaCard>;
  upcoming: PageOf<MediaCard>;
  top: PageOf<MediaCard>;
  movies: PageOf<MediaCard>;
}

function seasonNow(): { season: MediaSeason; year: number } {
  const d = new Date();
  const m = d.getMonth();
  const season: MediaSeason = m <= 1 ? 'WINTER' : m <= 4 ? 'SPRING' : m <= 7 ? 'SUMMER' : 'FALL';
  return { season, year: d.getFullYear() };
}

function seasonNext(): { season: MediaSeason; year: number } {
  const order: MediaSeason[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const now = seasonNow();
  const i = order.indexOf(now.season);
  return { season: order[(i + 1) % 4], year: now.season === 'FALL' ? now.year + 1 : now.year };
}

export function fetchDiscover(signal?: AbortSignal): Promise<DiscoverData> {
  const now = seasonNow();
  const next = seasonNext();
  const query = `query {
    ${CARD_PAGE('trending', 'sort: [TRENDING_DESC]')}
    ${CARD_PAGE('season', `season: ${now.season}, seasonYear: ${now.year}, sort: [POPULARITY_DESC]`)}
    ${CARD_PAGE('upcoming', `season: ${next.season}, seasonYear: ${next.year}, sort: [POPULARITY_DESC]`)}
    ${CARD_PAGE('top', 'sort: [SCORE_DESC]')}
    ${CARD_PAGE('movies', 'format: MOVIE, sort: [POPULARITY_DESC]')}
  }`;
  return gql<DiscoverData>(query, {}, signal);
}

// ---- Genre browse --------------------------------------------------------------

export interface GenreData {
  popular: PageOf<MediaCard>;
  best: PageOf<MediaCard>;
  fresh: PageOf<MediaCard>;
}

export function fetchGenre(genre: string, signal?: AbortSignal): Promise<GenreData> {
  const query = `query ($genre: String) {
    popular: Page(page: 1, perPage: 18) {
      media(type: ANIME, isAdult: false, countryOfOrigin: JP, genre: $genre, sort: [POPULARITY_DESC]) { ${CARD_FIELDS} }
    }
    best: Page(page: 1, perPage: 18) {
      media(type: ANIME, isAdult: false, countryOfOrigin: JP, genre: $genre, sort: [SCORE_DESC]) { ${CARD_FIELDS} }
    }
    fresh: Page(page: 1, perPage: 18) {
      media(type: ANIME, isAdult: false, countryOfOrigin: JP, genre: $genre, sort: [START_DATE_DESC], status_in: [RELEASING, FINISHED]) { ${CARD_FIELDS} }
    }
  }`;
  return gql<GenreData>(query, { genre }, signal);
}

// ---- Search --------------------------------------------------------------------

export async function searchAnime(
  term: string,
  signal?: AbortSignal,
): Promise<MediaCard[]> {
  const query = `query ($search: String) {
    Page(page: 1, perPage: 14) {
      media(type: ANIME, isAdult: false, search: $search, sort: [SEARCH_MATCH]) { ${CARD_FIELDS} }
    }
  }`;
  const data = await gql<{ Page: PageOf<MediaCard> }>(query, { search: term }, signal);
  return data.Page.media;
}

// ---- Detail --------------------------------------------------------------------

const DETAIL_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    ${CARD_FIELDS}
    bannerImage
    description(asHtml: false)
    startDate { year month day }
    endDate { year month day }
    trailer { id site }
    studios { nodes { name isAnimationStudio } }
    relations {
      edges {
        relationType(version: 2)
        node { type ${CARD_FIELDS} }
      }
    }
    recommendations(sort: [RATING_DESC], perPage: 12) {
      nodes { rating mediaRecommendation { ${CARD_FIELDS} } }
    }
  }
}`;

export async function fetchDetail(id: number, signal?: AbortSignal): Promise<MediaDetail> {
  const data = await gql<{ Media: MediaDetail | null }>(DETAIL_QUERY, { id }, signal);
  if (!data.Media) throw new ApiError(404, 'Anime nicht gefunden');
  return data.Media;
}

/** Batch-fetch several media by id in one request (franchise walk, library refresh). */
export async function fetchManyByIds(ids: number[], signal?: AbortSignal): Promise<MediaCard[]> {
  if (ids.length === 0) return [];
  const query = `query ($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(type: ANIME, id_in: $ids) { ${CARD_FIELDS} }
    }
  }`;
  const data = await gql<{ Page: PageOf<MediaCard> }>(query, { ids: ids.slice(0, 50) }, signal);
  return data.Page.media;
}

// ---- Franchise timeline ----------------------------------------------------------

export interface FranchiseNode {
  media: MediaCard;
  relationFromPrevious: 'SEQUEL' | 'ROOT';
}

export interface RelationSlice {
  id: number;
  relations: MediaDetail['relations'];
  card: MediaCard;
}

const RELATION_QUERY = (alias: string) => `
  ${alias}: Media(id: $${alias}, type: ANIME) {
    ${CARD_FIELDS}
    relations { edges { relationType(version: 2) node { type ${CARD_FIELDS} } } }
  }
`;

export async function fetchRelationSlices(
  ids: number[],
  signal?: AbortSignal,
): Promise<Map<number, RelationSlice>> {
  if (ids.length === 0) return new Map();
  const aliases = ids.map((_, i) => `m${i}`);
  const query = `query (${aliases.map((a) => `$${a}: Int`).join(', ')}) {
    ${aliases.map((a) => RELATION_QUERY(a)).join('\n')}
  }`;
  const vars = Object.fromEntries(ids.map((id, i) => [`m${i}`, id]));
  const data = await gql<Record<string, (MediaCard & { relations: MediaDetail['relations'] }) | null>>(
    query,
    vars,
    signal,
  );
  const out = new Map<number, RelationSlice>();
  for (const node of Object.values(data)) {
    if (node) out.set(node.id, { id: node.id, relations: node.relations, card: node });
  }
  return out;
}

function pick(
  slice: RelationSlice,
  types: Array<'SEQUEL' | 'PREQUEL' | 'PARENT'>,
): number | null {
  // Main-line walk: only TV/Movie continuations count, so specials/OVAs never
  // masquerade as a "season" on the timeline (V1's Einordnungs-bug).
  for (const t of types) {
    const edge = slice.relations.edges.find(
      (e) =>
        e.relationType === t &&
        e.node.type === 'ANIME' &&
        (e.node.format === 'TV' || e.node.format === 'MOVIE' || e.node.format === 'ONA'),
    );
    if (edge) return edge.node.id;
  }
  return null;
}

/** Der offizielle Sequel-Knoten einer Staffel (nur TV/Film/ONA zählen als Hauptlinie). */
export function pickSequel(slice: RelationSlice): MediaCard | null {
  const edge = slice.relations.edges.find(
    (e) =>
      e.relationType === 'SEQUEL' &&
      e.node.type === 'ANIME' &&
      (e.node.format === 'TV' || e.node.format === 'MOVIE' || e.node.format === 'ONA'),
  );
  return edge ? edge.node : null;
}

const MAX_CHAIN = 20;

/**
 * Chronological main-line franchise chain around `startId`, plus everything that
 * hangs off it (side stories, specials, spin-offs) grouped separately. Uses
 * batched relation queries — a full franchise resolves in 2-4 requests total.
 */
export interface Franchise {
  mainline: MediaCard[];
  extras: Array<{ relation: string; media: MediaCard }>;
}

export async function fetchFranchise(startId: number, signal?: AbortSignal): Promise<Franchise> {
  const slices = new Map<number, RelationSlice>();

  async function ensure(ids: number[]): Promise<void> {
    const missing = ids.filter((id) => !slices.has(id));
    if (!missing.length) return;
    const got = await fetchRelationSlices(missing, signal);
    got.forEach((v, k) => slices.set(k, v));
  }

  // Walk to the root.
  await ensure([startId]);
  let rootId = startId;
  const seenBack = new Set([startId]);
  for (let i = 0; i < MAX_CHAIN; i++) {
    const slice = slices.get(rootId);
    if (!slice) break;
    const prev = pick(slice, ['PREQUEL', 'PARENT']);
    if (!prev || seenBack.has(prev)) break;
    seenBack.add(prev);
    await ensure([prev]);
    rootId = prev;
  }

  // Walk forward along sequels.
  const mainline: MediaCard[] = [];
  const seen = new Set<number>();
  let cur: number | null = rootId;
  for (let i = 0; i < MAX_CHAIN && cur !== null; i++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    await ensure([cur]);
    const slice = slices.get(cur);
    if (!slice) break;
    mainline.push(slice.card);
    cur = pick(slice, ['SEQUEL']);
  }

  // Extras: anything attached to a mainline node that isn't mainline itself.
  const extras: Franchise['extras'] = [];
  const extraSeen = new Set<number>();
  const LABEL: Record<string, string> = {
    SIDE_STORY: 'Side Story',
    SPIN_OFF: 'Spin-off',
    ALTERNATIVE: 'Alternative',
    SUMMARY: 'Zusammenfassung',
    SPECIAL: 'Special',
  };
  for (const id of seen) {
    const slice = slices.get(id);
    if (!slice) continue;
    for (const e of slice.relations.edges) {
      if (e.node.type !== 'ANIME' || seen.has(e.node.id) || extraSeen.has(e.node.id)) continue;
      const isSpecialFormat =
        e.node.format === 'SPECIAL' || e.node.format === 'OVA' || e.node.format === 'MUSIC';
      const label =
        e.relationType === 'SIDE_STORY' || e.relationType === 'SPIN_OFF' || e.relationType === 'ALTERNATIVE' || e.relationType === 'SUMMARY'
          ? LABEL[e.relationType]
          : isSpecialFormat
            ? 'Special'
            : null;
      if (!label) continue;
      extraSeen.add(e.node.id);
      extras.push({ relation: label, media: e.node });
    }
  }
  extras.sort((a, b) => (a.media.seasonYear ?? 9999) - (b.media.seasonYear ?? 9999));

  return { mainline, extras };
}

// ---- Airing schedule for library entries -----------------------------------------

export async function fetchAiringForIds(
  ids: number[],
  signal?: AbortSignal,
): Promise<Map<number, { episode: number; airingAt: number }>> {
  const cards = await fetchManyByIds(ids, signal);
  const map = new Map<number, { episode: number; airingAt: number }>();
  for (const c of cards) {
    if (c.nextAiringEpisode) map.set(c.id, c.nextAiringEpisode);
  }
  return map;
}
