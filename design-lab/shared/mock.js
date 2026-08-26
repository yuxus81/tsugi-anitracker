/**
 * EIN Datensatz für alle vier Entwürfe.
 *
 * Struktur bewusst 1:1 aus dem echten Modell in `src/store/library.ts` abgeleitet:
 * EIN Eintrag pro Franchise (nicht pro Staffel), mit Zeiger `seasonIndex` +
 * `progress` bis wohin geschaut wurde. Dadurch stimmen alle abgeleiteten Werte
 * (Fortschritt, Sehzeit, Statuslogik) mit der App überein und die Entwürfe zeigen
 * keine Fantasiezahlen.
 *
 * Wenn vier Versionen verglichen werden, muss der Inhalt identisch sein — sonst
 * vergleicht man Titel statt Design. Deshalb liegt hier alles einmal.
 */
import { MEDIA, M } from './media.js';

export { MEDIA, M };

/* ---------------------------------------------------------------- Status ---- */

export const STATUS_ORDER = ['watching', 'nextup', 'planned', 'continuation', 'completed'];

export const STATUS_LABEL = {
  watching: 'Weiter schauen',
  nextup: 'Noch zu schauen',
  planned: 'Watchlist',
  continuation: 'Fortsetzung folgt',
  completed: 'Geschaut',
};

/** Kurzform für enge Stellen (Tabs, Chips). */
export const STATUS_SHORT = {
  watching: 'Weiter',
  nextup: 'Bereit',
  planned: 'Watchlist',
  continuation: 'Folgt',
  completed: 'Geschaut',
};

/** Die Bibliothek zeigt bewusst nicht alle Status — watching/nextup gehören Home. */
export const LIBRARY_TABS = ['completed', 'continuation', 'planned'];

/* ------------------------------------------------------------ Bibliothek ---- */

/** [rootId, status, seasonIds[], seasonIndex, progress, rating, notes] */
const RAW = [
  [113415, 'watching', [113415, 145064], 1, 9, 9, 'Shibuya-Arc — nicht spoilern lassen.'],
  [140960, 'watching', [140960, 158927], 1, 7, 8, ''],
  [150672, 'watching', [150672, 166531], 1, 4, 8, ''],
  [11061, 'watching', [11061], 0, 61, 10, 'Chimera-Ant beginnt bei 76.'],
  [21355, 'watching', [21355, 189046], 1, 12, 8, ''],
  [178789, 'watching', [178789], 0, 6, 7, ''],
  [182205, 'watching', [182205], 0, 14, 7, ''],

  [101922, 'nextup', [101922, 142329, 145139], 1, 0, 8, ''],
  [151807, 'nextup', [151807, 176496], 1, 0, 7, ''],
  [127230, 'nextup', [127230, 171627], 1, 0, 9, 'Film läuft — Kino oder warten?'],
  [185874, 'nextup', [185874], 0, 0, null, ''],

  // Laufende Season: stehen bewusst in „Weiter schauen“, weil sie WIRKLICH laufen.
  [196187, 'watching', [196187], 0, 5, 7, ''],
  [135865, 'watching', [135865], 0, 6, 7, ''],

  [154587, 'continuation', [154587, 182255, 209939], 2, 0, 10, 'Beste Serie der letzten Jahre.'],
  [161645, 'continuation', [161645, 195516], 1, 0, 9, ''],
  [171018, 'continuation', [171018, 198966], 1, 0, 8, ''],
  [130003, 'continuation', [130003, 186712], 1, 0, 9, ''],
  [120377, 'continuation', [120377, 195539], 1, 0, 9, ''],
  [97986, 'continuation', [97986, 160275], 1, 0, 8, ''],
  [178031, 'continuation', [178031], 0, 0, null, ''],

  [16498, 'completed', [16498, 20958, 99147, 110277], 3, 16, 10, ''],
  [21087, 'completed', [21087, 97668], 1, 12, 8, ''],
  [101348, 'completed', [101348, 136430], 1, 24, 10, ''],
  [21507, 'completed', [21507, 101338], 1, 13, 9, ''],
  [9253, 'completed', [9253], 0, 24, 10, ''],
  [5114, 'completed', [5114], 0, 64, 10, ''],
  [21519, 'completed', [21519], 0, 1, 9, ''],
  [20954, 'completed', [20954], 0, 1, 9, ''],
  [21827, 'completed', [21827], 0, 13, 8, ''],
  [101921, 'completed', [101921], 0, 12, 8, ''],

  [137822, 'planned', [137822], 0, 0, null, ''],
  [163270, 'planned', [163270], 0, 0, null, ''],
  [177709, 'planned', [177709], 0, 0, null, ''],
  [178025, 'planned', [178025], 0, 0, null, ''],
  [213702, 'planned', [213702], 0, 0, null, ''],
  [199111, 'planned', [199111], 0, 0, null, ''],
  [195600, 'planned', [195600], 0, 0, null, ''],
];

