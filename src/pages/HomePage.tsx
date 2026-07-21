import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { formatLabel } from '@/api/types';
import { entryQuery, useDisplayTitle } from '@/store/titles';
import { EmptyState, PageTitle, SectionHead } from '@/components/ui';
import { useSearchOverlay } from '@/components/searchStore';
import { useLocale, useSettings, useT } from '@/i18n';
import { IconCalendar, IconCheck, IconDice, IconFilm, IconPlay, IconSearch } from '@/components/icons';

type PanelKey = 'watching' | 'nextup' | 'planned';

/** Jedes Panel hat seine eigene Farbwelt für den Umschalter — Neon, Pink, Purple. */
const PANEL_STYLE: Record<
  PanelKey,
  { activeGrad: string; ring: string; text: string; dot: string; glow: string }
> = {
  watching: {
    activeGrad: 'linear-gradient(135deg, rgba(0,245,212,0.24), rgba(58,134,255,0.12))',
    ring: 'border-accent/60',
    text: 'text-accent',
    dot: 'bg-accent',
    glow: 'shadow-glow-accent',
  },
  nextup: {
    activeGrad: 'linear-gradient(135deg, rgba(255,0,85,0.24), rgba(138,43,226,0.13))',
    ring: 'border-pink/60',
    text: 'text-pink',
    dot: 'bg-pink',
    glow: 'shadow-glow-pink',
  },
  planned: {
    activeGrad: 'linear-gradient(135deg, rgba(138,43,226,0.24), rgba(58,134,255,0.13))',
    ring: 'border-purple/60',
    text: 'text-purple',
    dot: 'bg-purple',
    glow: 'shadow-glow-purple',
  },
};

const RING_R = 24;
const RING_C = 2 * Math.PI * RING_R;

/**
 * „Weiter schauen“ — Neon-Kino-Reihe: Cover als verwischter Hintergrund, scharfer
 * Poster-Ausschnitt, Fortschrittsring statt Balken, atmender Play-Button für die
 * schnelle +1-Episode.
 */
function ContinueCard({ entry }: { entry: LibraryEntry }) {
  const t = useT();
  const setProgress = useLibrary((s) => s.setProgress);
  const setStatus = useLibrary((s) => s.setStatus);
  const season = currentSeason(entry);
  const seasonNo = entry.seasonIndex + 1;
  const multi = entry.seasons.length > 1;
  const cov = entryCover(entry);
  const pct = season?.episodes ? Math.min(100, (entry.progress / season.episodes) * 100) : 0;
  const offset = RING_C - (pct / 100) * RING_C;
  const atMax = !!season?.episodes && entry.progress >= season.episodes;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));

  return (
    <div className="hover-lift relative flex min-h-[168px] items-center overflow-hidden rounded-card border border-accent/25 bg-surface">
      {cov && (
        <img
          src={cov}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-xl"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-surface/25" />
      <Link
        to={`/anime/${season?.id ?? entry.rootId}`}
        className="relative flex min-w-0 flex-1 items-center gap-4 p-4 sm:gap-5 sm:p-5"
      >
        <span className="relative block h-[132px] w-[94px] shrink-0 overflow-hidden rounded-[12px] bg-raised shadow-[0_14px_34px_-10px_rgba(0,0,0,0.65),0_0_0_2px_rgba(0,245,212,0.28)]">
          {cov && <img src={cov} alt="" className="h-full w-full object-cover" />}
          <button
            type="button"
            aria-label={t('markCompleteBtn')}
            title={t('markCompleteBtn')}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStatus(entry.rootId, 'completed');
            }}
            className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-bg/70 text-ink-dim backdrop-blur-sm transition-colors duration-150 hover:bg-green hover:text-bg active:scale-95"
          >
            <IconCheck className="h-3.5 w-3.5" />
          </button>
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-accent">
            {t('panelWatching')}
          </span>
          <span className="block truncate font-display text-[20px] font-semibold leading-tight text-ink sm:text-[22px]">
            {title}
          </span>
          <span className="mt-1.5 block truncate text-[14px] text-ink-dim">
            {multi && <>{t('seasonN', { n: seasonNo })} · </>}
            {season?.episodes
              ? t('continueWithEp', { n: Math.min(entry.progress + 1, season.episodes) })
              : t('episodesSeen', { n: entry.progress })}
          </span>
        </span>
      </Link>
      <div className="relative flex shrink-0 items-center gap-3 pr-4 sm:gap-4 sm:pr-5">
        <div className="relative h-14 w-14" aria-hidden>
          <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
            <circle cx="28" cy="28" r={RING_R} fill="none" stroke="currentColor" strokeWidth="5" className="text-line" />
            <circle
              cx="28"
              cy="28"
              r={RING_R}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={offset}
              className="text-accent transition-[stroke-dashoffset] duration-300 ease-out"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[11px] font-bold tabular-nums text-accent">
            {Math.round(pct)}%
          </span>
        </div>
        <button
          type="button"
          aria-label={t('continueWithEp', { n: entry.progress + 1 })}
          disabled={atMax}
          onClick={() => setProgress(entry.rootId, entry.progress + 1)}
          className="pulse-play grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-bg transition-transform duration-150 hover:scale-105 active:scale-95 disabled:animate-none disabled:opacity-40"
        >
          <IconPlay className="h-4 w-4 translate-x-[1px]" />
        </button>
      </div>
    </div>
  );
}

