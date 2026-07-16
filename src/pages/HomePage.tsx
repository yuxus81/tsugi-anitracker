import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchManyByIds } from '@/api/anilist';
import {
  currentSeason,
  entriesByStatus,
  entryCover,
  entryTitle,
  useLibrary,
  type LibraryEntry,
} from '@/store/library';
import { EpisodeStepper } from '@/components/TrackControls';
import { EmptyState, PageTitle, SectionHead } from '@/components/ui';
import { useSearchOverlay } from '@/components/searchStore';
import { useLocale, useT } from '@/i18n';
import { IconCalendar, IconPlay, IconSearch } from '@/components/icons';

type PanelKey = 'watching' | 'nextup' | 'planned';

/** Jedes Panel hat seine eigene Farbwelt — Neon, Pink, Purple (V1-Palette). */
const PANEL_STYLE: Record<
  PanelKey,
  { grad: string; activeGrad: string; ring: string; text: string; dot: string; glow: string }
> = {
  watching: {
    grad: 'linear-gradient(135deg, rgba(0,245,212,0.10), rgba(58,134,255,0.06))',
    activeGrad: 'linear-gradient(135deg, rgba(0,245,212,0.22), rgba(58,134,255,0.12))',
    ring: 'border-accent/60',
    text: 'text-accent',
    dot: 'bg-accent',
    glow: 'shadow-glow-accent',
  },
  nextup: {
    grad: 'linear-gradient(135deg, rgba(255,0,85,0.10), rgba(138,43,226,0.06))',
    activeGrad: 'linear-gradient(135deg, rgba(255,0,85,0.22), rgba(138,43,226,0.12))',
    ring: 'border-pink/60',
    text: 'text-pink',
    dot: 'bg-pink',
    glow: 'shadow-glow-pink',
  },
  planned: {
    grad: 'linear-gradient(135deg, rgba(138,43,226,0.12), rgba(58,134,255,0.07))',
    activeGrad: 'linear-gradient(135deg, rgba(138,43,226,0.26), rgba(58,134,255,0.14))',
    ring: 'border-purple/60',
    text: 'text-purple',
    dot: 'bg-purple',
    glow: 'shadow-glow-purple',
  },
};

