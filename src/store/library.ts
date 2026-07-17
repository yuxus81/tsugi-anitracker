import { create } from 'zustand';
import { dbGetAll, dbPut, dbDelete, dbClear } from '@/lib/db';
import type { FuzzyDate, MediaCard, MediaFormat, MediaSeason, MediaStatus } from '@/api/types';
import { bestTitle, cover } from '@/api/types';
import { translate, useSettings, type DictKey } from '@/i18n';
import { useToasts } from '@/store/toast';

/**
 * Franchise-basierte Bibliothek (Modell aus V1 übernommen): EIN Eintrag pro
 * Franchise, nicht pro Staffel. Der Eintrag kennt seine Hauptlinien-Staffeln
 * und einen Zeiger (seasonIndex + progress), bis wohin geschaut wurde.
 */

export type WatchStatus =
  | 'watching' // Weiter schauen
  | 'planned' // Watchlist
  | 'nextup' // Noch zu schauen (neue Staffel verfügbar / bereit)
  | 'continuation' // Fortsetzung folgt (angekündigt / erwartet)
  | 'completed' // Abgeschlossen
  | 'paused'; // Pausiert

export const STATUS_KEY: Record<WatchStatus, DictKey> = {
  watching: 'stWatching',
  planned: 'stPlanned',
  nextup: 'stNextup',
  continuation: 'stContinuation',
  completed: 'stCompleted',
  paused: 'stPaused',
};

export const STATUS_ORDER: WatchStatus[] = [
  'watching',
  'nextup',
  'planned',
  'continuation',
  'paused',
  'completed',
];

/** Bibliothek zeigt genau diese vier Kategorien, in dieser Reihenfolge. */
export const LIBRARY_TABS: WatchStatus[] = ['completed', 'paused', 'continuation', 'nextup'];

/**
 * Beim Hinzufügen wählbare Status. „Noch zu schauen“ ist bewusst NICHT dabei
 * — der Status ist rein abgeleitet (siehe `deriveStatus`): eine bereits
 * veröffentlichte, aber noch nicht begonnene Folgestaffel landet automatisch
 * dort, nie durch manuelle Auswahl.
 */
export const ADD_STATUSES: WatchStatus[] = ['watching', 'planned', 'paused', 'completed'];

function statusLabelNow(s: WatchStatus): string {
  return translate(useSettings.getState().lang, STATUS_KEY[s]);
}

/** Denormalisierter Staffel-Schnappschuss — die Bibliothek rendert offline. */
export interface SeasonSnap {
  id: number;
  title: string;
  coverUrl: string | null;
  format: MediaFormat | null;
  episodes: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  startDate: FuzzyDate | null;
  airStatus: MediaStatus | null;
  averageScore: number | null;
  duration: number | null;
}

export function seasonSnapFrom(card: MediaCard): SeasonSnap {
  return {
    id: card.id,
    title: bestTitle(card),
    coverUrl: cover(card),
    format: card.format,
    episodes: card.episodes,
    season: card.season,
    seasonYear: card.seasonYear,
    startDate: card.startDate,
    airStatus: card.status,
    averageScore: card.averageScore,
    duration: card.duration,
  };
}

/**
 * Release-Label für eine (noch) nicht geschaute Staffel/Film: bevorzugt das
 * exakte AniList-Startdatum (Monat + Jahr); ist nur die Season bekannt
 * (Sommer/Herbst/…), wird sie auf ihren üblichen Startmonat abgebildet — genau
 * so, wie Anime-Seasons ohnehin benannt werden ("Herbst 2026" ≈ Oktober 2026).
 * Ist wirklich gar nichts bekannt, gibt es `null` (→ „Datum unbekannt“).
 */
const SEASON_START_MONTH: Record<MediaSeason, number> = {
  WINTER: 1,
  SPRING: 4,
  SUMMER: 7,
  FALL: 10,
};

export function releaseLabel(
  s: Pick<SeasonSnap, 'startDate' | 'season' | 'seasonYear'>,
  locale: string,
): string | null {
  const monthYear = (year: number, month: number): string =>
    new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  if (s.startDate?.year && s.startDate.month) return monthYear(s.startDate.year, s.startDate.month);
  if (s.season && s.seasonYear) return monthYear(s.seasonYear, SEASON_START_MONTH[s.season]);
  if (s.seasonYear) return String(s.seasonYear);
  if (s.startDate?.year) return String(s.startDate.year);
  return null;
}

