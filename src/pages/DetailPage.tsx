import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDetail, fetchFranchise, type Franchise } from '@/api/anilist';
import { bestTitle, cover, formatLabel, seasonLabel, type MediaCard } from '@/api/types';
import { cardQuery, type TitleQuery } from '@/api/tmdb';
import { useDisplayDescription, useDisplayTitle } from '@/store/titles';
import {
  findEntryFor,
  isReleased,
  useLibrary,
  type LibraryEntry,
} from '@/store/library';
import { EpisodeStepper, QuickActions, RatingStrip } from '@/components/TrackControls';
import { AddPanel } from '@/components/AddPanel';
import { PosterRow } from '@/components/PosterCard';
import { ErrorBox, SectionHead } from '@/components/ui';
import { useLocale, useSettings, useT, type DictKey } from '@/i18n';
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconFilm,
  IconPlay,
  IconPlus,
  IconSparkle,
  IconStack,
} from '@/components/icons';

const AIR_STATUS_KEY: Record<string, DictKey> = {
  FINISHED: 'statusFinished',
  RELEASING: 'statusReleasing',
  NOT_YET_RELEASED: 'statusNotYet',
  CANCELLED: 'statusCancelled',
  HIATUS: 'statusHiatus',
};

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Erste noch nicht komplett geschaute Staffel des Eintrags. */
function watchedUpTo(entry: LibraryEntry): number {
  const cur = entry.seasons[entry.seasonIndex];
  if (cur && isReleased(cur) && cur.episodes !== null && entry.progress >= cur.episodes) {
    return entry.seasonIndex + 1;
  }
  return entry.seasonIndex;
}

type FxGroupKey = 'seasons' | 'movies' | 'specials';
interface FxItem {
  media: MediaCard;
  relationLabel?: string;
}

function buildFxGroups(mainline: MediaCard[], extras: Franchise['extras']): Record<FxGroupKey, FxItem[]> {
  const seasons = mainline.filter((m) => m.format !== 'MOVIE').map((media) => ({ media }));
  const movieMain = mainline.filter((m) => m.format === 'MOVIE').map((media) => ({ media }));
  const movieExtra = extras
    .filter((x) => x.media.format === 'MOVIE')
    .map((x) => ({ media: x.media, relationLabel: x.relation }));
  const specials = extras
    .filter((x) => x.media.format !== 'MOVIE')
    .map((x) => ({ media: x.media, relationLabel: x.relation }));
  return { seasons, movies: [...movieMain, ...movieExtra], specials };
}

/**
 * Franchise-Akkordeon: erst die Übersicht (in der Aside daneben), dann Staffeln
 * / Filme / Specials als eigene Gruppen zum Aufklappen. Auswahl eines Eintrags
 * zeigt seine Infos in der rechten Spalte statt eines langen, flachen Strahls.
 */
