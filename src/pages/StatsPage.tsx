import { useMemo } from 'react';
import {
  meanDuration,
  STATUS_KEY,
  STATUS_ORDER,
  totalEpisodes,
  useLibrary,
  watchedEpisodes,
  type WatchStatus,
} from '@/store/library';
import { PageTitle, SectionHead, EmptyState } from '@/components/ui';
import { useLocale, useT } from '@/i18n';

/**
 * Everything here is computed from the local library — zero network. Charts
 * follow the house dataviz rules: single-hue bars for magnitude, status colors
 * only for status (always with label + count, never color alone).
 */

const STATUS_FILL: Record<WatchStatus, string> = {
  watching: '#00f5d4',
  nextup: '#ff0055',
  planned: '#8a2be2',
  continuation: '#3a86ff',
  completed: '#2ecc71',
};

const GENRE_GRADIENT = [
  'linear-gradient(90deg,#00f5d4,#3a86ff)',
  'linear-gradient(90deg,#ff0055,#8a2be2)',
  'linear-gradient(90deg,#3a86ff,#8a2be2)',
  'linear-gradient(90deg,#ffcf4d,#f5a524)',
  'linear-gradient(90deg,#2ecc71,#00f5d4)',
  'linear-gradient(90deg,#8a2be2,#ff0055)',
  'linear-gradient(90deg,#f5a524,#ff0055)',
  'linear-gradient(90deg,#3a86ff,#00f5d4)',
];