/**
 * „Noch zu schauen“ — Neuheiten-Regal: volles Poster, Pink-Glow, Ribbon. Die
 * Info-Zeile bricht jetzt um (statt abgeschnitten zu werden): klar erkennbar,
 * ob Film oder Staffel, plus Jahr und Bereit-Chip.
 */
function NextupCard({ entry }: { entry: LibraryEntry }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const setStatus = useLibrary((s) => s.setStatus);
  const season = currentSeason(entry);
  const cov = entryCover(entry);
  const isFilm = season?.format === 'MOVIE';
  const typeLabel = isFilm
    ? formatLabel('MOVIE', lang)
    : entry.seasons.length > 1
      ? t('seasonN', { n: entry.seasonIndex + 1 })
      : null;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));

  return (
    <Link to={`/anime/${season?.id ?? entry.rootId}`} className="tilt-card group block">
      <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-card border-2 border-pink/50 bg-raised shadow-[0_0_0_4px_rgba(255,0,85,0.12),0_18px_30px_-14px_rgba(255,0,85,0.5)]">
        {cov && <img src={cov} alt="" className="h-full w-full object-cover" />}
        <span
          className="absolute -left-1.5 top-2 bg-pink px-3 py-1 pl-3.5 text-[10.5px] font-extrabold tracking-wide text-ink shadow-[0_4px_10px_rgba(255,0,85,0.5)]"
          style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,8px 100%,0 70%)' }}
        >
          {t('newBadge')}
        </span>
        <button
          type="button"
          aria-label={t('watchNowBtn')}
          title={t('watchNowBtn')}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setStatus(entry.rootId, 'watching');
          }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-pink text-ink shadow-glow-pink transition-transform duration-150 active:scale-90"
        >
          <IconPlay className="h-3.5 w-3.5 translate-x-[1px]" />
        </button>
      </span>
      <span className="mt-2.5 block line-clamp-2 text-[14px] font-semibold leading-snug text-ink">
        {title}
      </span>
      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {typeLabel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[10.5px] font-semibold text-ink-dim">
            {isFilm && <IconFilm className="h-2.5 w-2.5" />}
            {typeLabel}
          </span>
        )}
        {season?.seasonYear && (
          <span className="rounded-full bg-raised px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-ink-dim">
            {season.seasonYear}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-pink/15 px-2 py-0.5 text-[10.5px] font-bold text-pink">
          <span className="h-1.5 w-1.5 rounded-full bg-pink" />
          {t('newSeasonReady')}
        </span>
      </span>
    </Link>
  );
}

