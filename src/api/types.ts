import { translate, type Lang } from '@/i18n';

/** AniList media shapes — only the fields Tsugi consumes. */

export type MediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
export type MediaStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
export type RelationType =
  | 'SEQUEL'
  | 'PREQUEL'
  | 'PARENT'
  | 'SIDE_STORY'
  | 'SPIN_OFF'
  | 'ALTERNATIVE'
  | 'SUMMARY'
  | 'CHARACTER'
  | 'ADAPTATION'
  | 'SOURCE'
  | 'OTHER'
  | 'COMPILATION'
  | 'CONTAINS';

export interface FuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

/** Compact media card — everything a poster/list row needs. */
export interface MediaCard {
  id: number;
  title: { romaji: string | null; english: string | null };
  coverImage: { extraLarge: string | null; large: string | null; color: string | null };
  format: MediaFormat | null;
  status: MediaStatus | null;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  genres: string[];
  isAdult: boolean;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
  startDate: FuzzyDate | null;
}

/** Full detail payload. */
export interface MediaDetail extends MediaCard {
  bannerImage: string | null;
  description: string | null;
  studios: { nodes: Array<{ name: string; isAnimationStudio: boolean }> };
  endDate: FuzzyDate | null;
  trailer: { id: string | null; site: string | null } | null;
  relations: {
    edges: Array<{
      relationType: RelationType;
      node: MediaCard & { type: 'ANIME' | 'MANGA' };
    }>;
  };
  recommendations: {
    nodes: Array<{ rating: number; mediaRecommendation: MediaCard | null }>;
  };
}

export interface PageOf<T> {
  media: T[];
}

export function bestTitle(m: { title: { romaji: string | null; english: string | null } }): string {
  return m.title.english || m.title.romaji || 'Unbekannt';
}

export function cover(m: MediaCard): string | null {
  return m.coverImage.extraLarge || m.coverImage.large || null;
}

const FORMAT_KEY = {
  TV: 'fmtTV',
  TV_SHORT: 'fmtTVShort',
  MOVIE: 'fmtMovie',
  SPECIAL: 'fmtSpecial',
  OVA: 'fmtOVA',
  ONA: 'fmtONA',
  MUSIC: 'fmtMusic',
} as const;

const SEASON_KEY = {
  WINTER: 'seasonWinter',
  SPRING: 'seasonSpring',
  SUMMER: 'seasonSummer',
  FALL: 'seasonFall',
} as const;

export function formatLabel(f: MediaFormat, lang: Lang): string {
  return translate(lang, FORMAT_KEY[f]);
}

export function seasonLabel(m: Pick<MediaCard, 'season' | 'seasonYear'>, lang: Lang): string | null {
  if (m.season && m.seasonYear) return `${translate(lang, SEASON_KEY[m.season])} ${m.seasonYear}`;
  if (m.seasonYear) return String(m.seasonYear);
  return null;
}
