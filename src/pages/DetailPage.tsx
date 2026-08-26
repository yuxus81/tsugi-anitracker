import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDetail, fetchFranchise } from '@/api/anilist';
import { bestTitle, cover, formatLabel, seasonLabel, type MediaCard } from '@/api/types';
import { cardQuery, type TitleQuery } from '@/api/tmdb';
import { AddSheet } from '@/components/AddSheet';
import { buildFranchiseSeasons } from '@/domain/franchise';
import { Icon } from '@/components/Icon';
import { MediaTile } from '@/components/MediaTile';
import {
  Button,
  EmptyState,
  IconButton,
  Pips,
  Ring,
  SectionHead,
  Stepper,
  Tag,
} from '@/components/kit';
import { ConfirmDialog, Sheet, StatusPicker } from '@/components/overlays';
import { seasonNo, seasonPct } from '@/domain/progress';
import { STATUS_THEME } from '@/domain/status';
import { useDisplayDescription, useDisplayTitle } from '@/store/titles';
import { useToasts } from '@/store/toast';
import {
  currentSeason,
  findEntryFor,
  releaseLabel,
  useLibrary,
  watchedEpisodes,
  type LibraryEntry,
  type WatchStatus,
} from '@/store/library';
import { useLocale, useSettings, useT, type DictKey } from '@/i18n';

/**
 * DIE DETAILSEITE.
 *
 * Der einzige Ort, an dem ein Franchise VOLLSTÄNDIG sichtbar wird: alle
 * Staffeln auf einem Zeitstrahl, Fortschritt, Wertung — und der Weg wieder
 * hinaus.
 *
 * Das Entfernen steht unten und allein, wie in nativen Apps. In der
 * Knopfreihe oben wäre es entweder zu leicht zu treffen, oder es bricht auf
 * dem Handy die Zeile um.
 */

const AIR_STATUS_KEY: Record<string, DictKey> = {
  FINISHED: 'statusFinished',
  RELEASING: 'statusReleasing',
  NOT_YET_RELEASED: 'statusNotYet',
  CANCELLED: 'statusCancelled',
  HIATUS: 'statusHiatus',
};

const EMPTY_TITLE_QUERY: TitleQuery = {
  id: 0,
  romaji: null,
  english: null,
  isMovie: false,
  year: null,
};

