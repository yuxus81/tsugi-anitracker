import { useMemo } from 'react';
import { useLibrary, STATUS_LABEL, STATUS_ORDER, type WatchStatus } from '@/store/library';
import { PageTitle, SectionHead, EmptyState } from '@/components/ui';

/**
 * Everything here is computed from the local library — zero network. Charts
 * follow the house dataviz rules: single-hue bars for magnitude, status colors
 * only for status (always with label + count, never color alone), text in ink
 * tokens, thin marks, no legend for single series.
 */

const STATUS_FILL: Record<WatchStatus, string> = {
  watching: 'oklch(0.72 0.17 155)',
  planned: 'oklch(0.72 0.12 250)',
  completed: 'oklch(0.66 0 0)',
  paused: 'oklch(0.78 0.14 80)',
  dropped: 'oklch(0.68 0.16 15)',
};

function StatTile({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface px-5 py-4">
      <p className="font-display text-[34px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-2 text-[13px] font-medium text-ink-dim">{label}</p>
      {detail && <p className="mt-0.5 text-xs text-ink-faint">{detail}</p>}
    </div>
  );
}

/** Horizontal bar list: label · track · value. Readable as a table, drawn as a chart. */
function BarList({ rows, unit }: { rows: Array<{ label: string; value: number }>; unit?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[110px_1fr_44px] items-center gap-3">
          <span className="truncate text-[13px] text-ink-dim">{r.label}</span>
          <span className="h-4 overflow-hidden rounded-[4px] bg-raised">
            <span
              className="block h-full rounded-[4px] bg-jade transition-[width] duration-300 ease-out"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right text-[13px] font-semibold tabular-nums text-ink">
            {r.value}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StatsPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);

  const stats = useMemo(() => {
    const all = Object.values(entries);
    const episodes = all.reduce((sum, e) => sum + e.progress, 0);
    const minutes = all.reduce((sum, e) => sum + e.progress * (e.duration ?? 24), 0);
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
      if (e.seasonYear) years.set(e.seasonYear, (years.get(e.seasonYear) ?? 0) + 1);
    }
    const topYears = [...years.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .sort((a, b) => a[0] - b[0])
      .map(([y, v]) => ({ label: String(y), value: v }));

    return { all, episodes, minutes, meanRating, genres, ratingDist, byStatus, topYears };
  }, [entries]);

  if (hydrated && stats.all.length === 0) {
    return (
      <div>
        <PageTitle title="Statistik" />
        <EmptyState
          title="Noch nichts zu zählen"
          hint="Sobald du Anime trackst, entsteht hier dein Profil: Sehzeit, Genres, Wertungen."
        />
      </div>
    );
  }

  const days = stats.minutes / 60 / 24;
  const total = stats.all.length;
  const maxRatingCount = Math.max(...stats.ratingDist.map((r) => r.value), 1);
  const anyRatings = stats.ratingDist.some((r) => r.value > 0);

  return (
    <div>
      <PageTitle title="Statistik" sub="Dein Archiv in Zahlen — komplett offline berechnet." />

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={String(total)} label="Titel im Archiv" />
        <StatTile value={stats.episodes.toLocaleString('de-DE')} label="Episoden gesehen" />
        <StatTile
          value={
            days >= 1 ? `${days.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tage` : `${Math.round(stats.minutes / 60)} Std.`
          }
          label="Sehzeit"
          detail={days >= 1 ? `≈ ${Math.round(stats.minutes / 60).toLocaleString('de-DE')} Stunden` : undefined}
        />
        <StatTile
          value={stats.meanRating !== null ? stats.meanRating.toFixed(1) : '–'}
          label="Ø deiner Wertungen"
        />
      </div>

      {stats.byStatus.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Nach Status" />
          <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-[4px]">
            {stats.byStatus.map(({ status, count }) => (
              <span
                key={status}
                className="h-full min-w-[4px]"
                style={{
                  width: `${(count / total) * 100}%`,
                  background: STATUS_FILL[status],
                }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {stats.byStatus.map(({ status, count }) => (
              <li key={status} className="flex items-center gap-2 text-[13px] text-ink-dim">
                <span
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: STATUS_FILL[status] }}
                />
                {STATUS_LABEL[status]}
                <span className="font-semibold tabular-nums text-ink">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        {stats.genres.length > 0 && (
          <section>
            <SectionHead title="Deine Genres" />
            <BarList rows={stats.genres} />
          </section>
        )}

        {anyRatings && (
          <section>
            <SectionHead title="Wertungsverteilung" />
            <div className="flex h-36 items-end gap-1.5">
              {stats.ratingDist.map((r) => (
                <div key={r.label} className="flex flex-1 flex-col items-center gap-1.5">
                  {r.value > 0 && (
                    <span className="text-[11px] font-semibold tabular-nums text-ink-dim">
                      {r.value}
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t-[4px] ${r.value > 0 ? 'bg-jade' : 'bg-raised'}`}
                    style={{
                      height: r.value > 0 ? `${Math.max(8, (r.value / maxRatingCount) * 100)}%` : '3px',
                    }}
                  />
                  <span className="text-[11px] tabular-nums text-ink-faint">{r.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {stats.topYears.length > 1 && (
          <section>
            <SectionHead title="Nach Erscheinungsjahr" />
            <BarList rows={stats.topYears} />
          </section>
        )}
      </div>
    </div>
  );
}