export function isReleased(s: SeasonSnap): boolean {
  return s.airStatus === 'FINISHED' || s.airStatus === 'RELEASING';
}

export interface LibraryEntry {
  rootId: number; // IndexedDB-Key: erste Staffel der Hauptlinie
  status: WatchStatus;
  seasons: SeasonSnap[]; // Hauptlinie in chronologischer Reihenfolge
  seasonIndex: number; // aktuelle / nächste Staffel (0-basiert)
  progress: number; // gesehene Episoden in der aktuellen Staffel
  rating: number | null; // persönlich, 1..10 (fürs ganze Franchise)
  notes: string;
  genres: string[];
  addedAt: number;
  updatedAt: number;
  lastScanAt: number;
  releaseNote: string | null; // z. B. "2027" bei angekündigter Fortsetzung
}

// ---- Abgeleitete Helfer ---------------------------------------------------------

export function entryTitle(e: LibraryEntry): string {
  return e.seasons[0]?.title ?? '—';
}

export function currentSeason(e: LibraryEntry): SeasonSnap | undefined {
  return e.seasons[e.seasonIndex];
}

/**
 * Die zuletzt tatsächlich fertig geschaute Staffel. Bei „Fortsetzung folgt“
 * zeigt der Zeiger (seasonIndex) schon auf die kommende, unveröffentlichte
 * Staffel — hier interessiert aber, was wirklich geschaut wurde. Gibt
 * `undefined` zurück, wenn noch gar nichts abgeschlossen wurde.
 */
export function lastWatchedSeason(e: LibraryEntry): SeasonSnap | undefined {
  if (e.status === 'continuation') {
    return e.seasonIndex > 0 ? e.seasons[e.seasonIndex - 1] : undefined;
  }
  return currentSeason(e);
}

export function entryCover(e: LibraryEntry): string | null {
  return currentSeason(e)?.coverUrl ?? e.seasons[0]?.coverUrl ?? null;
}

/** Insgesamt gesehene Episoden über alle Staffeln. */
export function watchedEpisodes(e: LibraryEntry): number {
  let sum = e.progress;
  for (let i = 0; i < e.seasonIndex; i++) sum += e.seasons[i]?.episodes ?? 0;
  return sum;
}

/** Bekannte Gesamtfolgen der veröffentlichten Hauptlinie. */
export function totalEpisodes(e: LibraryEntry): number {
  return e.seasons.filter(isReleased).reduce((s, x) => s + (x.episodes ?? 0), 0);
}

