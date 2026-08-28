import { Link } from 'react-router-dom';
import {
  currentSeason,
  entryCover,
  entryTitle,
  hasSequel,
  isReleased,
  watchedEpisodes,
  useLibrary,
  type LibraryEntry,
} from '@/store/library';
import { formatLabel, seasonLabel } from '@/api/types';
import { entryQuery, useDisplayTitle } from '@/store/titles';
import { useSettings, useT } from '@/i18n';
import { Icon } from './icons';
import { Tag } from './ui';

/**
 * DIE Karte. Eine Bauform, fünf Charaktere — der Unterschied steckt in der
 * Cover-Behandlung, im Zeichen und (am PC) in der Bewegung. 1:1 aus
 * design-lab/v5-nativ/app.js `card()`.
 */
export function Card({
  entry,
  justAdded = false,
  uniform = false,
}: {
  entry: LibraryEntry;
  justAdded?: boolean;
  uniform?: boolean;
}) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const setProgress = useLibrary((s) => s.setProgress);
  const st = entry.status;
  const season = currentSeason(entry) ?? entry.seasons[0];
  const cov = entryCover(entry);
  const seasonNo = entry.seasonIndex + 1;
  const pct = season?.episodes ? Math.min(1, entry.progress / season.episodes) : 0;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));
  const linkId = season?.id ?? entry.rootId;

  const sub = (() => {
    switch (st) {
      case 'watching':
        return t('seasonProgress', { s: seasonNo, p: entry.progress, t: season?.episodes ?? '?' });
      case 'nextup':
        return season?.format === 'MOVIE'
          ? t('cardFilmWaits')
          : t('cardSeasonWaits', { n: seasonNo });
      case 'planned':
        return seasonLabel(entry.seasons[0] ?? {}, lang) ?? t('bookmarked');
      case 'continuation':
        return entry.releaseNote ?? t('dateUnknown');
      case 'completed':
        return `${t('episodesN', { n: watchedEpisodes(entry) })} · ${
          entry.rating ? `${entry.rating}/10` : t('ratingNone')
        }`;
      default:
        return '';
    }
  })();

  return (
    <Link
      to={`/anime/${linkId}`}
      className={`card${justAdded ? ' just-added' : ''}${uniform ? ' card--uniform' : ''}`}
      data-st={st}
      aria-label={title}
    >
      <div className="card__art">
        {cov && <img src={cov} alt="" loading="lazy" decoding="async" />}

        {st === 'watching' && (
          <>
            <div className="card__prog">
              <i style={{ width: `${(pct * 100).toFixed(1)}%` }} />
            </div>
            <button
              type="button"
              className="card__knob"
              aria-label={t('continueWithEp', { n: entry.progress + 1 })}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setProgress(entry.rootId, entry.progress + 1);
              }}
            >
              <Icon name="play" size={16} filled />
            </button>
          </>
        )}

        {st === 'nextup' && (
          <span className="ready-badge">
            <Icon name="next" size={19} filled />
          </span>
        )}

        {st === 'planned' && (
          <svg className="ribbon" viewBox="0 0 22 30" aria-hidden="true">
            <path
              d="M0 0h22v27.4a1 1 0 0 1-1.55.83L11 22l-9.45 6.23A1 1 0 0 1 0 27.4Z"
              fill="currentColor"
            />
          </svg>
        )}

        {st === 'continuation' && (
          <span className="wait">
            <svg
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8.6" />
              <path className="tick" d="M12 12V6.8" />
            </svg>
            <span className="wait__label">{entry.releaseNote ?? t('dateUnknown')}</span>
          </span>
        )}

        {st === 'completed' && hasSequel(entry) && (
          <span className="seq">
            <Icon name="sparkle" size={12} filled />
            <span className="seq__label">{t('sequelBadge')}</span>
          </span>
        )}

        {uniform && isReleased(season ?? ({} as never)) && st !== 'continuation' && (
          <Tag status={st} float />
        )}
      </div>
      <div className="card__meta">
        <div className="card__title">{title}</div>
        <div className="card__sub">{sub}</div>
      </div>
    </Link>
  );
}

/** Karte für einen Titel, der (noch) nicht in der Bibliothek liegt (Katalog). */
export function MediaTile({
  id,
  title,
  cover,
  format,
  season,
  seasonYear,
  inLibraryStatus,
  onAdd,
}: {
  id: number;
  title: string;
  cover: string | null;
  format: string | null;
  season: string | null;
  seasonYear: number | null;
  inLibraryStatus?: LibraryEntry['status'];
  onAdd?: () => void;
}) {
  const lang = useSettings((s) => s.lang);
  const showTag = inLibraryStatus && inLibraryStatus !== 'continuation';
  const meta = [
    format ? formatLabel(format as never, lang) : 'TV',
    seasonLabel({ season: season as never, seasonYear }, lang),
  ]
    .filter(Boolean)
    .join(' · ');

  const inner = (
    <>
      <div className="card__art">
        {cover && <img src={cover} alt="" loading="lazy" decoding="async" />}
        {showTag && <Tag status={inLibraryStatus!} float />}
      </div>
      <div className="card__meta">
        <div className="card__title">{title}</div>
        <div className="card__sub">{meta}</div>
      </div>
    </>
  );

  if (inLibraryStatus || !onAdd) {
    return (
      <Link
        to={`/anime/${id}`}
        className="card card--uniform"
        data-st={inLibraryStatus ?? 'watching'}
        aria-label={title}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="card card--uniform"
      data-st="watching"
      aria-label={title}
      onClick={onAdd}
      style={{ display: 'block' }}
    >
      {inner}
    </button>
  );
}