function StatTile({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return (
    <div className="ios-glass overflow-hidden rounded-card px-5 py-4">
      <p className="font-display text-[30px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-2 text-[13px] font-medium text-ink-dim">{label}</p>
      {detail && <p className="mt-0.5 text-xs text-ink-faint">{detail}</p>}
    </div>
  );
}

/** Orbit-Ring: die Sehzeit als leuchtender Fortschrittskreis statt Kachel. */
function WatchtimeOrbit({ pct, value, label }: { pct: number; value: string; label: string }) {
  const r = 72;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(2, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative mx-auto h-[168px] w-[168px]">
      <svg viewBox="0 0 170 170" className="h-full w-full -rotate-90">
        <circle cx="85" cy="85" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-line" />
        <circle
          cx="85"
          cy="85"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-accent transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="font-display text-[26px] font-semibold leading-none text-ink">{value}</span>
        <span className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Status-Donut statt gestapeltem Balken. */
function StatusDonut({ rows, total }: { rows: Array<{ status: WatchStatus; count: number }>; total: number }) {
  let acc = 0;
  const stops = rows.map(({ status, count }) => {
    const start = acc;
    acc += (count / total) * 100;
    return `${STATUS_FILL[status]} ${start}% ${acc}%`;
  });
  return (
    <div className="relative h-[140px] w-[140px] shrink-0 rounded-full" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
      <div className="absolute inset-[18px] rounded-full bg-bg" />
    </div>
  );
}

/** Horizontal bar list mit Farbverlauf statt Einheitsfarbe. */
function GenreBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[100px_1fr_36px] items-center gap-3">
          <span className="truncate text-[13px] text-ink-dim">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-[5px] bg-raised">
            <span
              className="block h-full rounded-[5px] transition-[width] duration-500 ease-out"
              style={{ width: `${(r.value / max) * 100}%`, background: GENRE_GRADIENT[i % GENRE_GRADIENT.length] }}
            />
          </span>
          <span className="text-right text-[13px] font-semibold tabular-nums text-ink">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function StatsPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const t = useT();
  const locale = useLocale();

  const stats = useMemo(() => {
    const all = Object.values(entries);
    const episodes = all.reduce((sum, e) => sum + watchedEpisodes(e), 0);
    const minutes = all.reduce((sum, e) => sum + watchedEpisodes(e) * meanDuration(e), 0);
    const knownEpisodes = all.reduce((sum, e) => sum + totalEpisodes(e), 0);
    const rated = all.filter((e) => e.rating !== null);
    const meanRating = rated.length
      ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length
      : null;

    const genreCount = new Map<string, number>();
    for (const e of all) {
      for (const g of e.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
    const genres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));

    const ratingDist = Array.from({ length: 10 }, (_, i) => ({
      label: String(i + 1),
      value: rated.filter((e) => e.rating === i + 1).length,
    }));

    const byStatus = STATUS_ORDER.map((s) => ({
      status: s,
      count: all.filter((e) => e.status === s).length,
    })).filter((x) => x.count > 0);

    const years = new Map<number, number>();
    for (const e of all) {
      const y = e.seasons[0]?.seasonYear;
      if (y) years.set(y, (years.get(y) ?? 0) + 1);
    }
    const topYears = [...years.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .sort((a, b) => a[0] - b[0])
      .map(([y, v]) => ({ label: String(y), value: v }));

    return { all, episodes, minutes, knownEpisodes, meanRating, genres, ratingDist, byStatus, topYears };
  }, [entries]);

  if (hydrated && stats.all.length === 0) {
    return (
      <div>
        <PageTitle title={t('statsTitle')} />
        <EmptyState title={t('statsEmptyTitle')} hint={t('statsEmptyHint')} />
      </div>
    );
  }

  const days = stats.minutes / 60 / 24;
  const total = stats.all.length;
  const maxRatingCount = Math.max(...stats.ratingDist.map((r) => r.value), 1);
  const peakRating = Math.max(...stats.ratingDist.map((r) => r.value));
  const anyRatings = stats.ratingDist.some((r) => r.value > 0);
  const completionPct = stats.knownEpisodes > 0 ? (stats.episodes / stats.knownEpisodes) * 100 : 0;
  const watchtimeValue =
    days >= 1
      ? t('statsDays', { n: days.toLocaleString(locale, { maximumFractionDigits: 1 }) })
      : t('statsHours', { n: Math.round(stats.minutes / 60) });

  return (
    <div>
      <PageTitle title={t('statsTitle')} sub={t('statsSub')} />

      <div className="mb-10 grid gap-4 sm:grid-cols-[220px_1fr] lg:grid-cols-[268px_1fr]">
        <div
          className="ios-spec overflow-hidden rounded-card border border-white/10 p-6 text-center"
          style={{ background: 'radial-gradient(120% 120% at 30% 0%, rgba(0,245,212,0.16), rgba(22,25,43,0.6) 62%)' }}
        >
          <WatchtimeOrbit pct={completionPct} value={watchtimeValue} label={t('statsWatchtime')} />
          <p className="mt-4 text-[12.5px] text-ink-dim">
            {days >= 1
              ? t('statsHoursApprox', { n: Math.round(stats.minutes / 60).toLocaleString(locale) })
              : t('statsTitles')}
            {' · '}
            {total} {total === 1 ? t('entryOne') : t('entryMany')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile value={String(total)} label={t('statsTitles')} />
          <StatTile value={stats.episodes.toLocaleString(locale)} label={t('statsEpisodes')} />
          <StatTile
            value={stats.meanRating !== null ? stats.meanRating.toFixed(1) : '–'}
            label={t('statsAvgRating')}
          />
        </div>
      </div>

      {stats.byStatus.length > 0 && (
        <section className="mb-10">
          <SectionHead title={t('statsByStatus')} />
          <div className="ios-glass flex flex-col items-center gap-6 overflow-hidden rounded-card p-5 sm:flex-row">
            <StatusDonut rows={stats.byStatus} total={total} />
            <ul className="grid flex-1 grid-cols-2 gap-x-5 gap-y-2.5 sm:grid-cols-3">
              {stats.byStatus.map(({ status, count }) => (
                <li key={status} className="flex items-center gap-2 text-[13px] text-ink-dim">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: STATUS_FILL[status] }}
                  />
                  <span className="truncate">{t(STATUS_KEY[status])}</span>
                  <span className="ml-auto font-semibold tabular-nums text-ink">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:gap-10">
        {stats.genres.length > 0 && (
          <section>
            <SectionHead title={t('statsGenres')} />
            <GenreBars rows={stats.genres} />
          </section>
        )}

        {anyRatings && (
          <section>
            <SectionHead title={t('statsRatingDist')} />
            <div className="flex h-36 items-end gap-1.5">
              {stats.ratingDist.map((r) => {
                const isPeak = r.value > 0 && r.value === peakRating;
                return (
                  <div key={r.label} className="flex flex-1 flex-col items-center gap-1.5">
                    {r.value > 0 && (
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${isPeak ? 'text-pink' : 'text-ink-dim'}`}
                      >
                        {r.value}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-[5px] transition-[height] duration-500 ease-out"
                      style={{
                        height: r.value > 0 ? `${Math.max(8, (r.value / maxRatingCount) * 100)}%` : '3px',
                        background: isPeak
                          ? 'linear-gradient(180deg,#ff0055,#8a2be2)'
                          : r.value > 0
                            ? 'linear-gradient(180deg,#ffcf4d,rgba(255,207,77,0.25))'
                            : '#1e2338',
                        boxShadow: isPeak ? '0 0 20px -4px rgba(255,0,85,0.6)' : undefined,
                      }}
                    />
                    <span className="text-[11px] tabular-nums text-ink-faint">{r.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {stats.topYears.length > 1 && (
          <section>
            <SectionHead title={t('statsByYear')} />
            <GenreBars rows={stats.topYears} />
          </section>
        )}
      </div>
    </div>
  );
}
