import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { dbGetAll, dbPut, dbDelete, dbClear } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import type { FuzzyDate, MediaCard, MediaFormat, MediaSeason, MediaStatus } from '@/api/types';
import { bestTitle, cover } from '@/api/types';
import { translate, useSettings, type DictKey } from '@/i18n';
import { useToasts } from '@/store/toast';

/**
 * Franchise-basierte Bibliothek (Modell aus V1 übernommen): EIN Eintrag pro
 * Franchise, nicht pro Staffel. Der Eintrag kennt seine Hauptlinien-Staffeln
 * und einen Zeiger (seasonIndex + progress), bis wohin geschaut wurde.
 *
 * Persistenz seit dem Umstieg auf Multi-Device-Sync (2026-07-17): Supabase
 * (`tsugi_entries`/`tsugi_settings`, RLS-geschützt) ist die Quelle der
 * Wahrheit. IndexedDB bleibt als schneller lokaler Cache erhalten — die App
 * zeichnet die Bibliothek sofort aus dem Cache, bevor der Netzwerk-Roundtrip
 * zu Supabase durchgelaufen ist, und bleibt kurzzeitig offline nutzbar.
 * Jede Änderung schreibt optimistisch lokal UND (fire-and-forget) nach
 * Supabase; eine Realtime-Subscription spielt Änderungen von anderen
 * Geräten/Tabs live ein.
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
 * und „Noch zu schauen“ zeigt der Zeiger (seasonIndex) schon auf die
 * kommende bzw. bereits veröffentlichte, aber noch nicht begonnene Staffel —
 * hier interessiert aber, was wirklich geschaut wurde. Gibt `undefined`
 * zurück, wenn noch gar nichts abgeschlossen wurde.
 */
export function lastWatchedSeason(e: LibraryEntry): SeasonSnap | undefined {
  if (e.status === 'continuation' || e.status === 'nextup') {
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

// ---- Supabase-Sync ---------------------------------------------------------------

interface EntryRow {
  user_id: string;
  root_id: number;
  status: string;
  seasons: SeasonSnap[];
  season_index: number;
  progress: number;
  rating: number | null;
  notes: string;
  genres: string[];
  added_at: number;
  updated_at: number;
  last_scan_at: number;
  release_note: string | null;
}

function currentUserId(): string | null {
  return useAuth.getState().user?.id ?? null;
}

function rowToEntry(row: EntryRow): LibraryEntry {
  return {
    rootId: row.root_id,
    status: row.status as WatchStatus,
    seasons: row.seasons,
    seasonIndex: row.season_index,
    progress: row.progress,
    rating: row.rating,
    notes: row.notes,
    genres: row.genres,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    lastScanAt: row.last_scan_at,
    releaseNote: row.release_note,
  };
}

function entryToRow(e: LibraryEntry, userId: string): EntryRow {
  return {
    user_id: userId,
    root_id: e.rootId,
    status: e.status,
    seasons: e.seasons,
    season_index: e.seasonIndex,
    progress: e.progress,
    rating: e.rating,
    notes: e.notes,
    genres: e.genres,
    added_at: e.addedAt,
    updated_at: e.updatedAt,
    last_scan_at: e.lastScanAt,
    release_note: e.releaseNote,
  };
}

async function fetchRemoteEntries(userId: string): Promise<LibraryEntry[]> {
  const { data, error } = await supabase.from('tsugi_entries').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => rowToEntry(row as EntryRow));
}

// WICHTIG: supabase-js-Query-Builder sind "lazy thenables" — der eigentliche
// Netzwerk-Request feuert erst in `.then()`/`await`, nicht beim Aufbau der
// Query. `void supabase.from(...).upsert(...)` OHNE `.then()`/`await` baut
// die Query nur auf und verwirft sie sofort wieder, OHNE sie je abzuschicken.
// Das war der Bug hinter "Einträge kommen auf einem neuen Gerät nicht an":
// jedes Speichern sah durch den lokalen IndexedDB-Cache korrekt aus, kam bei
// Supabase aber nie an. Deshalb hier immer `.then()` mit Fehler-Logging.
function upsertRemote(e: LibraryEntry, userId: string): void {
  void supabase
    .from('tsugi_entries')
    .upsert(entryToRow(e, userId))
    .then(({ error }) => {
      if (error) console.error('Tsugi: Sync nach Supabase fehlgeschlagen (upsertRemote)', error);
    });
}

function deleteRemote(rootId: number, userId: string): void {
  void supabase
    .from('tsugi_entries')
    .delete()
    .eq('user_id', userId)
    .eq('root_id', rootId)
    .then(({ error }) => {
      if (error) console.error('Tsugi: Sync nach Supabase fehlgeschlagen (deleteRemote)', error);
    });
}

async function fetchRemoteCompletedOrder(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('tsugi_settings')
    .select('completed_order')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.completed_order as number[] | undefined) ?? [];
}

function upsertRemoteCompletedOrder(userId: string, order: number[]): void {
  void supabase
    .from('tsugi_settings')
    .upsert({ user_id: userId, completed_order: order })
    .then(({ error }) => {
      if (error) console.error('Tsugi: Sync nach Supabase fehlgeschlagen (completedOrder)', error);
    });
}

let realtimeChannel: RealtimeChannel | null = null;