/** „Weiter schauen“-Zeile: Cover, nächste Episode, Stepper direkt dran. */
function ContinueCard({ entry }: { entry: LibraryEntry }) {
  const t = useT();
  const season = currentSeason(entry);
  const seasonNo = entry.seasonIndex + 1;
  const multi = entry.seasons.length > 1;

  return (
    <div className="hover-lift flex items-center gap-4 rounded-card border border-line bg-surface p-3 pr-4">
      <Link
        to={`/anime/${season?.id ?? entry.rootId}`}
        className="block h-[84px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-raised"
      >
        {entryCover(entry) && (
          <img src={entryCover(entry)!} alt="" className="h-full w-full object-cover" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/anime/${season?.id ?? entry.rootId}`}
          className="block truncate text-[15px] font-semibold text-ink hover:text-accent"
        >
          {entryTitle(entry)}
        </Link>
        <p className="mt-0.5 text-[13px] text-ink-dim">
          {multi && <span>{t('seasonN', { n: seasonNo })} · </span>}
          {season?.episodes
            ? t('continueWithEp', { n: Math.min(entry.progress + 1, season.episodes) })
            : t('episodesSeen', { n: entry.progress })}
        </p>
        <div className="mt-1.5 h-1 max-w-[220px] overflow-hidden rounded-full bg-raised">
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-out"
            style={{
              width: season?.episodes
                ? `${Math.min(100, (entry.progress / season.episodes) * 100)}%`
                : '0%',
            }}
          />
        </div>
      </div>
      <div className="shrink-0">
        <EpisodeStepper rootId={entry.rootId} />
      </div>
    </div>
  );
}

/** „Noch zu schauen“-Karte: neue Staffel liegt bereit. */
function NextupCard({ entry }: { entry: LibraryEntry }) {
  const t = useT();
  const navigate = useNavigate();
  const season = currentSeason(entry);
  return (
    <button
      type="button"
      onClick={() => navigate(`/anime/${season?.id ?? entry.rootId}`)}
      className="hover-lift flex w-full items-center gap-4 rounded-card border border-pink/25 bg-surface p-3 text-left transition-colors duration-150 hover:border-pink/60"
    >
      <span className="block h-[84px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-raised">
        {entryCover(entry) && (
          <img src={entryCover(entry)!} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">
          {entryTitle(entry)}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-dim">
          {entry.seasons.length > 1 ? `${t('seasonN', { n: entry.seasonIndex + 1 })} · ` : ''}
          {season?.title}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-pink/15 px-2.5 py-0.5 text-[11px] font-semibold text-pink">
          {t('newSeasonReady')}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-ctl bg-pink/90 px-3 py-2 text-[13px] font-bold text-ink shadow-glow-pink">
        <IconPlay className="h-4 w-4" />
        {t('startNow')}
      </span>
    </button>
  );
}

/** Watchlist-Zeile. */
function PlannedCard({ entry }: { entry: LibraryEntry }) {
  const t = useT();
  const navigate = useNavigate();
  const totalEp = entry.seasons.reduce((s, x) => s + (x.episodes ?? 0), 0);
  return (
    <button
      type="button"
      onClick={() => navigate(`/anime/${entry.seasons[0]?.id ?? entry.rootId}`)}
      className="hover-lift flex w-full items-center gap-4 rounded-card border border-line bg-surface p-3 text-left transition-colors duration-150 hover:border-purple/60"
    >
      <span className="block h-[62px] w-[44px] shrink-0 overflow-hidden rounded-[6px] bg-raised">
        {entryCover(entry) && (
          <img src={entryCover(entry)!} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{entryTitle(entry)}</span>
        <span className="text-xs text-ink-dim">
          {totalEp ? t('episodesN', { n: totalEp }) : t('ongoing')}
        </span>
      </span>
      <IconPlay className="h-5 w-5 shrink-0 text-purple" />
    </button>
  );
}

export function HomePage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  const locale = useLocale();
  const [panel, setPanel] = useState<PanelKey>('watching');

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);

  const releasingIds = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.status === 'watching' || e.status === 'planned' || e.status === 'nextup')
        .map((e) => currentSeason(e))
        .filter((s) => s?.airStatus === 'RELEASING')
        .map((s) => s!.id),
    [entries],
  );

  // Ein gebündelter Request für alles, was in der Bibliothek gerade läuft.
  const airing = useQuery({
    queryKey: ['airing', releasingIds.slice().sort().join(',')],
    enabled: hydrated && releasingIds.length > 0,
    queryFn: async ({ signal }) => {
      const cards = await fetchManyByIds(releasingIds, signal);
      return cards
        .filter((c) => c.nextAiringEpisode)
        .sort((a, b) => a.nextAiringEpisode!.airingAt - b.nextAiringEpisode!.airingAt);
    },
    staleTime: 30 * 60 * 1000,
  });

  const fmtAiring = (ts: number): string => {
    const d = new Date(ts * 1000);
    const today = new Date();
    const diffDays = Math.floor(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
        new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
        86_400_000,
    );
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 0) return `${t('today')}, ${time}`;
    if (diffDays === 1) return `${t('tomorrow')}, ${time}`;
    if (diffDays < 7) return `${d.toLocaleDateString(locale, { weekday: 'short' })}, ${time}`;
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return t('homeGreetingLate');
    if (h < 11) return t('homeGreetingMorning');
    if (h < 18) return t('homeGreetingDay');
    return t('homeGreetingEvening');
  })();

  const watching = byStatus.watching;
  const isEmpty = hydrated && Object.keys(entries).length === 0;

  const PANELS: Array<{ key: PanelKey; label: string; items: LibraryEntry[] }> = [
    { key: 'watching', label: t('panelWatching'), items: watching },
    { key: 'nextup', label: t('panelNextup'), items: byStatus.nextup },
    { key: 'planned', label: t('panelPlanned'), items: byStatus.planned },
  ];

  const active = PANELS.find((p) => p.key === panel)!;
  const style = PANEL_STYLE[panel];

  return (
    <div>
      <PageTitle
        title={greeting}
        sub={
          watching.length > 0
            ? t('homeSubWatching', {
                n: watching.length,
                plural: watching.length === 1 ? t('homeSubWatchingOne') : t('homeSubWatchingMany'),
              })
            : t('homeSubIdle')
        }
      />

      {isEmpty ? (
        <EmptyState
          title={t('emptyHomeTitle')}
          hint={t('emptyHomeHint')}
          action={
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110"
            >
              <IconSearch className="h-4 w-4" />
              {t('emptyHomeCta')}
            </button>
          }
        />
      ) : (
        <>
          {/* Panel-Umschalter: drei Farbwelten. */}
          <div
            className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-3"
            role="tablist"
            aria-label="Home"
          >
            {PANELS.map(({ key, label, items }) => {
              const s = PANEL_STYLE[key];
              const isActive = key === panel;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setPanel(key)}
                  style={{ background: isActive ? s.activeGrad : s.grad }}
                  className={`rounded-card border px-3 py-3 text-left transition-all duration-200 sm:px-4 ${
                    isActive ? `${s.ring} ${s.glow}` : 'border-line hover:border-ink-faint'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide sm:gap-2 ${isActive ? s.text : 'text-ink-faint'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className={`mt-1 block font-display text-2xl font-semibold leading-none sm:text-3xl ${isActive ? 'text-ink' : 'text-ink-dim'}`}>
                    {items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Aktives Panel. */}
          <section key={panel} className="panel-in mb-9">
            <div
              className="rounded-card border border-line p-3 sm:p-4"
              style={{ background: style.grad }}
            >
              {active.items.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-ink-dim">
                  {panel === 'watching'
                    ? t('panelEmptyWatching')
                    : panel === 'nextup'
                      ? t('panelEmptyNextup')
                      : t('panelEmptyPlanned')}
                </p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {active.items.slice(0, 10).map((e, i) => (
                    <div key={e.rootId} className="stagger-in" style={{ ['--i' as string]: i }}>
                      {panel === 'watching' ? (
                        <ContinueCard entry={e} />
                      ) : panel === 'nextup' ? (
                        <NextupCard entry={e} />
                      ) : (
                        <PlannedCard entry={e} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {(airing.data?.length ?? 0) > 0 && (
            <section className="mb-9">
              <SectionHead title={t('simulcastTitle')} />
              <ul className="divide-y divide-line rounded-card border border-line bg-surface">
                {airing.data!.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/anime/${c.id}`}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors duration-150 hover:bg-raised"
                    >
                      <IconCalendar className="h-4 w-4 shrink-0 text-accent" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {c.title.english ?? c.title.romaji}
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-ink-dim">
                        {t('epShort')} {c.nextAiringEpisode!.episode} ·{' '}
                        {fmtAiring(c.nextAiringEpisode!.airingAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
