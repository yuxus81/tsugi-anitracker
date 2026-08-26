import type { Franchise } from '@/api/anilist';
import type { MediaDetail } from '@/api/types';
import { seasonSnapFrom, type SeasonSnap } from '@/store/library';

/**
 * Baut den chronologischen Franchise-Zeitstrahl: Hauptlinie plus die
 * Kinofilme, die wirklich dazugehören.
 *
 * Filme sind oft die eigentliche Fortsetzung (Haikyū, Chainsaw Man …),
 * landen bei AniList je nach Verknüpfung aber nur in den „Extras" statt in
 * der Hauptlinie. Ohne das Einmischen überspränge „Geschaut" sie
 * stillschweigend. Reine Zusammenfassungs-/Recap-Filme und Spin-offs bleiben
 * draußen — die gehören nicht in den Fortschritt.
 *
 * Lag früher in `components/AddPanel.tsx`. Der Ort war falsch: eine Regel,
 * die entscheidet, woraus ein Eintrag besteht, ist keine Sache einer
 * Oberfläche.
 */
export function buildFranchiseSeasons(
  detail: MediaDetail,
  franchise: Franchise | undefined,
): SeasonSnap[] {
  const main = franchise?.mainline ?? [];

  const movieExtras = (franchise?.extras ?? [])
    .filter((x) => x.media.format === 'MOVIE' && x.relation !== 'Zusammenfassung' && x.relation !== 'Spin-off')
    .map((x) => x.media);

  const base = main.length > 0 ? [...main, ...movieExtras] : [detail];

  // Chronologisch nach Jahr, aber die ursprüngliche Reihenfolge als stabiler
  // Zweitschlüssel (Hauptlinie zuerst) — danach Duplikate raus.
  const withOrder = base.map((c, i) => ({ c, i }));
  withOrder.sort((a, b) => (a.c.seasonYear ?? 9999) - (b.c.seasonYear ?? 9999) || a.i - b.i);
  const seen = new Set<number>();
  const ordered = withOrder.map((w) => w.c).filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));

  return ordered.map(seasonSnapFrom);
}