/** Live-Updates von anderen Geräten/Tabs einspielen. Ein Kanal pro Login. */
function subscribeRealtime(userId: string): void {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel('tsugi-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tsugi_entries', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const rootId = (payload.old as { root_id: number }).root_id;
          useLibrary.setState((s) => {
            const entries = { ...s.entries };
            delete entries[rootId];
            return { entries };
          });
          void dbDelete(rootId);
        } else {
          const entry = rowToEntry(payload.new as EntryRow);
          useLibrary.setState((s) => ({ entries: { ...s.entries, [entry.rootId]: entry } }));
          void dbPut(entry);
        }
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tsugi_settings', filter: `user_id=eq.${userId}` },
      (payload) => {
        const order = (payload.new as { completed_order?: number[] } | null)?.completed_order;
        if (!order) return;
        useLibrary.setState({ completedOrder: order });
        try {
          localStorage.setItem(COMPLETED_ORDER_KEY, JSON.stringify(order));
        } catch {
          /* ignore */
        }
      },
    )
    .subscribe();
}

function unsubscribeRealtime(): void {
  if (!realtimeChannel) return;
  void supabase.removeChannel(realtimeChannel);
  realtimeChannel = null;
}

// ---- Store ---------------------------------------------------------------------

interface AddFranchiseArgs {
  seasons: SeasonSnap[];
  genres: string[];
  status: WatchStatus;
  /** Anzahl komplett geschauter Staffeln (0 = noch nicht angefangen). */
  watchedThrough: number;
  /**
   * Episode innerhalb der Staffel an Position `watchedThrough` — für den
   * „Gerade am Schauen“-Flow, der nicht nur ganze Staffeln, sondern eine
   * konkrete Folge kennt. Ohne Angabe wie bisher 0 (Staffel noch nicht
   * begonnen).
   */
  currentEpisode?: number;
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
  /** Nach Login: mit Supabase abgleichen, ggf. lokale Erstdaten hochladen, Realtime starten. */
  syncFromRemote: (userId: string) => Promise<void>;
  /** Nach Logout: Zustand & Realtime-Abo zurücksetzen. */
  resetLocal: () => void;
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

  syncFromRemote: async (userId) => {
    try {
      const [remote, remoteOrder] = await Promise.all([
        fetchRemoteEntries(userId),
        fetchRemoteCompletedOrder(userId),
      ]);
      const localEntries = Object.values(get().entries);

      if (remote.length === 0 && localEntries.length > 0) {
        // Erste Anmeldung mit bereits vorhandenen lokalen Daten (z. B. aus der
        // Zeit vor dem Login-Umstieg) → hochladen statt stillschweigend zu
        // verwerfen. Ab jetzt ist die Cloud die Quelle der Wahrheit.
        for (const e of localEntries) upsertRemote(e, userId);
        const localOrder = get().completedOrder;
        if (localOrder.length > 0) upsertRemoteCompletedOrder(userId, localOrder);
      } else {
        set({
          entries: Object.fromEntries(remote.map((r) => [r.rootId, r])),
          completedOrder: remoteOrder,
        });
        await dbClear();
        for (const r of remote) await dbPut(r);
        try {
          localStorage.setItem(COMPLETED_ORDER_KEY, JSON.stringify(remoteOrder));
        } catch {
          /* ignore */
        }
      }
      subscribeRealtime(userId);
    } catch {
      // Offline oder Netzwerkfehler: lokaler Cache bleibt gültig, der nächste
      // erfolgreiche Login/Sync gleicht wieder ab.
    }
  },

  resetLocal: () => {
    unsubscribeRealtime();
    set({ entries: {}, completedOrder: [], hydrated: false });
  },

  addFranchise: ({ seasons, genres, status, watchedThrough, currentEpisode }) => {
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
      progress = currentEpisode ?? 0;
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
    const uid = currentUserId();
    if (uid) upsertRemote(entry, uid);
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
    const uid = currentUserId();
    if (uid) upsertRemote(next, uid);
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
    const uid = currentUserId();
    if (uid) upsertRemote(next, uid);
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
    const uid = currentUserId();
    if (uid) upsertRemote(next, uid);
  },

  setRating: (rootId, rating) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const next = { ...cur, rating, updatedAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
    const uid = currentUserId();
    if (uid) upsertRemote(next, uid);
  },

  setNotes: (rootId, notes) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const next = { ...cur, notes, updatedAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
    const uid = currentUserId();
    if (uid) upsertRemote(next, uid);
  },

  setCompletedOrder: (rootIds) => {
    set({ completedOrder: rootIds });
    try {
      localStorage.setItem(COMPLETED_ORDER_KEY, JSON.stringify(rootIds));
    } catch {
      /* privater Modus / voller Speicher — Reihenfolge lebt dann nur für die Session */
    }
    const uid = currentUserId();
    if (uid) upsertRemoteCompletedOrder(uid, rootIds);
  },

  /** Scan-Ergebnisse einspielen (neue Staffeln, aktualisierte Air-Status, Statuswechsel). */
  applyScan: (rootId, patch) => {
    const cur = get().entries[rootId];
    if (!cur) return;
    const next = { ...cur, ...patch, lastScanAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [rootId]: next } }));
    void dbPut(next);
    const uid = currentUserId();
    if (uid) upsertRemote(next, uid);
  },

  remove: (rootId) => {
    set((s) => {
      const entries = { ...s.entries };
      delete entries[rootId];
      return { entries };
    });
    void dbDelete(rootId);
    const uid = currentUserId();
    if (uid) deleteRemote(rootId, uid);
  },

  importAll: async (rows) => {
    await dbClear();
    for (const r of rows) await dbPut(r);
    set({ entries: Object.fromEntries(rows.map((r) => [r.rootId, r])) });

    const uid = currentUserId();
    if (uid) {
      // Ersetzt die gesamte Cloud-Bibliothek durch den Import — bewusst
      // destruktiv, genau wie der bisherige lokale Import/Wipe.
      await supabase.from('tsugi_entries').delete().eq('user_id', uid);
      if (rows.length > 0) {
        await supabase.from('tsugi_entries').insert(rows.map((r) => entryToRow(r, uid)));
      }
    }
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
