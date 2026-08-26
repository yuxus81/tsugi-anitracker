import type { MediaCard, MediaFormat, MediaSeason, MediaStatus } from '@/api/types';
import type { LibraryEntry, SeasonSnap, WatchStatus } from '@/store/library';

/**
 * Testdaten-Werkstatt. Ziel: ein Test soll NUR das nennen, worauf es ihm
 * ankommt — „eine fertige Staffel mit 12 Folgen" statt fünfzehn Feldern
 * Rauschen. Was ein Test nicht nennt, ist für sein Ergebnis auch nicht
 * verantwortlich; das macht Fehlschläge lesbar.
 */

let nextId = 1;
/** Damit Tests, die auf Ids vergleichen, nicht von der Laufreihenfolge abhängen. */
export function resetIds(): void {
  nextId = 1;
}

export function season(over: Partial<SeasonSnap> = {}): SeasonSnap {
  const id = over.id ?? nextId++;
  return {
    id,
    title: `Staffel ${id}`,
    coverUrl: `https://example.test/cover/${id}.jpg`,
    format: 'TV' as MediaFormat,
    episodes: 12,
    season: 'SPRING' as MediaSeason,
    seasonYear: 2024,
    startDate: { year: 2024, month: 4, day: 1 },
    airStatus: 'FINISHED' as MediaStatus,
    averageScore: 80,
    duration: 24,
    ...over,
  };
}

/** Läuft noch — Folgenzahl bekannt, aber Staffel nicht abgeschlossen. */
export function airingSeason(over: Partial<SeasonSnap> = {}): SeasonSnap {
  return season({ airStatus: 'RELEASING', ...over });
}

/** Angekündigt, noch nicht erschienen. */
export function announcedSeason(over: Partial<SeasonSnap> = {}): SeasonSnap {
  return season({
    airStatus: 'NOT_YET_RELEASED',
    episodes: null,
    seasonYear: 2027,
    season: null,
    startDate: null,
    ...over,
  });
}

export function entry(over: Partial<LibraryEntry> = {}): LibraryEntry {
  const seasons = over.seasons ?? [season()];
  return {
    rootId: seasons[0]?.id ?? 1,
    status: 'watching' as WatchStatus,
    seasons,
    seasonIndex: 0,
    progress: 0,
    rating: null,
    notes: '',
    genres: ['Action'],
    addedAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    lastScanAt: 0,
    releaseNote: null,
    ...over,
  };
}

export function mediaCard(over: Partial<MediaCard> = {}): MediaCard {
  const id = over.id ?? nextId++;
  // Bewusst ohne `as MediaCard`: ein Cast würde genau die Abweichung
  // verschlucken, die der Test aufdecken soll, wenn sich der Typ ändert.
  return {
    id,
    title: { romaji: `Romaji ${id}`, english: `English ${id}` },
    coverImage: {
      large: `https://example.test/large/${id}.jpg`,
      extraLarge: `https://example.test/xl/${id}.jpg`,
      color: '#8a2be2',
    },
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
    ...over,
  };
}
