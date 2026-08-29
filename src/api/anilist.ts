import type { MediaCard, MediaDetail, MediaFormat, MediaSeason, PageOf } from './types';
import { cached, cacheGet, cacheSet, TTL } from './cache';

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

// ---- Client-seitiges Rate-Limiting ------------------------------------------------
// AniList erlaubt nur 30 Requests/Minute. Wird das Budget gerissen, blockt
// AniList 1-2 Minuten komplett (429) — genau das fühlte sich in der App als
// „hängt beim dritten Anime" an. Ein gemeinsames Sliding-Window über ALLE
// gql()-Aufrufe verhindert das strukturell.
//
// Neu (29.08.2026): das Fenster ist eine echte WARTESCHLANGE mit Vorfahrt.
// Vorher warteten alle Aufrufer im selben Timer-Loop und griffen beim
// Aufwachen gleichzeitig zu — wer zuerst dran war, war Zufall. Ein im
// Hintergrund laufender Franchise-Walk konnte damit eine gerade getippte
// Suche beliebig lange blockieren. Jetzt gilt: was der Nutzer gerade sieht
// (Suche, Detail, Entdecken) geht vor Hintergrundarbeit.
const RATE_LIMIT_PER_MIN = 26; // Sicherheitsabstand zum tatsächlichen Limit (30)
const requestTimestamps: number[] = [];
let cooldownUntil = 0;

/** 0 = Vordergrund (Nutzer wartet sichtbar), 1 = Hintergrund. */
type Priority = 0 | 1;

interface Waiter {
  priority: Priority;
  seq: number;
  resolve: () => void;
}

const waiters: Waiter[] = [];
let waiterSeq = 0;
let pumpTimer: number | undefined;

function freeSlots(now: number): number {
  while (requestTimestamps.length && now - requestTimestamps[0] > 60_000) {
    requestTimestamps.shift();
  }
  return RATE_LIMIT_PER_MIN - requestTimestamps.length;
}

function pump(): void {
  if (pumpTimer !== undefined) {
    clearTimeout(pumpTimer);
    pumpTimer = undefined;
  }
  if (!waiters.length) return;

  const now = Date.now();
  if (cooldownUntil > now) {
    pumpTimer = window.setTimeout(pump, cooldownUntil - now + 20);
    return;
  }

  let slots = freeSlots(now);
  while (slots > 0 && waiters.length) {
    // Vordergrund zuerst, innerhalb derselben Stufe nach Eintreffen.
    let best = 0;
    for (let i = 1; i < waiters.length; i++) {
      const a = waiters[i];
      const b = waiters[best];
      if (a.priority < b.priority || (a.priority === b.priority && a.seq < b.seq)) best = i;
    }
    const [w] = waiters.splice(best, 1);
    requestTimestamps.push(Date.now());
    slots -= 1;
    w.resolve();
  }

  if (waiters.length) {
    const wait = requestTimestamps.length
      ? 60_000 - (Date.now() - requestTimestamps[0]) + 30
      : 50;
    pumpTimer = window.setTimeout(pump, Math.max(30, wait));
  }
}

function waitForSlot(priority: Priority): Promise<void> {
  return new Promise<void>((resolve) => {
    waiters.push({ priority, seq: waiterSeq++, resolve });
    pump();
  });
}

// ---- Zusammenfassen identischer, gleichzeitiger Anfragen ---------------------------
// React StrictMode rendert im Dev doppelt, und mehrere Komponenten fragen
// dieselbe Detailseite gleichzeitig ab. Ohne das hier kostet jede Kopie einen
// eigenen Platz im Minutenbudget.
const inFlight = new Map<string, Promise<unknown>>();

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
  priority: Priority = 0,
): Promise<T> {
  const key = `${query}|${JSON.stringify(variables)}`;
  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;
  // Absichtlich OHNE `signal` in der Zusammenfassung: bricht ein Aufrufer ab,
  // sollen die anderen weiterlaufen. Der Abbruch wird deshalb nur lokal
  // ausgewertet, nicht an fetch durchgereicht, wenn mehrere mithören.
  const p = gqlRaw<T>(query, variables, signal, priority).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, p);
  return p;
}