/** HTML aus AniList-Beschreibungen entfernen — sie kommen als Markup. */
function alsText(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

/** Eine Station des Franchise-Zeitstrahls. */
function LineItem({
  media,
  index,
  hier,
  entry,
  tone,
}: {
  media: MediaCard;
  index: number;
  hier: boolean;
  entry: LibraryEntry | undefined;
  tone: WatchStatus;
}) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const locale = useLocale();
  const bild = cover(media);

  // Die Staffel gilt als geschaut, wenn der Zeiger des Eintrags schon
  // dahinter steht.
  const idx = entry ? entry.seasons.findIndex((s) => s.id === media.id) : -1;
  const geschaut = idx !== -1 && idx < entry!.seasonIndex;

  return (
    <li className={`lineitem${hier ? ' is-here' : ''}`} data-st={tone} data-testid={`line-${media.id}`}>
      <Link to={`/anime/${media.id}`} className="lineitem__link">
        <span className="lineitem__art">
          {bild && <img src={bild} alt="" loading="lazy" decoding="async" />}
        </span>
        <span className="lineitem__body">
          <span className="lineitem__t">{t('seasonN', { n: index + 1 })}</span>
          <span className="lineitem__s">
            {[bestTitle(media), seasonLabel(media, lang) ?? releaseLabel(
              { startDate: media.startDate, season: media.season, seasonYear: media.seasonYear },
              locale,
            )]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        {hier ? (
          <Tag status={tone} text={t('youAreHere')} />
        ) : geschaut ? (
          <span className="lineitem__done" aria-label={t('stCompleted')}>
            <Icon name="check" size={15} />
          </span>
        ) : null}
      </Link>
    </li>
  );
}

export function DetailPage() {
  const { id } = useParams();
  const mediaId = Number(id);
  const navigate = useNavigate();
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const locale = useLocale();

  const entries = useLibrary((s) => s.entries);
  const eintrag = useMemo(() => findEntryFor(entries, mediaId), [entries, mediaId]);
  const setStatus = useLibrary((s) => s.setStatus);
  const setProgress = useLibrary((s) => s.setProgress);
  const setRating = useLibrary((s) => s.setRating);
  const remove = useLibrary((s) => s.remove);
  const push = useToasts((s) => s.push);

  const [blatt, setBlatt] = useState<'add' | 'status' | null>(null);
  const [loeschen, setLoeschen] = useState(false);

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

  const empfehlungen = useMemo(
    () =>
      (q.data?.recommendations.nodes ?? [])
        .map((n) => n.mediaRecommendation)
        .filter((m): m is MediaCard => m !== null && !m.isAdult)
        .slice(0, 12),
    [q.data],
  );

  // Vor den frühen Rückgaben (Hook-Regeln): deutscher Anzeigename und
  // deutsche Beschreibung, mit neutraler Anfrage solange Daten fehlen.
  const titel = useDisplayTitle(
    q.data ? cardQuery(q.data) : EMPTY_TITLE_QUERY,
    q.data ? bestTitle(q.data) : '',
  );
  const beschreibung = useDisplayDescription(
    q.data ? cardQuery(q.data) : EMPTY_TITLE_QUERY,
    alsText(q.data?.description),
  );

  if (q.isError) {
    return (
      <div className="panel errorbox" data-st="continuation">
        <p className="sub">{t('detailError')}</p>
        <Button icon="refresh" onClick={() => void q.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (q.isLoading || !q.data) {
    return (
      <>
        <div className="skel skel--banner" aria-hidden />
        <div className="skel skel--title" aria-hidden />
        <div className="skel skel--text" aria-hidden />
      </>
    );
  }

  const m = q.data;
  const bild = cover(m);
  const tone: WatchStatus = eintrag?.status ?? 'watching';
  const staffel = eintrag ? currentSeason(eintrag) : undefined;
  const hauptlinie = franchise.data?.mainline ?? [];
  const studio = m.studios.nodes.find((s) => s.isAnimationStudio)?.name ?? m.studios.nodes[0]?.name;
  const trailer =
    m.trailer?.site === 'youtube' && m.trailer.id
      ? `https://www.youtube.com/watch?v=${m.trailer.id}`
      : null;

  return (
    <div data-st={tone}>
      {/* ---- Banner ---------------------------------------------------- */}
      <div className="det__banner">
        {(m.bannerImage || bild) && <img src={m.bannerImage ?? bild!} alt="" decoding="async" />}
        <div className="det__back">
          <IconButton name="left" label={t('back')} onClick={() => navigate(-1)} />
        </div>
      </div>

      {/* ---- Kopf ------------------------------------------------------ */}
      <div className="det__head">
        <span className="det__cover">
          {bild && <img src={bild} alt="" decoding="async" />}
        </span>
        <div className="det__headbody">
          {eintrag && <Tag status={tone} />}
          <h1 className="det__t">{titel}</h1>
          <div className="det__facts">
            {m.format && <span>{formatLabel(m.format, lang)}</span>}
            <span>{seasonLabel(m, lang) ?? '—'}</span>
            {m.episodes && <span>{t('episodesN', { n: m.episodes })}</span>}
            {m.status && <span>{t(AIR_STATUS_KEY[m.status])}</span>}
          </div>
        </div>
      </div>

      {/* ---- Aktionen -------------------------------------------------- */}
      <div className="det__acts">
        {eintrag ? (
          <>
            {eintrag.status === 'completed' ? (
              <Button
                variant="primary"
                icon="refresh"
                onClick={() => {
                  setProgress(eintrag.rootId, 0);
                  setStatus(eintrag.rootId, 'watching');
                }}
              >
                {t('watchAgain')}
              </Button>
            ) : (
              <Button
                variant="primary"
                icon="play"
                onClick={() => setProgress(eintrag.rootId, eintrag.progress + 1)}
              >
                {eintrag.progress > 0
                  ? t('continueWithEp', { n: eintrag.progress + 1 })
                  : t('startNow')}
              </Button>
            )}
            <Button icon={STATUS_THEME[tone].icon} onClick={() => setBlatt('status')}>
              {t('changeStatus')}
            </Button>
          </>
        ) : (
          <Button variant="primary" icon="plus" onClick={() => setBlatt('add')}>
            {t('add')}
          </Button>
        )}
        {trailer && (
          <a href={trailer} target="_blank" rel="noreferrer" className="btn">
            <Icon name="play" size={18} filled />
            <span>{t('trailer')}</span>
          </a>
        )}
      </div>

      {/* ---- Fortschritt ----------------------------------------------- */}
      {eintrag && (
        <div className="det__prog" data-testid="progress">
          <Ring
            pct={seasonPct(eintrag)}
            size={54}
            width={5}
            label={`${Math.round(seasonPct(eintrag) * 100)}%`}
          />
          <div className="det__progtext">
            <div className="det__progline">
              {t('seasonN', { n: seasonNo(eintrag) })} · {t('epShort')} {eintrag.progress}/
              {staffel?.episodes ?? '?'}
            </div>
            <div className="muted">{t('episodesSeen', { n: watchedEpisodes(eintrag) })}</div>
          </div>
          <Stepper
            value={eintrag.progress}
            max={staffel?.episodes ?? null}
            onChange={(n) => setProgress(eintrag.rootId, n)}
            label={t('epShort')}
          />
        </div>
      )}

      {/* ---- Wertung ---------------------------------------------------- */}
      {eintrag && (
        <>
          <SectionHead title={t('yourRating')} />
          <Pips
            value={eintrag.rating}
            onChange={(n) => {
              setRating(eintrag.rootId, n);
              push(n ? t('ratingSetToast', { n }) : t('ratingClearedToast'));
            }}
          />
        </>
      )}

      {/* ---- Franchise-Zeitstrahl --------------------------------------- */}
      {/* Bei einer einzigen Staffel ist ein Zeitstrahl kein Zeitstrahl. */}
      {hauptlinie.length > 1 && (
        <>
          <SectionHead title={t('franchiseTimeline')} count={hauptlinie.length} />
          <ul className="line" data-testid="timeline">
            {hauptlinie.map((s, i) => (
              <LineItem
                key={s.id}
                media={s}
                index={i}
                hier={s.id === mediaId}
                entry={eintrag}
                tone={tone}
              />
            ))}
          </ul>
        </>
      )}

      {/* ---- Fakten ------------------------------------------------------ */}
      <SectionHead title={t('thisSeasonBox')} />
      <dl className="factgrid" data-testid="facts">
        <div>
          <dt>{t('studio')}</dt>
          <dd>{studio ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('period')}</dt>
          <dd>
            {releaseLabel(
              { startDate: m.startDate, season: m.season, seasonYear: m.seasonYear },
              locale,
            ) ?? '—'}
          </dd>
        </div>
        <div>
          <dt>{t('fbEpisodes')}</dt>
          <dd>{m.episodes ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('epLength')}</dt>
          <dd>{m.duration ? `${m.duration} min` : '—'}</dd>
        </div>
        <div>
          <dt>{t('communityScore')}</dt>
          <dd>{m.averageScore != null ? `${(m.averageScore / 10).toFixed(1)} / 10` : '—'}</dd>
        </div>
        <div>
          <dt>{t('genres')}</dt>
          <dd>{m.genres.slice(0, 3).join(', ') || '—'}</dd>
        </div>
      </dl>

      {/* ---- Worum es geht ----------------------------------------------- */}
      {beschreibung && (
        <>
          <SectionHead title={t('aboutTitle')} />
          <p className="sub det__text" data-testid="synopsis">
            {beschreibung}
          </p>
        </>
      )}

      {/* ---- Empfehlungen ------------------------------------------------ */}
      {empfehlungen.length > 0 && (
        <>
          <SectionHead title={t('recsTitle')} count={empfehlungen.length} />
          <div className="shelf shelf--wide">
            {empfehlungen.map((r) => (
              <MediaTile key={r.id} media={r} />
            ))}
          </div>
        </>
      )}

      {/* ---- Entfernen: unten und allein ---------------------------------- */}
      {eintrag && (
        <div className="group det__danger" data-st="planned">
          <button type="button" className="setrow" onClick={() => setLoeschen(true)}>
            <span className="setrow__ico" aria-hidden>
              <Icon name="trash" size={17} />
            </span>
            <span className="setrow__body">
              <span className="setrow__t is-danger">{t('remove')}</span>
              <span className="setrow__s">{t('removeHint')}</span>
            </span>
            <Icon name="right" size={16} />
          </button>
        </div>
      )}

      {/* ---- Ebenen ------------------------------------------------------ */}
      {blatt === 'add' && (
        <AddSheet
          seasons={buildFranchiseSeasons(m, franchise.data)}
          genres={m.genres}
          onClose={() => setBlatt(null)}
          onDone={() => setBlatt(null)}
        />
      )}

      {blatt === 'status' && eintrag && (
        <Sheet title={t('changeStatus')} onClose={() => setBlatt(null)}>
          <StatusPicker
            current={eintrag.status}
            onPick={(s) => {
              setBlatt(null);
              setStatus(eintrag.rootId, s);
            }}
          />
        </Sheet>
      )}

      {loeschen && eintrag && (
        <ConfirmDialog
          title={t('removeConfirm')}
          message={t('removeConfirmMessage', { t: titel })}
          confirmLabel={t('remove')}
          onConfirm={() => {
            remove(eintrag.rootId);
            push(t('removedToast'));
            setLoeschen(false);
            navigate(-1);
          }}
          onCancel={() => setLoeschen(false)}
        />
      )}

      {!eintrag && !q.isLoading && hauptlinie.length === 0 && franchise.isError && (
        <EmptyState status="continuation" title={t('detailError')} hint={t('retry')} />
      )}
    </div>
  );
}