function FranchiseAccordion({
  mainline,
  extras,
  currentId,
  entry,
}: {
  mainline: MediaCard[];
  extras: Franchise['extras'];
  currentId: number;
  entry: LibraryEntry | undefined;
}) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const groups = useMemo(() => buildFxGroups(mainline, extras), [mainline, extras]);
  const allItems = useMemo(
    () => [...groups.seasons, ...groups.movies, ...groups.specials],
    [groups],
  );
  const defaultOpen: FxGroupKey = groups.seasons.length ? 'seasons' : groups.movies.length ? 'movies' : 'specials';
  const [openGroups, setOpenGroups] = useState<Set<FxGroupKey>>(() => new Set([defaultOpen]));
  const [selectedId, setSelectedId] = useState<number>(
    allItems.some((it) => it.media.id === currentId) ? currentId : (allItems[0]?.media.id ?? currentId),
  );

  if (allItems.length < 2) return null;

  const upTo = entry ? watchedUpTo(entry) : 0;
  const selected = allItems.find((it) => it.media.id === selectedId) ?? allItems[0];

  const toggle = (k: FxGroupKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const GROUP_META: Record<FxGroupKey, { label: string; Icon: typeof IconStack; cls: string }> = {
    seasons: { label: t('fbSeasons'), Icon: IconStack, cls: 'bg-accent/15 text-accent' },
    movies: { label: t('fbMovies'), Icon: IconFilm, cls: 'bg-purple/15 text-purple' },
    specials: { label: t('extrasTitle'), Icon: IconSparkle, cls: 'bg-pink/15 text-pink' },
  };

  const badgeFor = (media: MediaCard) => {
    const idxInEntry = entry ? entry.seasons.findIndex((s) => s.id === media.id) : -1;
    const watchedFlag = idxInEntry !== -1 && idxInEntry < upTo;
    const isCurrent = entry && idxInEntry === entry.seasonIndex && entry.status === 'watching';
    if (watchedFlag) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-semibold text-green">
          <IconCheck className="h-3 w-3" />
          {t('addUpTo')}
        </span>
      );
    }
    if (isCurrent) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
          {t('stWatching')}
        </span>
      );
    }
    if (media.id === currentId) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
          {t('youAreHere')}
        </span>
      );
    }
    return null;
  };

  return (
    <section className="mb-10">
      <SectionHead title={t('franchiseTimeline')} count={allItems.length} />
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          {(['seasons', 'movies', 'specials'] as FxGroupKey[]).map((k) => {
            const items = groups[k];
            if (!items.length) return null;
            const meta = GROUP_META[k];
            const open = openGroups.has(k);
            return (
              <div key={k} className="mb-2.5 overflow-hidden rounded-card border border-line bg-surface">
                <button
                  type="button"
                  onClick={() => toggle(k)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${meta.cls}`}>
                    <meta.Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{meta.label}</span>
                    <span className="block text-xs text-ink-faint">{t('entriesCount', { n: items.length })}</span>
                  </span>
                  <IconChevronDown
                    className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {/* Auf dem Handy ein umbrechendes Raster statt einer
                    horizontal scrollenden Reihe — bei vielen Einträgen
                    (Staffeln, Filme, Specials) sonst nicht mehr vollständig
                    erreichbar. Ab `sm:` bleibt die kompakte Scroll-Reihe. */}
                {open && (
                  <div className="unfold grid grid-cols-3 gap-2.5 px-4 pb-4 sm:flex sm:gap-3 sm:overflow-x-auto">
                    {items.map((it, i) => {
                      const isSel = it.media.id === selectedId;
                      return (
                        <button
                          key={it.media.id}
                          type="button"
                          onClick={() => setSelectedId(it.media.id)}
                          style={{ ['--i' as string]: Math.min(i, 12) }}
                          className={`stagger-in w-full rounded-[12px] border-2 p-1.5 text-left transition-colors duration-150 sm:w-24 sm:shrink-0 ${
                            isSel ? 'border-accent bg-accent/5' : 'border-transparent hover:border-line'
                          }`}
                        >
                          <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-[8px] bg-raised">
                            {cover(it.media) && (
                              <img src={cover(it.media)!} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span
                            className={`mt-1.5 block truncate text-[11.5px] ${isSel ? 'font-semibold text-ink' : 'text-ink-dim'}`}
                          >
                            {k === 'seasons'
                              ? t('seasonN', { n: groups.seasons.indexOf(it) + 1 })
                              : bestTitle(it.media)}
                          </span>
                          {it.relationLabel && (
                            <span className="block truncate text-[10px] text-ink-faint">
                              {it.relationLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selected && (
          <aside className="hidden h-fit rounded-card border border-line bg-surface p-4 lg:block">
            <span className="mb-3.5 block aspect-[2/3] w-full max-w-[160px] overflow-hidden rounded-card bg-raised">
              {cover(selected.media) && (
                <img src={cover(selected.media)!} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            <h4 className="font-display text-base font-semibold leading-snug text-ink">
              {bestTitle(selected.media)}
            </h4>
            <p className="mt-1.5 text-xs leading-6 text-ink-dim">
              {[
                selected.media.format ? formatLabel(selected.media.format, lang) : null,
                seasonLabel(selected.media, lang),
                selected.media.episodes ? `${selected.media.episodes} Ep.` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              {selected.media.averageScore != null && (
                <>
                  <br />Ø {(selected.media.averageScore / 10).toFixed(1)} / 10
                </>
              )}
            </p>
            <div className="mt-3">{badgeFor(selected.media)}</div>
            {selected.media.id !== currentId && (
              <Link
                to={`/anime/${selected.media.id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity duration-150 hover:opacity-80"
              >
                {t('openEntry')}
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

const EMPTY_TITLE_QUERY: TitleQuery = { id: 0, romaji: null, english: null, isMovie: false, year: null };

export function DetailPage() {
  const { id } = useParams();
  const mediaId = Number(id);
  const navigate = useNavigate();
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const locale = useLocale();
  const entries = useLibrary((s) => s.entries);
  const entry = useMemo(() => findEntryFor(entries, mediaId), [entries, mediaId]);
  const [addOpen, setAddOpen] = useState(false);

  const q = useQuery({
    queryKey: ['detail', mediaId],
    enabled: Number.isFinite(mediaId),
    queryFn: ({ signal }) => fetchDetail(mediaId, signal),
  });

  const franchise = useQuery({
    queryKey: ['franchise', mediaId],
    enabled: q.isSuccess,
    queryFn: ({ signal }) => fetchFranchise(mediaId, signal),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const recommendations = useMemo(
    () =>
      (q.data?.recommendations.nodes ?? [])
        .map((n) => n.mediaRecommendation)
        .filter((m): m is MediaCard => m !== null && !m.isAdult)
        .slice(0, 12),
    [q.data],
  );

  // Anime-bezogene Kennzahlen übers ganze Franchise (nicht nur diese Staffel).
  const fb = useMemo(() => {
    const f = franchise.data;
    if (!f || f.mainline.length === 0) return null;
    const main = f.mainline;
    const released = main.filter((m) => m.status === 'FINISHED' || m.status === 'RELEASING');
    const episodes = released.reduce((s, m) => s + (m.episodes ?? 0), 0);
    const seasons = main.filter((m) => m.format !== 'MOVIE').length;
    const movies =
      main.filter((m) => m.format === 'MOVIE').length +
      f.extras.filter((x) => x.media.format === 'MOVIE').length;
    const specials = f.extras.filter(
      (x) => x.media.format === 'SPECIAL' || x.media.format === 'OVA',
    ).length;
    const scores = main
      .map((m) => m.averageScore)
      .filter((n): n is number => n != null);
    const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const minutes = released.reduce((s, m) => s + (m.episodes ?? 0) * (m.duration ?? 24), 0);
    return { episodes, seasons, movies, specials, score, minutes };
  }, [franchise.data]);

  // Vor den frühen Returns aufrufen (Rules of Hooks): deutscher Anzeigename +
  // deutsche Beschreibung, solange Daten fehlen mit neutraler Anfrage.
  const sanitizedDescription = q.data?.description
    ? q.data.description
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{2,}/g, '\n\n')
        .trim()
    : null;
  const displayTitle = useDisplayTitle(
    q.data ? cardQuery(q.data) : EMPTY_TITLE_QUERY,
    q.data ? bestTitle(q.data) : '',
  );
  const displayDescription = useDisplayDescription(
    q.data ? cardQuery(q.data) : EMPTY_TITLE_QUERY,
    sanitizedDescription,
  );

  if (q.isError) {
    return (
      <div className="pt-6">
        <ErrorBox onRetry={() => q.refetch()} />
      </div>
    );
  }

  if (q.isLoading || !q.data) {
    return (
      <div>
        <div className="skeleton h-52 w-full" />
        <div className="mt-6 flex gap-6">
          <div className="skeleton hidden h-[264px] w-[176px] shrink-0 sm:block" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-9 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-24 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  const m = q.data;
  const img = cover(m);
  const studios = [...new Set(m.studios.nodes.filter((s) => s.isAnimationStudio).map((s) => s.name))];
  const trailerUrl =
    m.trailer?.site === 'youtube' && m.trailer.id
      ? `https://www.youtube.com/watch?v=${m.trailer.id}`
      : null;
  const showStepper =
    entry && (entry.status === 'watching' || entry.status === 'paused' || entry.status === 'nextup');

  return (
    <div className="-mt-5 md:-mt-8">
      {/* Banner bleeds to the content edges; content overlaps it. */}
      <div className="relative -mx-4 h-44 overflow-hidden sm:-mx-6 sm:h-56">
        {(m.bannerImage || img) && (
          <img
            src={m.bannerImage ?? img!}
            alt=""
            className={`h-full w-full object-cover ${m.bannerImage ? '' : 'scale-110 blur-xl'} opacity-60`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-bg/70 py-1.5 pl-2 pr-3.5 text-sm font-medium text-ink backdrop-blur transition-colors duration-150 hover:bg-bg"
        >
          <IconChevronLeft className="h-4 w-4" />
          {t('back')}
        </button>
      </div>

      <div className="relative z-10 -mt-16 flex flex-col gap-6 sm:flex-row">
        <div className="w-[132px] shrink-0 overflow-hidden rounded-card border border-line shadow-2xl sm:w-[176px]">
          {img && <img src={img} alt="" className="aspect-[2/3] w-full object-cover" />}
        </div>

        <div className="min-w-0 flex-1 sm:pt-16">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {displayTitle}
          </h1>
          {m.title.romaji && m.title.english && m.title.romaji !== m.title.english && (
            <p className="mt-1 text-sm text-ink-dim">{m.title.romaji}</p>
          )}
          <p className="mt-2 text-sm text-ink-dim">
            {[
              m.format ? formatLabel(m.format, lang) : null,
              seasonLabel(m, lang),
              m.episodes ? t('episodesN', { n: m.episodes }) : null,
              m.status ? t(AIR_STATUS_KEY[m.status]) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {entry ? (
              <QuickActions rootId={entry.rootId} />
            ) : (
              <button
                type="button"
                onClick={() => setAddOpen((v) => !v)}
                aria-expanded={addOpen}
                className="inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]"
              >
                <IconPlus className="h-4 w-4" />
                {t('add')}
              </button>
            )}
            {showStepper && <EpisodeStepper rootId={entry.rootId} />}
            {trailerUrl && (
              <a
                href={trailerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-ctl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-accent"
              >
                <IconPlay className="h-4 w-4" />
                {t('trailer')}
              </a>
            )}
          </div>

          {entry && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-ink-dim">{t('yourRating')}</span>
              <RatingStrip rootId={entry.rootId} />
            </div>
          )}
        </div>
      </div>

      {!entry && addOpen && (
        <AddPanel
          detail={m}
          franchise={franchise.data}
          loading={franchise.isLoading}
          onClose={() => setAddOpen(false)}
        />
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_280px]">
        <div className="order-2 min-w-0 lg:order-1">
          {displayDescription && (
            <section className="mb-10 hidden lg:block">
              <SectionHead title={t('aboutTitle')} />
              <p
                className="max-w-[70ch] whitespace-pre-line text-[15px] leading-7 text-ink-dim"
                style={{ textWrap: 'pretty' }}
              >
                {displayDescription}
              </p>
            </section>
          )}

          {franchise.isLoading ? (
            <div className="mb-10">
              <SectionHead title={t('franchiseTimeline')} />
              <div className="space-y-3">
                <div className="skeleton h-[78px] w-full" />
                <div className="skeleton h-[78px] w-full" />
              </div>
            </div>
          ) : (
            franchise.data && (
              <FranchiseAccordion
                mainline={franchise.data.mainline}
                extras={franchise.data.extras}
                currentId={mediaId}
                entry={entry}
              />
            )
          )}

          {recommendations.length > 0 && (
            <section className="mb-10">
              <SectionHead title={t('recsTitle')} />
              <PosterRow items={recommendations} />
            </section>
          )}
        </div>

        <aside className="order-1 space-y-5 lg:order-2">
          {/* Anime-/Franchise-bezogene Box — über der Staffel-Box. */}
          {fb && (
            <div className="rounded-card border border-purple/30 bg-surface p-5">
              <p className="mb-3.5 text-[13px] font-semibold uppercase tracking-wide text-purple">
                {t('franchiseBox')}
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
                <Fact
                  label={t('fbScore')}
                  value={fb.score != null ? `${(fb.score / 10).toFixed(1)} / 10` : null}
                />
                <Fact label={t('fbEpisodes')} value={fb.episodes ? String(fb.episodes) : null} />
                <Fact label={t('fbSeasons')} value={fb.seasons ? String(fb.seasons) : null} />
                <Fact label={t('fbMovies')} value={fb.movies ? String(fb.movies) : null} />
                <Fact label={t('fbSpecials')} value={fb.specials ? String(fb.specials) : null} />
                <Fact
                  label={t('fbRuntime')}
                  value={
                    fb.minutes
                      ? `${Math.round(fb.minutes / 60).toLocaleString(locale)} h`
                      : null
                  }
                />
              </dl>
            </div>
          )}

          {/* Staffel-bezogene Box. */}
          <div className="rounded-card border border-line bg-surface p-5">
            <p className="mb-3.5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
              {t('thisSeasonBox')}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
              <Fact
                label={t('communityScore')}
                value={m.averageScore != null ? `${(m.averageScore / 10).toFixed(1)} / 10` : null}
              />
              <Fact label={t('studio')} value={studios.length ? studios.join(', ') : null} />
              <Fact label={t('epLength')} value={m.duration ? `${m.duration} min` : null} />
              <Fact
                label={t('period')}
                value={
                  m.startDate?.year
                    ? `${m.startDate.year}${m.endDate?.year && m.endDate.year !== m.startDate.year ? ` – ${m.endDate.year}` : ''}`
                    : null
                }
              />
              <Fact label={t('genres')} value={m.genres.length ? m.genres.join(', ') : null} />
              {m.nextAiringEpisode && (
                <Fact
                  label={t('nextEpisode')}
                  value={`${t('epShort')} ${m.nextAiringEpisode.episode} · ${new Date(m.nextAiringEpisode.airingAt * 1000).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}`}
                />
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
