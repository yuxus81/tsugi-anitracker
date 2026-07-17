import { useEffect } from 'react';
import { create } from 'zustand';
import { fetchGermanMeta, tmdbEnabled, type GermanMeta, type TitleQuery } from '@/api/tmdb';
import type { LibraryEntry, SeasonSnap } from '@/store/library';
import { useSettings } from '@/i18n';

/**
 * Anzeigetext-Auflösung (Titel + Beschreibung). Hält die per TMDB gefundenen
 * deutschen Texte im Speicher (der langlebige Cache liegt in localStorage,
 * siehe api/tmdb.ts) und rendert die betroffenen Karten neu, sobald ein
 * Treffer eintrifft. Pro Anime nur EINE Anfrage — Titel und Beschreibung
 * teilen sich das Ergebnis, mehrere Karten desselben Anime auch.
 */
interface TitleState {
  map: Record<number, GermanMeta>;
  requested: Set<number>;
  resolve: (q: TitleQuery) => void;
}

const useTitleStore = create<TitleState>((set, get) => ({
  map: {},
  requested: new Set<number>(),
  resolve: (q) => {
    if (!tmdbEnabled) return;
    const { map, requested } = get();
    if (q.id in map || requested.has(q.id)) return;
    requested.add(q.id);
    void fetchGermanMeta(q).then((meta) => {
      set((s) => ({ map: { ...s.map, [q.id]: meta } }));
    });
  },
}));

export function snapQuery(s: SeasonSnap): TitleQuery {
  return { id: s.id, romaji: null, english: s.title, isMovie: s.format === 'MOVIE', year: s.seasonYear };
}

/** Titel-Anfrage für einen ganzen Bibliothekseintrag (über die erste Staffel). */
export function entryQuery(e: LibraryEntry): TitleQuery {
  const s = e.seasons[0];
  return {
    id: s?.id ?? e.rootId,
    romaji: null,
    english: s?.title ?? null,
    isMovie: s?.format === 'MOVIE',
    year: s?.seasonYear ?? null,
  };
}

function useResolvedMeta(q: TitleQuery): { active: boolean; meta: GermanMeta | undefined } {
  const lang = useSettings((s) => s.lang);
  const resolved = useTitleStore((s) => s.map[q.id]);
  const resolve = useTitleStore((s) => s.resolve);
  const active = tmdbEnabled && lang === 'de';

  useEffect(() => {
    if (active) resolve(q);
    // Nur die Id bestimmt die Anfrage; das Query-Objekt wird pro Render neu gebaut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, q.id]);

  return { active, meta: resolved };
}

/**
 * Gibt den anzuzeigenden Titel zurück: den deutschen (falls Sprache = DE, Overlay
 * aktiv und ein Treffer vorliegt), sonst den übergebenen Fallback (Romaji/Englisch).
 * Stößt die Auflösung bei Bedarf beiläufig an.
 */
export function useDisplayTitle(q: TitleQuery, fallback: string): string {
  const { active, meta } = useResolvedMeta(q);
  return active && meta?.title ? meta.title : fallback;
}

/**
 * Gibt die anzuzeigende Beschreibung zurück: die deutsche TMDB-Zusammenfassung
 * (falls Sprache = DE, Overlay aktiv und vorhanden), sonst den AniList-Fallback.
 */
export function useDisplayDescription(q: TitleQuery, fallback: string | null): string | null {
  const { active, meta } = useResolvedMeta(q);
  return active && meta?.overview ? meta.overview : fallback;
}