/**
 * Watchlist — Netflix-Kachel: großes Poster, Titel auf einem Verlauf unten,
 * sanftes Heranzoomen beim Hover, Lesezeichen-Chip. Die „große Version“ von
 * „Noch zu schauen“, als Raster. Kennt zusätzlich den Zufallsroller-Zustand
 * (rollt gerade vorbei / ist die Auswahl gelandet).
 */
function PlannedCard({
  entry,
  rolling,
  picked,
  cardRef,
}: {
  entry: LibraryEntry;
  rolling?: boolean;
  picked?: boolean;
  cardRef?: (el: HTMLAnchorElement | null) => void;
}) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const setStatus = useLibrary((s) => s.setStatus);
  const totalEp = entry.seasons.reduce((s, x) => s + (x.episodes ?? 0), 0);
  const cov = entryCover(entry);
  const seasons = entry.seasons.length;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));

  const ringState = picked
    ? 'z-10 -translate-y-1 ring-2 ring-accent shadow-[0_0_0_6px_rgba(0,245,212,0.18),0_28px_50px_-16px_rgba(0,245,212,0.65)]'
    : rolling
      ? 'z-10 scale-[1.035] ring-2 ring-accent/80 shadow-[0_0_0_4px_rgba(0,245,212,0.14)]'
      : 'ring-1 ring-line hover:z-10 hover:-translate-y-1 hover:shadow-[0_26px_46px_-18px_rgba(138,43,226,0.55)] hover:ring-purple/60';

  return (
    <Link
      ref={cardRef}
      to={`/anime/${entry.seasons[0]?.id ?? entry.rootId}`}
      className={`group relative block aspect-[2/3] overflow-hidden rounded-card bg-raised shadow-[0_16px_34px_-20px_rgba(0,0,0,0.8)] transition-[transform,box-shadow] duration-300 ease-out ${ringState}`}
    >
      {cov && (
        <img
          src={cov}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-transparent" />
      <button
        type="button"
        aria-label={t('watchNowBtn')}
        title={t('watchNowBtn')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setStatus(entry.rootId, 'watching');
        }}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-bg/70 text-purple backdrop-blur-sm transition-colors duration-150 hover:bg-accent hover:text-bg active:scale-95"
      >
        <IconPlay className="h-3.5 w-3.5 translate-x-[1px]" />
      </button>
      <span className="absolute inset-x-0 bottom-0 p-3">
        <span className="block line-clamp-2 text-[14px] font-semibold leading-snug text-ink drop-shadow">
          {title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-dim">
          {seasons > 1 && (
            <span className="rounded-full bg-bg/60 px-1.5 py-0.5 font-semibold text-purple">
              {formatLabel('TV', lang)} ×{seasons}
            </span>
          )}
          <span>{totalEp ? t('episodesN', { n: totalEp }) : t('ongoing')}</span>
        </span>
        {picked && (
          <span className="pop-in mt-2 flex items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[11.5px] font-bold text-bg shadow-glow-accent">
            <IconPlay className="h-3 w-3" />
            {t('randomPickCta')}
          </span>
        )}
      </span>
    </Link>
  );
}

export function HomePage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const username = useLibrary((s) => s.username);
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

  // Zufallsroller (Watchlist): rollt sichtbar durch die Karten, wird
  // schrittweise langsamer und landet gezielt auf einem Zufallseintrag.
  const [roll, setRoll] = useState<{ highlightId: number | null; pickedId: number | null; rolling: boolean }>({
    highlightId: null,
    pickedId: null,
    rolling: false,
  });
  const rollTimer = useRef<number | null>(null);
  const plannedCardRefs = useRef(new Map<number, HTMLAnchorElement>());

  useEffect(() => () => {
    if (rollTimer.current) window.clearTimeout(rollTimer.current);
  }, []);

  function rollRandom() {
    const list = byStatus.planned;
    if (list.length === 0 || roll.rolling) return;
    if (rollTimer.current) window.clearTimeout(rollTimer.current);

    const targetIndex = Math.floor(Math.random() * list.length);
    const rounds = list.length > 1 ? 3 : 1;
    const totalSteps = rounds * list.length + targetIndex + 1;
    let step = 0;

    const tick = () => {
      const idx = step % list.length;
      const isLast = step === totalSteps - 1;
      setRoll({
        highlightId: list[idx].rootId,
        pickedId: isLast ? list[idx].rootId : null,
        rolling: !isLast,
      });
      step++;
      if (!isLast) {
        const progress = step / totalSteps;
        const delay = 45 + progress * progress * 240;
        rollTimer.current = window.setTimeout(tick, delay);
      } else {
        const el = plannedCardRefs.current.get(list[idx].rootId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    };
    tick();
  }

  return (
    <div>
      <PageTitle
        title={username ? `${greeting}, ${username}` : greeting}
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
          <div className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-3" role="tablist" aria-label="Home">
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
                  style={isActive ? { background: s.activeGrad } : undefined}
                  className={`press overflow-hidden rounded-card border px-2.5 py-3 text-left transition-all duration-200 sm:px-4 ${
                    isActive ? `${s.ring} ${s.glow}` : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                  }`}
                >
                  <span
                    className={`flex items-start gap-1.5 text-[10.5px] font-semibold uppercase leading-tight tracking-wide sm:gap-2 sm:text-[11px] sm:tracking-wide ${isActive ? s.text : 'text-ink-faint'}`}
                  >
                    <span className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                    <span className="sm:truncate">{label}</span>
                  </span>
                  <span
                    className={`mt-1 block font-display text-2xl font-semibold leading-none sm:text-3xl ${isActive ? 'text-ink' : 'text-ink-dim'}`}
                  >
                    {items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Aktives Panel — jedes mit eigenem Layout, nicht nur eigener Farbe. */}
          <section key={panel} className="panel-in mb-9">
            {active.items.length === 0 ? (
              <div className="overflow-hidden rounded-card border border-line bg-surface p-3 sm:p-4">
                <p className="px-2 py-8 text-center text-sm text-ink-dim">
                  {panel === 'watching'
                    ? t('panelEmptyWatching')
                    : panel === 'nextup'
                      ? t('panelEmptyNextup')
                      : t('panelEmptyPlanned')}
                </p>
              </div>
            ) : panel === 'watching' ? (
              <div className="space-y-3">
                {watching.slice(0, 8).map((e, i) => (
                  <div key={e.rootId} className="stagger-in" style={{ ['--i' as string]: i }}>
                    <ContinueCard entry={e} />
                  </div>
                ))}
              </div>
            ) : panel === 'nextup' ? (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                {byStatus.nextup.slice(0, 20).map((e, i) => (
                  <div key={e.rootId} className="stagger-in" style={{ ['--i' as string]: Math.min(i, 12) }}>
                    <NextupCard entry={e} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="mb-3.5 flex justify-end">
                  <button
                    type="button"
                    onClick={rollRandom}
                    disabled={roll.rolling}
                    className="inline-flex items-center gap-2 rounded-full border border-purple/40 bg-purple/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-purple transition-colors duration-150 hover:bg-purple/20 disabled:opacity-50"
                  >
                    <IconDice className={roll.rolling ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    {t('randomPickBtn')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {byStatus.planned.slice(0, 20).map((e, i) => (
                    <div key={e.rootId} className="stagger-in" style={{ ['--i' as string]: Math.min(i, 12) }}>
                      <PlannedCard
                        entry={e}
                        rolling={roll.rolling && roll.highlightId === e.rootId}
                        picked={roll.pickedId === e.rootId}
                        cardRef={(el) => {
                          if (el) plannedCardRefs.current.set(e.rootId, el);
                          else plannedCardRefs.current.delete(e.rootId);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {(airing.data?.length ?? 0) > 0 && (
            <section className="mb-9">
              <SectionHead title={t('simulcastTitle')} />
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
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