export function meanDuration(e: LibraryEntry): number {
  const known = e.seasons.map((s) => s.duration).filter((d): d is number => d != null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : 24;
}

/** Findet den Eintrag, zu dem eine AniList-Media-Id gehört (beliebige Staffel). */
export function findEntryFor(
  entries: Record<number, LibraryEntry>,
  mediaId: number,
): LibraryEntry | undefined {
  return Object.values(entries).find((e) => e.seasons.some((s) => s.id === mediaId));
}

/**
 * Leitet den effektiven Status ab: Zeiger hinter der letzten Staffel oder auf
 * einer unveröffentlichten → completed/continuation, egal was gewählt wurde.
 */
function deriveStatus(
  chosen: WatchStatus,
  seasons: SeasonSnap[],
  seasonIndex: number,
  progress: number,
): { status: WatchStatus; seasonIndex: number; progress: number; releaseNote: string | null } {
  const last = seasons.length - 1;
  const idx = Math.max(0, Math.min(seasonIndex, last));
  const cur = seasons[idx];

  // Alles Bekannte geschaut?
  const allWatched =
    idx === last && cur && isReleased(cur) && cur.episodes !== null && progress >= cur.episodes;

  if (allWatched) {
    return { status: 'completed', seasonIndex: idx, progress: cur.episodes ?? progress, releaseNote: null };
  }

  // Zeiger steht auf einer angekündigten, noch nicht erschienenen Staffel.
  if (cur && !isReleased(cur)) {
    return {
      status: 'continuation',
      seasonIndex: idx,
      progress: 0,
      releaseNote: cur.seasonYear ? String(cur.seasonYear) : null,
    };
  }

  // Vorherige Staffel(n) fertig geschaut, aber die aktuelle (veröffentlichte)
  // Staffel noch bei 0 Episoden — z. B. beim Hinzufügen „bis Staffel 1
  // geschaut“, obwohl Staffel 2 schon da ist. „Schaue ich“ würde das fälschlich
  // sofort in „Weiter schauen“ stecken; korrekt ist „Noch zu schauen“, von wo
  // aus man es bewusst per Klick in „Weiter schauen“ holt. Ein bewusst
  // gewählter anderer Status (Pausiert/Watchlist/Abgeschlossen) bleibt unangetastet.
  if (chosen === 'watching' && idx > 0 && progress === 0 && cur && isReleased(cur)) {
    return { status: 'nextup', seasonIndex: idx, progress, releaseNote: null };
  }

  return { status: chosen, seasonIndex: idx, progress, releaseNote: null };
}

// ---- Store ---------------------------------------------------------------------

interface AddFranchiseArgs {
  seasons: SeasonSnap[];
  genres: string[];
  status: WatchStatus;
  /** Anzahl komplett geschauter Staffeln (0 = noch nicht angefangen). */
  watchedThrough: number;
}

// ---- Manuelle Reihenfolge „Abgeschlossen“ ----------------------------------------
// Per Drag & Drop sortierbar; leichtgewichtig in localStorage, getrennt vom
// IndexedDB-Bibliotheksspeicher (kein eigener „Datensatz“, nur eine ID-Liste).

const COMPLETED_ORDER_KEY = 'tsugi.completedOrder';

function loadCompletedOrder(): number[] {
  try {
    const raw = localStorage.getItem(COMPLETED_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

interface LibraryState {
  entries: Record<number, LibraryEntry>;
  hydrated: boolean;
  completedOrder: number[];
  hydrate: () => Promise<void>;
  addFranchise: (args: AddFranchiseArgs) => LibraryEntry | null;
  setStatus: (rootId: number, status: WatchStatus) => void;
  setProgress: (rootId: number, progress: number) => void;
  setWatchedThrough: (rootId: number, watchedThrough: number) => void;
  setRating: (rootId: number, rating: number | null) => void;
  setNotes: (rootId: number, notes: string) => void;
  setCompletedOrder: (rootIds: number[]) => void;
  applyScan: (rootId: number, patch: Partial<LibraryEntry>) => void;
  remove: (rootId: number) => void;
  importAll: (entries: LibraryEntry[]) => Promise<void>;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  entries: {},
  hydrated: false,
  completedOrder: loadCompletedOrder(),

  hydrate: async () => {
    const rows = await dbGetAll<LibraryEntry>();
    const valid = rows.filter((r) => typeof r.rootId === 'number' && Array.isArray(r.seasons));
    set({
      entries: Object.fromEntries(valid.map((r) => [r.rootId, r])),
      hydrated: true,
    });
  },

  addFranchise: ({ seasons, genres, status, watchedThrough }) => {
    if (seasons.length === 0) return null;
    const rootId = seasons[0].id;
    const now = Date.now();

    const releasedCount = seasons.filter(isReleased).length;
    // "Abgeschlossen" gewählt → alles Veröffentlichte gilt als geschaut.
    const through = status === 'completed' ? releasedCount : Math.min(watchedThrough, releasedCount);

    let seasonIndex: number;
    let progress: number;
    if (through >= seasons.length) {
      // Alle bekannten Staffeln komplett.
      seasonIndex = seasons.length - 1;
      progress = seasons[seasonIndex].episodes ?? 0;
    } else {
      seasonIndex = through;
      progress = 0;
    }

    const derived = deriveStatus(status, seasons, seasonIndex, progress);
    const entry: LibraryEntry = {
      rootId,
      status: derived.status,
      seasons,
      seasonIndex: derived.seasonIndex,
      progress: derived.progress,
      rating: null,
      notes: '',
      genres,
      addedAt: now,
      updatedAt: now,
      lastScanAt: 0,
      releaseNote: derived.releaseNote,
    };
    set((s) => ({ entries: { ...s.entries, [rootId]: entry } }));
    void dbPut(entry);
    return entry;
  },

  setStatus: (rootId, status) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    let next: LibraryEntry = { ...cur, status, updatedAt: Date.now() };
    if (status === 'completed') {
      // Manuell abgeschlossen → Zeiger ans Ende des Veröffentlichten.
      const releasedIdx = cur.seasons.reduce((acc, s, i) => (isReleased(s) ? i : acc), 0);
      next = {
        ...next,
        seasonIndex: releasedIdx,
        progress: cur.seasons[releasedIdx]?.episodes ?? cur.progress,
        releaseNote: null,
      };
    }
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
  },

  setProgress: (rootId, progress) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const season = currentSeason(cur);
    if (!season) return;

    const max = season.episodes ?? Number.MAX_SAFE_INTEGER;
    const clamped = Math.max(0, Math.min(Math.floor(progress), max));
    let next: LibraryEntry = { ...cur, progress: clamped, updatedAt: Date.now() };

    // Etwas angefangen → aus Watchlist/Noch-zu-schauen wird "Schaue ich".
    if (clamped > 0 && (cur.status === 'planned' || cur.status === 'nextup')) {
      next.status = 'watching';
    }

    // Letzte Episode einer fertigen Staffel gesehen → weiter im Franchise.
    const seasonDone =
      season.episodes !== null && clamped >= season.episodes && season.airStatus === 'FINISHED';
    if (seasonDone) {
      const push = useToasts.getState().push;
      const lang = useSettings.getState().lang;
      const nextSeason = cur.seasons[cur.seasonIndex + 1];
      if (nextSeason && isReleased(nextSeason)) {
        next = { ...next, seasonIndex: cur.seasonIndex + 1, progress: 0, status: 'watching', releaseNote: null };
        push(translate(lang, 'seasonCompleteNext', { t: nextSeason.title }));
      } else if (nextSeason) {
        next = {
          ...next,
          seasonIndex: cur.seasonIndex + 1,
          progress: 0,
          status: 'continuation',
          releaseNote: nextSeason.seasonYear ? String(nextSeason.seasonYear) : null,
        };
        push(`${translate(lang, 'stContinuation')} · ${nextSeason.title}`);
      } else {
        next = { ...next, status: 'completed', releaseNote: null };
        push(translate(lang, 'franchiseComplete'));
      }
    }

    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
  },

  setWatchedThrough: (rootId, watchedThrough) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const releasedCount = cur.seasons.filter(isReleased).length;
    const through = Math.max(0, Math.min(watchedThrough, releasedCount));
    let seasonIndex: number;
    let progress: number;
    if (through >= cur.seasons.length) {
      seasonIndex = cur.seasons.length - 1;
      progress = cur.seasons[seasonIndex].episodes ?? 0;
    } else {
      seasonIndex = through;
      progress = 0;
    }
    const derived = deriveStatus(cur.status, cur.seasons, seasonIndex, progress);
    const next: LibraryEntry = {
      ...cur,
      ...derived,
      updatedAt: Date.now(),
    };
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
  },

  setRating: (rootId, rating) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const next = { ...cur, rating, updatedAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
  },

  setNotes: (rootId, notes) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const next = { ...cur, notes, updatedAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
  },

  setCompletedOrder: (rootIds) => {
    set({ completedOrder: rootIds });
    try {
      localStorage.setItem(COMPLETED_ORDER_KEY, JSON.stringify(rootIds));
    } catch {
      /* privater Modus / voller Speicher — Reihenfolge lebt dann nur für die Session */
    }
  },

  /** Scan-Ergebnisse einspielen (neue Staffeln, aktualisierte Air-Status, Statuswechsel). */
  applyScan: (rootId, patch) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const next = { ...cur, ...patch, lastScanAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
  },

  remove: (rootId) => {
    set((s) => {
      const entries = { ...s.entries };
      delete entries[rootId];
      return { entries };
    });
    void dbDelete(rootId);
  },

  importAll: async (rows) => {
    await dbClear();
    for (const r of rows) await dbPut(r);
    set({ entries: Object.fromEntries(rows.map((r) => [r.rootId, r])) });
  },
}));

// ---- Gruppierung -----------------------------------------------------------------

export function entriesByStatus(
  entries: Record<number, LibraryEntry>,
): Record<WatchStatus, LibraryEntry[]> {
  const out: Record<WatchStatus, LibraryEntry[]> = {
    watching: [],
    planned: [],
    nextup: [],
    continuation: [],
    completed: [],
    paused: [],
  };
  for (const e of Object.values(entries)) out[e.status].push(e);
  for (const k of STATUS_ORDER) out[k].sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

export { statusLabelNow };
