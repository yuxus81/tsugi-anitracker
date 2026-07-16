import { create } from 'zustand';
import { dbGetAll, dbPut, dbDelete, dbClear } from '@/lib/db';
import type { MediaCard, MediaFormat } from '@/api/types';
import { bestTitle, cover } from '@/api/types';

/** Tracking status vocabulary — the heart of the app. */
export type WatchStatus = 'watching' | 'planned' | 'completed' | 'paused' | 'dropped';

export const STATUS_LABEL: Record<WatchStatus, string> = {
  watching: 'Schaue ich',
  planned: 'Geplant',
  completed: 'Abgeschlossen',
  paused: 'Pausiert',
  dropped: 'Abgebrochen',
};

export const STATUS_ORDER: WatchStatus[] = [
  'watching',
  'planned',
  'completed',
  'paused',
  'dropped',
];

/** One tracked anime. A denormalized snapshot of the AniList card lives inside,
 *  so the library renders instantly and fully offline. */
export interface LibraryEntry {
  mediaId: number;
  status: WatchStatus;
  progress: number; // episodes seen
  rating: number | null; // personal, 1..10
  addedAt: number;
  updatedAt: number;
  // snapshot
  title: string;
  coverUrl: string | null;
  bannerUrl?: string | null;
  format: MediaFormat | null;
  episodes: number | null; // null = unknown/ongoing
  duration: number | null; // minutes per episode
  genres: string[];
  seasonYear: number | null;
  averageScore: number | null;
  releasing: boolean;
  notes: string;
}

export function snapshotFrom(card: MediaCard): Omit<
  LibraryEntry,
  'status' | 'progress' | 'rating' | 'addedAt' | 'updatedAt' | 'notes'
> {
  return {
    mediaId: card.id,
    title: bestTitle(card),
    coverUrl: cover(card),
    format: card.format,
    episodes: card.episodes,
    duration: card.duration,
    genres: card.genres,
    seasonYear: card.seasonYear,
    averageScore: card.averageScore,
    releasing: card.status === 'RELEASING',
  };
}

interface LibraryState {
  entries: Record<number, LibraryEntry>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (card: MediaCard, status: WatchStatus) => LibraryEntry;
  setStatus: (mediaId: number, status: WatchStatus) => void;
  setProgress: (mediaId: number, progress: number) => void;
  setRating: (mediaId: number, rating: number | null) => void;
  setNotes: (mediaId: number, notes: string) => void;
  refreshSnapshot: (card: MediaCard) => void;
  remove: (mediaId: number) => void;
  importAll: (entries: LibraryEntry[]) => Promise<void>;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  entries: {},
  hydrated: false,

  hydrate: async () => {
    const rows = await dbGetAll<LibraryEntry>();
    set({
      entries: Object.fromEntries(rows.map((r) => [r.mediaId, r])),
      hydrated: true,
    });
  },

  add: (card, status) => {
    const now = Date.now();
    const entry: LibraryEntry = {
      ...snapshotFrom(card),
      status,
      // "Abgeschlossen" direkt beim Hinzufügen → Fortschritt = volle Länge.
      progress: status === 'completed' ? (card.episodes ?? 0) : 0,
      rating: null,
      addedAt: now,
      updatedAt: now,
      notes: '',
    };
    set((s) => ({ entries: { ...s.entries, [card.id]: entry } }));
    void dbPut(entry);
    return entry;
  },

  setStatus: (mediaId, status) => {
    const cur = get().entries[mediaId];
    if (!cur) return;
    const next: LibraryEntry = {
      ...cur,
      status,
      // Completing a finished show fills the progress bar.
      progress:
        status === 'completed' && cur.episodes ? cur.episodes : cur.progress,
      updatedAt: Date.now(),
    };
    set((s) => ({ entries: { ...s.entries, [mediaId]: next } }));
    void dbPut(next);
  },

  setProgress: (mediaId, progress) => {
    const cur = get().entries[mediaId];
    if (!cur) return;
    const max = cur.episodes ?? Number.MAX_SAFE_INTEGER;
    const clamped = Math.max(0, Math.min(progress, max));
    const done = cur.episodes !== null && clamped >= cur.episodes && !cur.releasing;
    const next: LibraryEntry = {
      ...cur,
      progress: clamped,
      // Watching the last episode completes the entry automatically.
      status: done ? 'completed' : cur.status === 'planned' && clamped > 0 ? 'watching' : cur.status,
      updatedAt: Date.now(),
    };
    set((s) => ({ entries: { ...s.entries, [mediaId]: next } }));
    void dbPut(next);
  },

  setRating: (mediaId, rating) => {
    const cur = get().entries[mediaId];
    if (!cur) return;
    const next = { ...cur, rating, updatedAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [mediaId]: next } }));
    void dbPut(next);
  },

  setNotes: (mediaId, notes) => {
    const cur = get().entries[mediaId];
    if (!cur) return;
    const next = { ...cur, notes, updatedAt: Date.now() };
    set((s) => ({ entries: { ...s.entries, [mediaId]: next } }));
    void dbPut(next);
  },

  refreshSnapshot: (card) => {
    const cur = get().entries[card.id];
    if (!cur) return;
    const snap = snapshotFrom(card);
    // Only persist when something actually changed (episode count announced,
    // show finished airing, cover swapped) to avoid write churn.
    if (
      snap.episodes === cur.episodes &&
      snap.releasing === cur.releasing &&
      snap.coverUrl === cur.coverUrl &&
      snap.averageScore === cur.averageScore
    ) {
      return;
    }
    const next = { ...cur, ...snap };
    set((s) => ({ entries: { ...s.entries, [card.id]: next } }));
    void dbPut(next);
  },

  remove: (mediaId) => {
    set((s) => {
      const entries = { ...s.entries };
      delete entries[mediaId];
      return { entries };
    });
    void dbDelete(mediaId);
  },

  importAll: async (rows) => {
    await dbClear();
    for (const r of rows) await dbPut(r);
    set({ entries: Object.fromEntries(rows.map((r) => [r.mediaId, r])) });
  },
}));

// ---- Derived helpers -----------------------------------------------------------

export function entriesByStatus(
  entries: Record<number, LibraryEntry>,
): Record<WatchStatus, LibraryEntry[]> {
  const out: Record<WatchStatus, LibraryEntry[]> = {
    watching: [],
    planned: [],
    completed: [],
    paused: [],
    dropped: [],
  };
  for (const e of Object.values(entries)) out[e.status].push(e);
  for (const k of STATUS_ORDER) out[k].sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}