const DAY = 86400000;
const NOW = Date.now();

export const LIBRARY = RAW.map(([rootId, status, seasonIds, seasonIndex, progress, rating, notes], i) => ({
  rootId,
  status,
  seasons: seasonIds.map((id) => M(id)).filter(Boolean),
  seasonIndex,
  progress,
  rating,
  notes,
  genres: M(seasonIds[0])?.genres ?? [],
  addedAt: NOW - (i + 3) * 9 * DAY,
  updatedAt: NOW - i * 1.7 * DAY,
  // wird unten nachgetragen, sobald releaseLabel() definiert ist
  releaseNote: null,
}));

export const BY_ID = Object.fromEntries(LIBRARY.map((e) => [e.rootId, e]));

/* ------------------------------------------------------------- Abgeleitet --- */

export const isReleased = (s) => s && (s.airStatus === 'FINISHED' || s.airStatus === 'RELEASING');

export const currentSeason = (e) => e.seasons[e.seasonIndex];
export const entryTitle = (e) => e.seasons[0]?.title ?? '—';
export const entryCover = (e) => currentSeason(e)?.cover ?? e.seasons[0]?.cover ?? null;
export const entryColor = (e) => currentSeason(e)?.color ?? '#4a4a55';
export const entryBanner = (e) => currentSeason(e)?.banner ?? e.seasons.find((s) => s.banner)?.banner ?? null;

/** Insgesamt gesehene Episoden über alle Staffeln des Franchise. */
export function watchedEpisodes(e) {
  let sum = e.progress;
  for (let i = 0; i < e.seasonIndex; i++) sum += e.seasons[i]?.episodes ?? 0;
  return sum;
}

/** Bekannte Gesamtfolgen der veröffentlichten Hauptlinie. */
export function totalEpisodes(e) {
  return e.seasons.filter(isReleased).reduce((s, x) => s + (x.episodes ?? 0), 0);
}