async function gqlRaw<T>(
  query: string,
  variables: Record<string, unknown>,
  signal: AbortSignal | undefined,
  priority: Priority,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    await waitForSlot(priority);

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
      // Echten Retry-After respektieren statt künstlich auf 5s zu kappen —
      // sonst hämmert der Retry während der laufenden Sperre gleich wieder
      // dagegen und verlängert sie im schlimmsten Fall. Als gemeinsamer
      // Cooldown blockiert das auch alle anderen parallel wartenden Calls.
      const retryAfterSec = Number(res.headers.get('Retry-After')) || (attempt + 1) * 20;
      if (res.status === 429) cooldownUntil = Date.now() + retryAfterSec * 1000;
      attempt += 1;
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
  bannerImage
  format status episodes duration averageScore season seasonYear genres isAdult
  nextAiringEpisode { episode airingAt }
  startDate { year month day }
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
  return cached(`discover:${now.season}${now.year}`, TTL.discover, () =>
    gql<DiscoverData>(query, {}, signal),
  );
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
  return cached(`genre:${genre}`, TTL.discover, () => gql<GenreData>(query, { genre }, signal));
}

/**
 * Genres, die der Nutzer wahrscheinlich als nächstes anklickt, im Voraus in
 * den Cache legen — als Hintergrundarbeit (Priorität 1), damit ein Klick, der
 * WIRKLICH passiert, in der Warteschlange trotzdem vorgeht.
 *
 * Absicht: der zweite und dritte Filterklick soll gar nicht mehr laden.
 */
export function prefetchGenres(genres: readonly string[]): void {
  for (const genre of genres) {
    if (cacheGet(`genre:${genre}`) !== undefined) continue;
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
    void gql<GenreData>(query, { genre }, undefined, 1)
      .then((data) => cacheSet(`genre:${genre}`, data, TTL.discover))
      .catch(() => {
        /* Vorauslesen darf folgenlos scheitern. */
      });
  }
}

// ---- Search --------------------------------------------------------------------

/**
 * Sucheingaben vergleichbar machen: Groß/Klein, Akzente, Apostrophe und
 * Satzzeichen sind für den Nutzer kein Unterschied — „Hells Paradise" und
 * „Hell's Paradise" sind derselbe Anime. AniList sieht das anders und findet
 * die apostrophlose Schreibweise schlicht nicht.
 */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Akzente weg
    .replace(/[‘’'`´]/g, '') // Apostrophe ersatzlos (hells = hell's)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ') // alles andere zu Leerzeichen
    .trim()
    .replace(/\s+/g, ' ');
}

/** Levenshtein-Distanz, gedeckelt — reicht für „ein, zwei Tippfehler". */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1 — wie gut passt `needle` auf `hay`? Präfix/Teilstring schlägt Tippfehler. */
function similarity(needle: string, hay: string): number {
  if (!hay) return 0;
  if (hay === needle) return 1;
  if (hay.startsWith(needle)) return 0.94 - Math.min(0.1, (hay.length - needle.length) / 400);
  if (hay.includes(needle)) return 0.86 - Math.min(0.1, (hay.length - needle.length) / 400);
  // Wortweiser Treffer („paradise" in „jigokuraku hells paradise").
  const words = hay.split(' ');
  if (words.some((w) => w === needle)) return 0.8;
  const d = editDistance(needle, hay.slice(0, Math.max(needle.length + 4, 8)));
  return Math.max(0, 1 - d / Math.max(4, needle.length)) * 0.75;
}

function scoreCard(card: MediaCard, needle: string): number {
  const candidates = [card.title.romaji, card.title.english].filter(
    (x): x is string => typeof x === 'string' && x.length > 0,
  );
  let best = 0;
  for (const c of candidates) best = Math.max(best, similarity(needle, normalizeTitle(c)));
  // Bekanntheit als leichter Tiebreaker, nicht als Hauptkriterium.
  const pop = (card.averageScore ?? 50) / 100;
  return best * 100 + pop;
}

/**
 * Suche mit Tippfehler-Toleranz. Schickt in EINER Anfrage bis zu drei
 * Schreibweisen (Rohtext, normalisiert, ohne Leerzeichen) als GraphQL-Aliase
 * los — kostet also nur einen Platz im Minutenbudget — und sortiert die
 * zusammengelegten Treffer selbst nach Ähnlichkeit.
 */
