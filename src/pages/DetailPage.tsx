import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDetail, fetchFranchise, type Franchise } from '@/api/anilist';
import { bestTitle, cover, formatLabel, seasonLabel, type MediaCard } from '@/api/types';
import { cardQuery, type TitleQuery } from '@/api/tmdb';
import { useDisplayTitle } from '@/store/titles';
import { currentSeason, findEntryFor, STATUS_KEY, useLibrary, watchedEpisodes } from '@/store/library';
import { useToasts } from '@/store/toast';
import { useScreenTone } from '@/store/tone';
import { EpisodeStepper, RatingStrip } from '@/components/TrackControls';
import { AddPanel, buildFranchiseSeasons } from '@/components/AddPanel';
import { PosterRow } from '@/components/PosterCard';
import {
  ErrorBox,
  SectionHead,
  Btn,
  Tag,
  Ring,
  IconBtn,
  Sheet,
  StatusPicker,
  ConfirmDialog,
  ST_ICON,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import { useSettings, useT } from '@/i18n';

const EMPTY_TITLE_QUERY: TitleQuery = { id: 0, romaji: null, english: null, isMovie: false, year: null };

type FxGroupKey = 'seasons' | 'movies' | 'specials';
interface FxItem {
  media: MediaCard;
  relationLabel?: string;
}

/** Franchise chronologisch in Staffeln / Filme / Specials aufteilen. */
function buildFxGroups(
  mainline: MediaCard[],
  extras: Franchise['extras'],
): Record<FxGroupKey, FxItem[]> {
  const byYear = (a: FxItem, b: FxItem) =>
    (a.media.seasonYear ?? a.media.startDate?.year ?? 9999) -
    (b.media.seasonYear ?? b.media.startDate?.year ?? 9999);
  const seasons: FxItem[] = mainline.filter((m) => m.format !== 'MOVIE').map((media) => ({ media }));
  const movies: FxItem[] = [
    ...mainline.filter((m) => m.format === 'MOVIE').map((media) => ({ media })),
    ...extras.filter((x) => x.media.format === 'MOVIE').map((x) => ({ media: x.media, relationLabel: x.relation })),
  ].sort(byYear);
  const specials: FxItem[] = extras
    .filter((x) => x.media.format !== 'MOVIE')
    .map((x) => ({ media: x.media, relationLabel: x.relation }))
    .sort(byYear);
  return { seasons, movies, specials };
}

const FX_GROUP_ICON: Record<FxGroupKey, 'stack' | 'film' | 'sparkle'> = {
  seasons: 'stack',
  movies: 'film',
  specials: 'sparkle',
};

/** Info-Block zu einer angeklickten Staffel/Film/Special. */
function FxInfo({
  item,
  currentId,
  entry,
  tone,
  lang,
}: {
  item: FxItem;
  currentId: number;
  entry: ReturnType<typeof findEntryFor>;
  tone: string;
  lang: 'de' | 'en';
}) {
  const t = useT();
  const m = item.media;
  const idxInEntry = entry ? entry.seasons.findIndex((s) => s.id === m.id) : -1;
  const watchedFlag = entry != null && idxInEntry !== -1 && idxInEntry < entry.seasonIndex;
  const line = [
    m.format ? formatLabel(m.format, lang) : 'TV',
    seasonLabel(m, lang) || (m.startDate?.year ? String(m.startDate.year) : null),
    m.episodes ? t('detEpisodesShort', { n: m.episodes }) : null,
    m.averageScore != null ? t('communityScorePct', { n: m.averageScore }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="fx__info" data-st={tone}>
      <span className="fx__info-art">{cover(m) && <img src={cover(m)!} alt="" />}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="fx__info-t">{bestTitle(m)}</div>
        <p className="fx__info-s">{line}</p>
        {(m.id === currentId || watchedFlag) && (
          <div style={{ marginTop: 8 }}>
            {m.id === currentId ? (
              <span className="tag" data-st={tone}>{t('youAreHere')}</span>
            ) : (
              <span className="rate" style={{ color: 'var(--gr-t)' }}>
                <Icon name="check" size={14} />
                {t('addUpTo')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Franchise-Zeitstrahl — Staffeln / Filme / Specials als eigene Gruppen. */
function FranchiseTimeline({
  groups,
  currentId,
  entry,
  tone,
  lang,
  onPick,
}: {
  groups: Record<FxGroupKey, FxItem[]>;
  currentId: number;
  entry: ReturnType<typeof findEntryFor>;
  tone: string;
  lang: 'de' | 'en';
  onPick: (media: MediaCard) => void;
}) {
  const t = useT();
  const all = [...groups.seasons, ...groups.movies, ...groups.specials];
  const [selId, setSelId] = useState<number>(
    all.some((it) => it.media.id === currentId) ? currentId : all[0]?.media.id ?? currentId,
  );
  const selected = all.find((it) => it.media.id === selId) ?? all[0];

  const GROUP_LABEL: Record<FxGroupKey, string> = {
    seasons: t('fbSeasons'),
    movies: t('fbMovies'),
    specials: t('extrasTitle'),
  };

  return (
    <div className="fx" data-st={tone}>
      {(['seasons', 'movies', 'specials'] as FxGroupKey[]).map((k) => {
        const items = groups[k];
        if (!items.length) return null;
        let tv = 0;
        return (
          <div className="fx__group" key={k}>
            <div className="fx__gh">
              <Icon name={FX_GROUP_ICON[k]} size={15} filled />
              <span>{GROUP_LABEL[k]}</span>
              <span className="fx__gn tnum">{items.length}</span>
            </div>
            <div className="fx__grid">
              {items.map((it) => {
                const m = it.media;
                if (k === 'seasons') tv += 1;
                const label = k === 'seasons' ? t('seasonN', { n: tv }) : bestTitle(m);
                const here = m.id === currentId;
                const sel = m.id === selId;
                const released = m.status === 'FINISHED' || m.status === 'RELEASING';
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`fx__tile${sel ? ' is-sel' : ''}${here ? ' is-here' : ''}`}
                    onClick={() => setSelId(m.id)}
                  >
                    <span className="fx__art">
                      {cover(m) && <img src={cover(m)!} alt="" className={released ? '' : 'fx__art--soon'} />}
                      {!released && <span className="fx__soon">{t('statusNotYet')}</span>}
                    </span>
                    <span className="fx__t">{label}</span>
                    {it.relationLabel && it.relationLabel !== 'Special' && (
                      <span className="fx__rel">{it.relationLabel}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {selected && (
        <FxInfo item={selected} currentId={currentId} entry={entry} tone={tone} lang={lang} />
      )}
      {selected && selected.media.id !== currentId && (
        <button
          type="button"
          className="btn btn--quiet btn--sm"
          style={{ marginTop: 10 }}
          onClick={() => onPick(selected.media)}
        >
          <span>{t('openEntry')}</span>
          <Icon name="arrow" size={15} />
        </button>
      )}
    </div>
  );
}

export function DetailPage() {
  const { id } = useParams();
  const mediaId = Number(id);
  const navigate = useNavigate();
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const entries = useLibrary((s) => s.entries);
  const entry = useMemo(() => findEntryFor(entries, mediaId), [entries, mediaId]);
  const addFranchise = useLibrary((s) => s.addFranchise);
  const setWatchedThrough = useLibrary((s) => s.setWatchedThrough);
  const setProgress = useLibrary((s) => s.setProgress);
  const setStatus = useLibrary((s) => s.setStatus);
  const removeEntry = useLibrary((s) => s.remove);
  const push = useToasts((s) => s.push);
  const [addMode, setAddMode] = useState<'watching' | 'completed' | null>(null);
  const [statusSheet, setStatusSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useScreenTone(entry?.status ?? 'watching');

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

  const fxGroups = useMemo(() => {
    const f = franchise.data;
    if (!f || f.mainline.length === 0) return null;
    return buildFxGroups(f.mainline, f.extras);
  }, [franchise.data]);
  const fxTotal = fxGroups
    ? fxGroups.seasons.length + fxGroups.movies.length + fxGroups.specials.length
    : 0;

  // Kennzahlen übers GANZE Franchise (nicht nur diese Staffel).
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
    const scores = main.map((m) => m.averageScore).filter((n): n is number => n != null);
    const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const minutes = released.reduce((s, m) => s + (m.episodes ?? 0) * (m.duration ?? 24), 0);
    return { episodes, seasons, movies, specials, score, minutes };
  }, [franchise.data]);

  const displayTitle = useDisplayTitle(
    q.data ? cardQuery(q.data) : EMPTY_TITLE_QUERY,
    q.data ? bestTitle(q.data) : '',
  );

  if (q.isError) {
    return (
      <div>
        <ErrorBox onRetry={() => q.refetch()} />
      </div>
    );
  }

  if (q.isLoading || !q.data) {
    return (
      <div>
        <div className="skel" style={{ height: 190, margin: '-14px -16px 0' }} />
        <div className="det__head">
          <div className="skel det__cover" />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 28, width: '66%', borderRadius: 8 }} />
            <div className="skel" style={{ height: 14, width: '33%', marginTop: 10, borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  const m = q.data;
  const img = cover(m);
  const season = entry ? currentSeason(entry) : undefined;
  const trailerUrl =
    m.trailer?.site === 'youtube' && m.trailer.id ? `https://www.youtube.com/watch?v=${m.trailer.id}` : null;
  const showStepper = entry && (entry.status === 'watching' || entry.status === 'nextup');
  const hideTrailer = entry && (entry.status === 'watching' || entry.status === 'completed');
  const pct = entry && season?.episodes ? Math.min(1, entry.progress / season.episodes) : 0;
  const seasonNo = entry ? entry.seasonIndex + 1 : 1;

  function confirmWatchlist() {
    const seasons = buildFranchiseSeasons(m, franchise.data);
    const created = addFranchise({ seasons, genres: m.genres, status: 'planned', watchedThrough: 0 });
    if (created) push(t('addedToast', { s: t(STATUS_KEY[created.status]) }));
  }

  function pickSeason(picked: MediaCard) {
    if (!entry) {
      if (picked.id !== mediaId) navigate(`/anime/${picked.id}`);
      return;
    }
    const idx = entry.seasons.findIndex((s) => s.id === picked.id);
    if (idx >= 0) {
      setWatchedThrough(entry.rootId, idx);
      push(t('addedToast', { s: t(STATUS_KEY[entry.status]) }));
    } else if (picked.id !== mediaId) {
      navigate(`/anime/${picked.id}`);
    }
  }

  const airStatusLabel =
    m.status === 'FINISHED'
      ? t('statusFinished')
      : m.status === 'RELEASING'
        ? t('statusReleasing')
        : m.status === 'NOT_YET_RELEASED'
          ? t('statusNotYet')
          : '—';
  const facts: Array<[string, string]> = [
    [t('studio'), m.studios.nodes.find((s) => s.isAnimationStudio)?.name ?? m.studios.nodes[0]?.name ?? '—'],
    [t('detAirDate'), seasonLabel(m, lang) ?? '—'],
    [t('detEpisodesLabel'), m.episodes ? String(m.episodes) : '—'],
    [t('detRuntime'), m.duration ? `${m.duration} Min` : '—'],
    [t('detAirStatus'), airStatusLabel],
    [t('genres'), m.genres.slice(0, 2).join(', ') || '—'],
  ];

  const tone = entry?.status ?? 'watching';

  return (
    <div data-st={tone}>
      <div className="det__banner">
        {(m.bannerImage || img) && <img src={m.bannerImage ?? img!} alt="" />}
        <div className="det__back">
          <IconBtn name="left" label={t('back')} onClick={() => navigate(-1)} />
        </div>
        {entry && (
          <div className="det__del">
            <IconBtn name="trash" label={t('removeRowTitle')} onClick={() => setConfirmDelete(true)} />
          </div>
        )}
      </div>

      <div className="det__head">
        <span className="det__cover">{img && <img src={img} alt="" />}</span>
        <div className="det__headbody">
          {entry ? <Tag status={entry.status} /> : null}
          <h1 className="det__t" style={{ marginTop: 8 }}>
            {displayTitle}
          </h1>
          <div className="det__facts">
            <span>{m.format ? formatLabel(m.format, lang) : 'TV'}</span>
            <span>{seasonLabel(m, lang) ?? '—'}</span>
            {m.episodes ? <span>{t('detEpisodesShort', { n: m.episodes })}</span> : null}
            {m.averageScore != null ? <span>{t('communityScorePct', { n: m.averageScore })}</span> : null}
          </div>
        </div>
      </div>

      <div className="det__acts">
        {entry ? (
          <>
            {entry.status === 'completed' ? (
              <Btn
                variant="primary"
                ico="refresh"
                filled={false}
                onClick={() => {
                  setProgress(entry.rootId, 0);
                  setStatus(entry.rootId, 'watching');
                }}
              >
                {t('rewatchBtn')}
              </Btn>
            ) : (
              <Btn variant="primary" ico="play" onClick={() => setProgress(entry.rootId, entry.progress + 1)}>
                {entry.progress > 0 ? t('continueWithEp', { n: entry.progress + 1 }) : t('startNow')}
              </Btn>
            )}
            <Btn variant="quiet" ico={ST_ICON[entry.status]} filled={false} onClick={() => setStatusSheet(true)}>
              {t('changeStatusBtn')}
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="primary" ico="bookmark" filled={false} onClick={confirmWatchlist}>
              {t('stPlanned')}
            </Btn>
            <Btn
              variant="quiet"
              ico="play"
              filled={false}
              onClick={() => setAddMode((v) => (v === 'watching' ? null : 'watching'))}
            >
              {t('addWatchingBtn')}
            </Btn>
            <Btn
              variant="quiet"
              ico="seal"
              filled={false}
              onClick={() => setAddMode((v) => (v === 'completed' ? null : 'completed'))}
            >
              {t('stCompleted')}
            </Btn>
          </>
        )}
        {trailerUrl && !hideTrailer && (
          <a href={trailerUrl} target="_blank" rel="noreferrer" className="btn btn--quiet">
            <span>{t('trailer')}</span>
          </a>
        )}
      </div>

      {!entry && addMode && (
        <AddPanel
          detail={m}
          franchise={franchise.data}
          loading={franchise.isLoading}
          mode={addMode}
          onClose={() => setAddMode(null)}
        />
      )}

      {entry && showStepper && (
        <div className="det__prog">
          <Ring pct={pct} size={54} w={5} label={`${Math.round(pct * 100)}%`} />
          <div className="det__progtext">
            <div style={{ fontSize: 14, fontWeight: 650, letterSpacing: '-0.02em' }}>
              {t('seasonN', { n: seasonNo })} · {t('episodeXofY', { p: entry.progress, t: season?.episodes ?? '?' })}
            </div>
            <div className="muted" style={{ marginTop: 2 }}>
              {t('detFranchiseEpisodes', { n: watchedEpisodes(entry) })}
            </div>
          </div>
          <EpisodeStepper rootId={entry.rootId} />
        </div>
      )}

      {entry && (
        <>
          <SectionHead title={t('yourRating')} tone="completed" />
          <RatingStrip rootId={entry.rootId} />
        </>
      )}

      {franchise.isLoading ? (
        <div style={{ marginTop: 26 }}>
          <SectionHead title={t('franchiseTimeline')} />
          <div className="skel" style={{ height: 120 }} />
        </div>
      ) : fxGroups && fxTotal > 1 ? (
        <>
          <SectionHead title={t('franchiseTimeline')} tone={tone} count={fxTotal} />
          <FranchiseTimeline
            groups={fxGroups}
            currentId={mediaId}
            entry={entry}
            tone={tone}
            lang={lang}
            onPick={pickSeason}
          />
        </>
      ) : null}

      {fb && (
        <>
          <SectionHead title={t('franchiseBox')} tone={tone} />
          <dl className="factgrid">
            {fb.score != null && (
              <div>
                <dt>{t('fbScore')}</dt>
                <dd>{(fb.score / 10).toFixed(1)} / 10</dd>
              </div>
            )}
            {fb.episodes > 0 && (
              <div>
                <dt>{t('fbEpisodes')}</dt>
                <dd className="tnum">{fb.episodes}</dd>
              </div>
            )}
            {fb.seasons > 0 && (
              <div>
                <dt>{t('fbSeasons')}</dt>
                <dd className="tnum">{fb.seasons}</dd>
              </div>
            )}
            {fb.movies > 0 && (
              <div>
                <dt>{t('fbMovies')}</dt>
                <dd className="tnum">{fb.movies}</dd>
              </div>
            )}
            {fb.specials > 0 && (
              <div>
                <dt>{t('fbSpecials')}</dt>
                <dd className="tnum">{fb.specials}</dd>
              </div>
            )}
            {fb.minutes > 0 && (
              <div>
                <dt>{t('fbRuntime')}</dt>
                <dd className="tnum">{Math.round(fb.minutes / 60)} h</dd>
              </div>
            )}
          </dl>
        </>
      )}

      <SectionHead title={t('thisSeasonBox')} tone={tone} />
      <dl className="factgrid">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {recommendations.length > 0 && (
        <>
          <SectionHead title={t('recsTitle')} tone="nextup" />
          <PosterRow items={recommendations} />
        </>
      )}

      {entry && statusSheet && (
        <Sheet title={t('changeStatusBtn')} onClose={() => setStatusSheet(false)}>
          <StatusPicker
            current={entry.status}
            onPick={(s) => {
              setStatusSheet(false);
              if (s !== entry.status) {
                setStatus(entry.rootId, s);
                push(t('addedToast', { s: t(STATUS_KEY[s]) }));
              }
            }}
          />
        </Sheet>
      )}

      {entry && confirmDelete && (
        <ConfirmDialog
          title={t('removeConfirm')}
          message={t('removeRowSub')}
          confirmLabel={t('remove')}
          cancelLabel={t('cancel')}
          danger
          onConfirm={() => {
            removeEntry(entry.rootId);
            push(t('removedToast'));
            setConfirmDelete(false);
            navigate('/bibliothek');
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
