import { useMemo } from 'react';
import {
  meanDuration,
  STATUS_KEY,
  STATUS_ORDER,
  useLibrary,
  watchedEpisodes,
  type WatchStatus,
} from '@/store/library';
import { PageTitle, SectionHead, EmptyState, Bar } from '@/components/ui';
import { useScreenTone } from '@/store/tone';
import { useLocale, useT } from '@/i18n';

/** Alles offline aus der Bibliothek gerechnet. 1:1 aus design-lab `screenStats()`. */
export function StatsPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const t = useT();
  const locale = useLocale();
  useScreenTone('completed');

  const stats = useMemo(() => {
    const all = Object.values(entries);
    const episodes = all.reduce((sum, e) => sum + watchedEpisodes(e), 0);
    const minutes = all.reduce((sum, e) => sum + watchedEpisodes(e) * meanDuration(e), 0);
    const rated = all.filter((e) => e.rating !== null);
    const meanRating = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null;

    const genreCount = new Map<string, number>();
    for (const e of all) for (const g of e.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    const genres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));

    const perStatus = STATUS_ORDER.map((s) => ({
      status: s,
      count: all.filter((e) => e.status === s).length,
    }));

    const ratings = Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: rated.filter((e) => e.rating === i + 1).length,
    }));

    return {
      total: all.length,
      episodes,
      hours: Math.round(minutes / 60),
      meanRating,
      genres,
      perStatus,
      ratings,
    };
  }, [entries]);

  if (hydrated && stats.total === 0) {
    return (
      <div>
        <PageTitle title={t('statsTitle')} />
        <EmptyState status="completed" title={t('statsEmptyTitle')} hint={t('statsEmptyHint')} />
      </div>
    );
  }

  const maxStatus = Math.max(1, ...stats.perStatus.map((s) => s.count));
  const maxGenre = Math.max(1, ...stats.genres.map((g) => g.value));
  const maxRating = Math.max(1, ...stats.ratings.map((r) => r.count));

  const tiles: Array<[string, string, WatchStatus]> = [
    [t('statsWatchtime'), `${stats.hours.toLocaleString(locale)} h`, 'watching'],
    [t('statsEpisodes'), stats.episodes.toLocaleString(locale), 'nextup'],
    [t('statsTitles'), String(stats.total), 'planned'],
    [t('statsAvgRating'), stats.meanRating != null ? stats.meanRating.toFixed(1) : '—', 'completed'],
  ];

  return (
    <div>
      <PageTitle title={t('statsTitle')} sub={t('statsSub')} />

      <div className="tiles">
        {tiles.map(([k, v, tone]) => (
          <div key={k} className="tile stat-tile" data-st={tone}>
            <span className="stat-tile__v">{v}</span>
            <span className="stat-tile__k">{k}</span>
          </div>
        ))}
      </div>

      <SectionHead title={t('statsByStatus')} tone="watching" />
      <div className="panel">
        {stats.perStatus.map(({ status, count }) => (
          <div key={status} className="barrow" data-st={status}>
            <span className="barrow__k">{t(STATUS_KEY[status])}</span>
            <Bar pct={(count / maxStatus) * 100} />
            <span className="barrow__v">{count}</span>
          </div>
        ))}
      </div>

      {stats.genres.length > 0 && (
        <>
          <SectionHead title={t('statsGenres')} tone="nextup" />
          <div className="panel" data-st="nextup">
            {stats.genres.map((g) => (
              <div key={g.label} className="barrow">
                <span className="barrow__k">{g.label}</span>
                <Bar pct={(g.value / maxGenre) * 100} />
                <span className="barrow__v">{g.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead title={t('statsRatingDist')} tone="completed" />
      <div className="panel" data-st="completed">
        <div className="spread">
          {stats.ratings.map((r) => (
            <div key={r.score} className="spread__col">
              <span className="spread__n">{r.count || ''}</span>
              <span
                className="spread__bar"
                style={{
                  height: `${(r.count / maxRating) * 100}%`,
                  minHeight: r.count ? 6 : 2,
                  opacity: r.count ? 1 : 0.25,
                }}
              />
              <span className="spread__n">{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