export async function searchAnime(term: string, signal?: AbortSignal): Promise<MediaCard[]> {
  const raw = term.trim();
  const norm = normalizeTitle(raw);
  if (!norm) return [];

  const key = `search:${norm}`;
  const hit = cacheGet<MediaCard[]>(key);
  if (hit) return hit;

  // AniList sucht wortweise: alle Wörter außer dem letzten müssen ein
  // Titelwort GANZ treffen, das letzte darf ein Wortanfang sein. Gemessen am
  // 29.08.2026 — „One Piec" findet ONE PIECE, „Jujuts Kaise" findet nichts.
  //
  // Daraus folgt der eine Fall, über den Yunus gestolpert ist: „Hells
  // Paradise" findet NICHTS, weil AniList „Hell's Paradise" in die Wörter
  // hell / s / paradise zerlegt und „hells" auf keines davon passt. Deshalb
  // geht zusätzlich eine entpluralisierte Schreibweise mit raus — „hell
  // paradise" trifft. Alle Schreibweisen stecken in EINER Anfrage
  // (GraphQL-Aliase), kosten also zusammen nur einen Platz im Minutenbudget.
  const variants: string[] = [raw];
  if (norm !== raw.toLowerCase()) variants.push(norm);
  const depluralized = norm
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
  if (depluralized !== norm) variants.push(depluralized);

  const run = async (terms: string[]): Promise<MediaCard[]> => {
    const aliases = terms.map((_, i) => `s${i}`);
    const query = `query (${aliases.map((a) => `$${a}: String`).join(', ')}) {
      ${aliases
        .map(
          (a) => `${a}: Page(page: 1, perPage: 14) {
        media(type: ANIME, isAdult: false, search: $${a}, sort: [SEARCH_MATCH]) { ${CARD_FIELDS} }
      }`,
        )
        .join('\n')}
    }`;
    const vars = Object.fromEntries(terms.map((v, i) => [`s${i}`, v]));
    const data = await gql<Record<string, PageOf<MediaCard> | null>>(query, vars, signal);
    const byId = new Map<number, MediaCard>();
    for (const page of Object.values(data)) {
      for (const m of page?.media ?? []) if (!byId.has(m.id)) byId.set(m.id, m);
    }
    return [...byId.values()];
  };

  let found = await run(variants);

  // Letzte Rettung bei Tippfehlern mitten im Satz („hells paradis"): jedes
  // Wort einzeln suchen und die Treffer selbst gewichten. Kostet eine
  // zusätzliche Anfrage — aber nur, wenn sonst wirklich nichts käme.
  const words = norm.split(' ').filter((w) => w.length >= 4);
  if (found.length === 0 && words.length > 1) {
    found = await run(words.slice(0, 4));
  }

  const out = found
    .map((m) => ({ m, s: scoreCard(m, norm) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 18)
    .map((x) => x.m);

  // Leere Ergebnisse NICHT merken: „nichts gefunden" ist häufig ein
  // Zwischenzustand (halb getippt, Netz kurz weg) — den eine Stunde lang
  // festzuhalten würde die Suche für diesen Begriff dauerhaft kaputt machen.
  if (out.length) cacheSet(key, out, TTL.search);
  return out;
}

// ---- Detail --------------------------------------------------------------------

const DETAIL_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    ${CARD_FIELDS}
    description(asHtml: false)
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
  return cached(`detail:${id}`, TTL.detail, async () => {
    const data = await gql<{ Media: MediaDetail | null }>(DETAIL_QUERY, { id }, signal);
    if (!data.Media) throw new ApiError(404, 'Anime nicht gefunden');
    return data.Media;
  });
}

/** Batch-fetch several media by id in one request (franchise walk, library refresh). */
export async function fetchManyByIds(
  ids: number[],
  signal?: AbortSignal,
  priority: 0 | 1 = 0,
): Promise<MediaCard[]> {
  if (ids.length === 0) return [];
  const query = `query ($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(type: ANIME, id_in: $ids) { ${CARD_FIELDS} }
    }
  }`;
  const data = await gql<{ Page: PageOf<MediaCard> }>(query, { ids: ids.slice(0, 50) }, signal, priority);
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

/**
 * Beziehungs-Ausschnitte holen — mit dauerhaftem Cache. Staffel-Beziehungen
 * sind praktisch statisch, deshalb lohnt sich das Merken über den Reload
 * hinaus: der zweite Blick auf ein Franchise kostet dann gar keine Anfrage
 * mehr, und ein Anime aus einem bereits besuchten Franchise fast keine.
 */
export async function fetchRelationSlices(
  ids: number[],
  signal?: AbortSignal,
  priority: 0 | 1 = 0,
): Promise<Map<number, RelationSlice>> {
  const out = new Map<number, RelationSlice>();
  const missing: number[] = [];
  for (const id of ids) {
    const hit = cacheGet<RelationSlice>(`rel:${id}`);
    if (hit) out.set(id, hit);
    else missing.push(id);
  }
  if (!missing.length) return out;

  // AniList deckelt die Query-Komplexität; 25 Aliase pro Anfrage sind sicher.
  for (let i = 0; i < missing.length; i += 25) {
    const chunk = missing.slice(i, i + 25);
    const aliases = chunk.map((_, j) => `m${j}`);
    const query = `query (${aliases.map((a) => `$${a}: Int`).join(', ')}) {
      ${aliases.map((a) => RELATION_QUERY(a)).join('\n')}
    }`;
    const vars = Object.fromEntries(chunk.map((id, j) => [`m${j}`, id]));
    const data = await gql<
      Record<string, (MediaCard & { relations: MediaDetail['relations'] }) | null>
    >(query, vars, signal, priority);
    for (const node of Object.values(data)) {
      if (!node) continue;
      const slice: RelationSlice = { id: node.id, relations: node.relations, card: node };
      out.set(node.id, slice);
      cacheSet(`rel:${node.id}`, slice, TTL.relations);
    }
  }
  return out;
}

/**
 * Zeigt an, ob ein Format als eigene "Staffel"/eigener Eintrag auf dem
 * Zeitstrahl zählt. TV/Film/ONA ja — Specials/OVAs/Music nicht (V1s
 * Einordnungs-Bug: die durften nie als Staffel durchgehen).
 *
 * WICHTIG: das gilt nur fürs ANZEIGEN, nicht fürs WEITERLAUFEN der Kette.
 * AniList verbindet manche echten Staffelübergänge über eine kurze
 * Brücken-OVA/-Special (z. B. Haikyuu S3 → OVA „Riku VS Kuu“ → S4 „TO THE
 * TOP“; Dr. Stone Stone Wars → Special „Ryuusui“ → New World). Früher brach
 * pick() an genau so einer Brücke ab, weil sie fürs Weiterlaufen denselben
 * Formatfilter benutzte wie fürs Anzeigen — die komplette Fortsetzung danach
 * (neue Staffeln, angekündigte Filme) verschwand dadurch spurlos.
 */
export function isMainlineFormat(format: MediaFormat | null): boolean {
  return format === 'TV' || format === 'MOVIE' || format === 'ONA';
}

function pick(slice: RelationSlice, types: Array<'SEQUEL' | 'PREQUEL'>): number | null {
  // Zum WEITERLAUFEN zählt jedes ANIME-Relation-Ziel, unabhängig vom Format —
  // sonst bricht die Kette an einer Brücken-OVA/-Special ab (siehe oben).
  //
  // WICHTIG: nur PREQUEL/SEQUEL zählen als echte Staffel-Nachbarn. AniList
  // benutzt PARENT/CHILD für lose "gehört zum selben Werk/Universum"-Links,
  // nicht für die tatsächliche Staffel-Chronologie — Steins;Gate hat z. B.
  // einen PARENT-Link zu Chäos;Head (anderer Anime, nur gleiches "Science
  // Adventure"-Multiversum), der frühere Versionen fälschlich als Season 1
  // dieses Franchise auswählte. Bewusst NICHT mitgezählt.
  for (const t of types) {
    const edge = slice.relations.edges.find((e) => {
      if (e.relationType !== t) return false;
      if (e.node.type !== 'ANIME') return false;
      // Chronology guard: a prequel can't start after the current node and a
      // sequel can't start before it — rejects spurious edges like ONE
      // PIECE's (id 21) PREQUEL link to a 2024 crossover ONA (AniList #167404)
      // that itself points a SEQUEL edge back to ONE PIECE.
      const currentYear = slice.card.seasonYear;
      const candidateYear = e.node.seasonYear;
      if (currentYear != null && candidateYear != null) {
        if (t === 'PREQUEL' && candidateYear > currentYear) return false;
        if (t === 'SEQUEL' && candidateYear < currentYear) return false;
      }
      return true;
    });
    if (edge) return edge.node.id;
  }
  return null;
}

/**
 * Der nächste SEQUEL-Knoten einer Staffel (ein Schritt, jedes Format —
 * Formatfilterung ist Sache des Aufrufers, siehe `isMainlineFormat`). Kann
 * einen Brücken-Knoten zurückgeben; der Aufrufer erkennt das am Format und
 * läuft bei Bedarf selbst einen Schritt weiter (er hat den Async-Zugriff
 * fürs Nachladen, diese Funktion bleibt bewusst synchron).
 */
export function pickSequel(slice: RelationSlice): MediaCard | null {
  const edge = slice.relations.edges.find(
    (e) => e.relationType === 'SEQUEL' && e.node.type === 'ANIME',
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
  const cachedFranchise = cacheGet<Franchise>(`fx:${startId}`);
  if (cachedFranchise) return cachedFranchise;

  const slices = new Map<number, RelationSlice>();

  async function ensure(ids: number[]): Promise<void> {
    const missing = ids.filter((id) => !slices.has(id));
    if (!missing.length) return;
    const got = await fetchRelationSlices(missing, signal);
    got.forEach((v, k) => slices.set(k, v));
  }

  // ---- Kette in EINEM Rutsch aufspannen, statt Schritt für Schritt ----------
  //
  // Vorher lief der Zeitstrahl die Staffelkette Knoten für Knoten ab: erst
  // rückwärts bis zur ersten Staffel, dann vorwärts bis zur letzten — jeder
  // Schritt eine eigene Netzanfrage. Ein Franchise wie Naruto oder Fate
  // verbrauchte damit im schlimmsten Fall 40 der 30 erlaubten Anfragen pro
  // Minute. Das war der Grund, warum die App „ab dem dritten Anime" hing:
  // AniList sperrte danach, und Suche wie Zeitstrahl warteten minutenlang.
  //
  // Jetzt wird die Nachbarschaft breitenweise aufgeklappt: alle noch
  // unbekannten PREQUEL/SEQUEL-Nachbarn ALLER bekannten Knoten wandern in
  // eine einzige gebündelte Anfrage. Beide Richtungen wachsen dadurch
  // gleichzeitig, und ein typisches Franchise ist nach 2-3 Anfragen komplett.
  await ensure([startId]);
  for (let round = 0; round < 8; round++) {
    const frontier = new Set<number>();
    for (const slice of slices.values()) {
      for (const e of slice.relations.edges) {
        if (e.node.type !== 'ANIME') continue;
        if (e.relationType !== 'SEQUEL' && e.relationType !== 'PREQUEL') continue;
        if (!slices.has(e.node.id)) frontier.add(e.node.id);
      }
    }
    if (!frontier.size) break;
    if (slices.size + frontier.size > MAX_CHAIN * 3) {
      // Sicherheitsnetz gegen ausufernde Multiversen (Gundam & Co.).
      await ensure([...frontier].slice(0, MAX_CHAIN * 3 - slices.size));
      break;
    }
    await ensure([...frontier]);
  }
  let rootId = startId;
  const seenBack = new Set([startId]);
  for (let i = 0; i < MAX_CHAIN; i++) {
    const slice = slices.get(rootId);
    if (!slice) break;
    const prev = pick(slice, ['PREQUEL']);
    if (!prev || seenBack.has(prev)) break;
    seenBack.add(prev);
    await ensure([prev]);
    rootId = prev;
  }

  // Walk forward along sequels. Brücken-Knoten (Specials/OVAs, die zwei echte
  // Staffeln verbinden) laufen mit durch, damit die Kette nicht an ihnen
  // abreißt — sie zählen aber nicht als eigene Staffel, siehe `isMainlineFormat`.
  const mainline: MediaCard[] = [];
  const bridgeNodes: MediaCard[] = [];
  const seen = new Set<number>();
  let cur: number | null = rootId;
  for (let i = 0; i < MAX_CHAIN && cur !== null; i++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    await ensure([cur]);
    const slice = slices.get(cur);
    if (!slice) break;
    if (isMainlineFormat(slice.card.format)) {
      mainline.push(slice.card);
    } else {
      bridgeNodes.push(slice.card);
    }
    cur = pick(slice, ['SEQUEL']);
  }

  // Extras: anything attached to a mainline node that isn't mainline itself,
  // plus the bridge nodes found above (visible, just not counted as seasons).
  const extras: Franchise['extras'] = bridgeNodes.map((media) => ({ relation: 'Special', media }));
  const extraSeen = new Set<number>(bridgeNodes.map((m) => m.id));
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

  const result: Franchise = { mainline, extras };
  cacheSet(`fx:${startId}`, result, TTL.franchise);
  // Jede Staffel derselben Kette liefert denselben Zeitstrahl — direkt für
  // alle mit hinterlegen, damit das Durchklicken durch ein Franchise gar
  // keine Anfrage mehr auslöst.
  for (const m of mainline) if (m.id !== startId) cacheSet(`fx:${m.id}`, result, TTL.franchise);

  return result;
}

// ---- Airing schedule for library entries -----------------------------------------

export async function fetchAiringForIds(
  ids: number[],
  signal?: AbortSignal,
): Promise<Map<number, { episode: number; airingAt: number }>> {
  // Hintergrundarbeit: der Startscan darf niemals vor einer Suche stehen.
  const cards = await fetchManyByIds(ids, signal, 1);
  const map = new Map<number, { episode: number; airingAt: number }>();
  for (const c of cards) {
    if (c.nextAiringEpisode) map.set(c.id, c.nextAiringEpisode);
  }
  return map;
}