export function meanDuration(e) {
  const known = e.seasons.map((s) => s.duration).filter((d) => d != null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : 24;
}

/** Fortschritt in der AKTUELLEN Staffel, 0..1 — das ist der Wert, den Ringe zeigen. */
export function seasonPct(e) {
  const s = currentSeason(e);
  if (!s?.episodes) return 0;
  return Math.max(0, Math.min(1, e.progress / s.episodes));
}

export function seasonNo(e) {
  return e.seasonIndex + 1;
}

export const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const SEASON_MONTH = { WINTER: 1, SPRING: 4, SUMMER: 7, FALL: 10 };
export const SEASON_LABEL = { WINTER: 'Winter', SPRING: 'Frühling', SUMMER: 'Sommer', FALL: 'Herbst' };

/** Wie in der App: exaktes Startdatum bevorzugt, sonst Season → üblicher Startmonat. */
export function releaseLabel(s) {
  if (!s) return null;
  if (s.startDate?.year && s.startDate.month) return `${MONTHS[s.startDate.month - 1]} ${s.startDate.year}`;
  if (s.season && s.seasonYear) return `${MONTHS[SEASON_MONTH[s.season] - 1]} ${s.seasonYear}`;
  if (s.seasonYear) return String(s.seasonYear);
  if (s.startDate?.year) return String(s.startDate.year);
  return null;
}

export function seasonTag(s) {
  if (!s) return null;
  if (s.season && s.seasonYear) return `${SEASON_LABEL[s.season]} ${s.seasonYear}`;
  return s.seasonYear ? String(s.seasonYear) : null;
}

/* Nachtrag: „Fortsetzung folgt“ braucht ein Datumslabel, und das geht erst,
   wenn releaseLabel() oben tatsächlich existiert (kein Zugriff in der TDZ). */
for (const e of LIBRARY) {
  if (e.status === 'continuation') e.releaseNote = releaseLabel(currentSeason(e));
}

export const FORMAT_LABEL = {
  TV: 'TV', TV_SHORT: 'TV-Kurz', MOVIE: 'Film',
  SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Musik',
};

/** Verbleibende Zeit bis zur nächsten Folge, in Teilen — Versionen setzen sie unterschiedlich. */
export function countdown(airingAt) {
  const secs = Math.max(0, airingAt - Math.floor(Date.now() / 1000));
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return { d, h, m, s, secs };
}

export function countdownShort(airingAt) {
  const { d, h, m } = countdown(airingAt);
  if (d > 0) return `${d} T ${h} Std`;
  if (h > 0) return `${h} Std ${m} Min`;
  return `${m} Min`;
}

export function weekdayTime(airingAt) {
  const dt = new Date(airingAt * 1000);
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][dt.getDay()];
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${wd} ${hh}:${mm}`;
}

export const byStatus = (s) => LIBRARY.filter((e) => e.status === s);

/* -------------------------------------------------------------- Simulcast --- */

/** Laufende Titel aus der eigenen Bibliothek, nach nächster Ausstrahlung sortiert. */
export const SIMULCAST = LIBRARY
  .map((e) => ({ entry: e, season: currentSeason(e) }))
  .filter((x) => x.season?.nextAiring)
  .sort((a, b) => a.season.nextAiring.airingAt - b.season.nextAiring.airingAt);

/* --------------------------------------------------------------- Entdecken -- */

export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
];

export const GENRE_LABEL = {
  Action: 'Action', Adventure: 'Abenteuer', Comedy: 'Comedy', Drama: 'Drama',
  Fantasy: 'Fantasy', Mystery: 'Mystery', Psychological: 'Psychologisch',
  Romance: 'Romance', 'Sci-Fi': 'Sci-Fi', 'Slice of Life': 'Alltag',
  Sports: 'Sport', Supernatural: 'Übernatürlich', Horror: 'Horror', Music: 'Musik',
  Thriller: 'Thriller', Mecha: 'Mecha', Ecchi: 'Ecchi',
};

const ALL = Object.values(MEDIA);
const pick = (ids) => ids.map((id) => M(id)).filter(Boolean);

export const DISCOVER = {
  spotlight: M(154587),
  rows: [
    { key: 'trending', title: 'Gerade im Trend', items: pick([21, 178789, 199111, 182205, 195600, 185874, 202269, 169583, 210031, 188139]) },
    { key: 'season', title: 'Diese Season', items: pick([178789, 196187, 135865, 187538, 180136, 207141, 103303, 199111, 169582, 195600]) },
    { key: 'upcoming', title: 'Bald verfügbar', items: pick([195516, 195604, 195539, 198966, 209939, 186712, 178031, 160275, 213702, 159042]) },
    { key: 'top', title: 'Bestbewertet', items: pick([5114, 9253, 154587, 182255, 11061, 16498, 110277, 101348, 136430, 21519]) },
    { key: 'movies', title: 'Filme', items: pick([21519, 20954, 171627, 160275, 133007, 143103, 171952]) },
  ].map((r) => ({ ...r, items: r.items.length ? r.items : ALL.slice(0, 10) })),
};

/** Genre-Bühne: pro Genre drei Reihen, wie in der echten Entdecken-Seite. */
export function genreRows(genre) {
  const hits = ALL.filter((m) => m.genres.includes(genre));
  const by = (f) => [...hits].sort(f).slice(0, 10);
  return [
    { key: 'popular', title: `Beliebt in ${GENRE_LABEL[genre] ?? genre}`, items: by((a, b) => (b.score ?? 0) - (a.score ?? 0)) },
    { key: 'best', title: 'Bestbewertet', items: by((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(2) },
    { key: 'fresh', title: 'Frisch dabei', items: by((a, b) => (b.seasonYear ?? 0) - (a.seasonYear ?? 0)) },
  ].filter((r) => r.items.length);
}

/* ----------------------------------------------------------------- Detail --- */

/**
 * Der Detail-Bildschirm zeigt einen laufenden Eintrag — dort sind alle
 * Bedienelemente gleichzeitig sichtbar (Stepper, Wertung, Statuswechsel,
 * Franchise-Akkordeon). Deshalb Jujutsu Kaisen: zwei Staffeln, mittendrin.
 */
export const DETAIL_ENTRY = BY_ID[113415];

export const DETAIL_EXTRAS = {
  franchise: [
    {
      group: 'Hauptlinie',
      items: pick([113415, 145064]),
    },
    {
      group: 'Filme',
      items: pick([171627]),
    },
    {
      group: 'Verwandt',
      items: pick([127230, 171018, 151807]),
    },
  ],
  recommendations: pick([127230, 171018, 137822, 151807, 178025, 177709, 21087, 163270]),
  facts: [
    ['Studio', 'MAPPA'],
    ['Erstausstrahlung', 'Oktober 2020'],
    ['Folgen gesamt', '47'],
    ['Laufzeit', '24 Min'],
    ['Quelle', 'Manga'],
  ],
};

/* -------------------------------------------------------------- Statistik --- */

function buildStats() {
  let minutes = 0;
  let episodes = 0;
  const perStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
  const perGenre = {};
  const perYear = {};
  const ratings = Array(10).fill(0);
  let ratingSum = 0;
  let ratingCount = 0;

  for (const e of LIBRARY) {
    const ep = watchedEpisodes(e);
    episodes += ep;
    minutes += ep * meanDuration(e);
    perStatus[e.status]++;
    for (const g of e.genres) perGenre[g] = (perGenre[g] ?? 0) + 1;
    const y = e.seasons[0]?.seasonYear;
    if (y) perYear[y] = (perYear[y] ?? 0) + 1;
    if (e.rating) { ratings[e.rating - 1]++; ratingSum += e.rating; ratingCount++; }
  }

  const genres = Object.entries(perGenre)
    .map(([label, value]) => ({ label: GENRE_LABEL[label] ?? label, raw: label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const years = Object.entries(perYear)
    .map(([y, v]) => ({ year: Number(y), value: v }))
    .sort((a, b) => a.year - b.year);

  const total = LIBRARY.length;
  const done = perStatus.completed;

  return {
    total,
    episodes,
    minutes: Math.round(minutes),
    hours: Math.round(minutes / 60),
    days: minutes / 1440,
    avgRating: ratingCount ? ratingSum / ratingCount : 0,
    ratedCount: ratingCount,
    completionPct: total ? done / total : 0,
    perStatus: STATUS_ORDER.map((s) => ({ status: s, count: perStatus[s] })),
    genres,
    years,
    ratings: ratings.map((count, i) => ({ score: i + 1, count })),
    longest: [...LIBRARY].sort((a, b) => watchedEpisodes(b) - watchedEpisodes(a)).slice(0, 5),
  };
}

export const STATS = buildStats();

/* ------------------------------------------------------------------ Konto --- */

export const PROFILE = {
  name: 'Yunus',
  email: 'privatyunus@gmail.com',
  since: 'Mitglied seit Juli 2026',
  devices: 3,
  lastSync: 'vor 2 Minuten',
};

/* --------------------------------------------------------- Suche / Palette -- */

export const SEARCH_RECENT = pick([154587, 171018, 161645, 127230]);
export const SEARCH_RESULTS = pick([113415, 145064, 171627, 127230, 151807, 176496, 178025, 177709]);

export const SEARCH_ACTIONS = [
  { key: 'add', label: 'Titel hinzufügen', hint: 'Suchen und in die Bibliothek legen' },
  { key: 'random', label: 'Zufall würfeln', hint: 'Etwas aus der Watchlist ziehen' },
  { key: 'stats', label: 'Statistik öffnen', hint: 'Sehzeit, Genres, Wertungen' },
  { key: 'lang', label: 'Sprache umschalten', hint: 'Deutsch / English' },
];

/* ------------------------------------------------------- Zufallsroller ------ */

export const ROLL_POOL = [...byStatus('planned'), ...byStatus('nextup')];

/* ===================================================== Franchise-Zeitstrahl == */

/**
 * Bekannte Franchise-Linien. Bewusst als Liste von Id-Ketten, nicht als
 * Relations-Graph: die Entwürfe sollen den Zeitstrahl ZEIGEN, nicht AniList
 * nachbauen. Reihenfolge ist chronologisch; Kinofilme sind eingemischt, weil
 * sie oft die eigentliche Fortsetzung sind (Chainsaw Man, Demon Slayer …) —
 * genau so macht es `buildFranchiseSeasons()` in der echten App.
 */
const LINES = [
  [16498, 20958, 99147, 104578, 110277],
  [113415, 131573, 145064],
  [101922, 112151, 142329, 145139],
  [154587, 182255, 209939],
  [140960, 158927],
  [21087, 97668],
  [101348, 136430],
  [21507, 101338],
  [150672, 166531],
  [151807, 176496],
  [161645, 195516],
  [171018, 198966],
  [130003, 186712],
  [127230, 171627],
  [120377, 195539],
  [97986, 160275],
  [21355, 189046],
  [269, 185874],
  [15417, 20996, 114129],
  [21, 182469],
];

const LINE_OF = new Map();
for (const line of LINES) for (const id of line) LINE_OF.set(id, line);

/** Alle Staffeln/Filme eines Franchise, chronologisch — für den Zeitstrahl. */
export function franchiseOf(mediaId) {
  const ids = LINE_OF.get(mediaId) ?? [mediaId];
  return ids.map((id) => M(id)).filter(Boolean);
}

/** Kurzlabel im Zeitstrahl: TV zählt als Staffel, alles andere zeigt sein Format. */
export function timelineLabels(seasons) {
  let tv = 0;
  return seasons.map((s) => {
    const isTv = s.format !== 'MOVIE' && s.format !== 'SPECIAL' && s.format !== 'OVA' && s.format !== 'MUSIC';
    if (isTv) tv += 1;
    return isTv ? `Staffel ${tv}` : (FORMAT_LABEL[s.format] ?? 'Teil');
  });
}

/** Gesamtzahlen über das ganze Franchise — die „Infobox daneben". */
export function franchiseFacts(seasons) {
  const released = seasons.filter(isReleased);
  const eps = released.reduce((a, s) => a + (s.episodes ?? 0), 0);
  const mins = released.reduce((a, s) => a + (s.episodes ?? 0) * (s.duration ?? 24), 0);
  const years = seasons.map((s) => s.seasonYear).filter(Boolean).sort((a, b) => a - b);
  const scores = seasons.map((s) => s.score).filter((x) => x != null);
  const studios = [...new Set(seasons.map((s) => s.studio).filter(Boolean))];
  const genres = [...new Set(seasons.flatMap((s) => s.genres))].slice(0, 6);
  return {
    parts: seasons.length,
    released: released.length,
    upcoming: seasons.length - released.length,
    episodes: eps,
    hours: Math.round(mins / 60),
    span: years.length ? (years[0] === years.at(-1) ? String(years[0]) : `${years[0]} – ${years.at(-1)}`) : '—',
    score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    studios,
    genres,
  };
}

/* ============================================================= Suche ========= */

const HAY = Object.values(MEDIA).map((m) => ({
  m,
  hay: `${m.title} ${m.romaji ?? ''} ${m.genres.join(' ')} ${m.studio ?? ''}`.toLowerCase(),
}));

/**
 * Suche über den lokalen Bestand (101 echte Titel). Kein Netzwerk — die
 * Entwürfe sollen offline funktionieren. Treffer werden nach Startposition
 * und Beliebtheit sortiert, damit „one" nicht mit „One Room" beginnt.
 */
export function searchMedia(query, limit = 24) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  for (const { m, hay } of HAY) {
    const pos = hay.indexOf(q);
    if (pos < 0) continue;
    const titlePos = m.title.toLowerCase().indexOf(q);
    hits.push({ m, rank: (titlePos === 0 ? 0 : titlePos > 0 ? 1 : 2) * 1000 - (m.score ?? 0) });
  }
  hits.sort((a, b) => a.rank - b.rank);
  return hits.slice(0, limit).map((x) => x.m);
}

/** Ist dieses Medium (oder sein Franchise) schon in der Bibliothek? */
export function entryForMedia(mediaId) {
  return LIBRARY.find((e) => e.seasons.some((s) => s.id === mediaId));
}

/* ================================================= Bibliothek verändern ===== */

const listeners = new Set();
export const onLibraryChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => { for (const fn of listeners) fn(); };

function reindex() {
  for (const k of Object.keys(BY_ID)) delete BY_ID[k];
  for (const e of LIBRARY) BY_ID[e.rootId] = e;
}

/**
 * Franchise wirklich hinzufügen — damit sich der Hinzufügen-Flow testen lässt
 * und der neue Eintrag danach überall auftaucht (Start, Bibliothek, Statistik).
 *
 * `watchedThrough` = Anzahl vollständig geschauter Teile (wie in der App),
 * `currentEpisode` = Folge in der laufenden Staffel.
 */
export function addFranchise({ seasons, status = 'watching', watchedThrough = 0, currentEpisode = 0 }) {
  if (!seasons?.length) return null;
  const rootId = seasons[0].id;
  const existing = LIBRARY.findIndex((e) => e.rootId === rootId);
  const idx = Math.min(watchedThrough, seasons.length - 1);
  const entry = {
    rootId,
    status,
    seasons,
    seasonIndex: idx,
    progress: currentEpisode,
    rating: null,
    notes: '',
    genres: seasons[0].genres ?? [],
    addedAt: Date.now(),
    updatedAt: Date.now(),
    releaseNote: null,
  };
  // Statuslogik wie in der App: Zeiger auf unveröffentlichtem Teil = „folgt“,
  // alles Bekannte durch = „geschaut“.
  const cur = seasons[idx];
  if (!isReleased(cur)) {
    entry.status = 'continuation';
    entry.progress = 0;
    entry.releaseNote = releaseLabel(cur);
  } else if (idx === seasons.length - 1 && cur.episodes && entry.progress >= cur.episodes) {
    entry.status = 'completed';
  } else if (status === 'watching' && entry.progress === 0 && idx > 0) {
    entry.status = 'nextup';
  }

  if (existing > -1) LIBRARY.splice(existing, 1, entry);
  else LIBRARY.unshift(entry);
  reindex();
  emit();
  return entry;
}

export function removeEntry(rootId) {
  const i = LIBRARY.findIndex((e) => e.rootId === rootId);
  if (i < 0) return false;
  LIBRARY.splice(i, 1);
  reindex();
  emit();
  return true;
}

export function setStatus(rootId, status) {
  const e = BY_ID[rootId];
  if (!e) return;
  e.status = status;
  e.updatedAt = Date.now();
  emit();
}

export function bumpProgress(rootId, delta) {
  const e = BY_ID[rootId];
  if (!e) return;
  const s = currentSeason(e);
  const max = s?.episodes ?? 9999;
  e.progress = Math.max(0, Math.min(max, e.progress + delta));
  e.updatedAt = Date.now();
  emit();
}

/** Statistik neu rechnen — nach jedem Eingriff, sonst zeigt sie Altbestand. */
export function stats() {
  return buildStats();
}
