import { Link } from 'react-router-dom';
import type { MediaCard } from '@/api/types';
import { bestTitle, cover, formatLabel, seasonLabel } from '@/api/types';
import { findEntryFor, STATUS_KEY, useLibrary } from '@/store/library';
import { cardQuery } from '@/api/tmdb';
import { useDisplayTitle } from '@/store/titles';
import { useSettings, useT } from '@/i18n';
import { Tag } from './ui';
import { Icon } from './icons';

/**
 * Katalog-Karte (Entdecken/Suche/Empfehlungen) — V5 `.card.card--uniform`:
 * eine Bewegung für alle, unabhängig vom Bibliotheks-Status. „Fortsetzung
 * folgt" wird hier bewusst NICHT als Marke gezeigt (Spoiler).
 */
export function PosterCard({
  media,
  onNavigate,
}: {
  media: MediaCard;
  sizes?: string;
  onNavigate?: () => void;
}) {
  const entries = useLibrary((s) => s.entries);
  const lang = useSettings((s) => s.lang);
  const t = useT();
  const entry = findEntryFor(entries, media.id);
  const src = cover(media);
  const title = useDisplayTitle(cardQuery(media), bestTitle(media));
  // „Geschaut" und „Weiter schauen" bekommen nur ein Häkchen, keine Pille.
  const marked = entry != null && (entry.status === 'completed' || entry.status === 'watching');
  const showTag = entry != null && !marked && entry.status !== 'continuation';
  const meta = [
    media.format ? formatLabel(media.format, lang) : 'TV',
    seasonLabel(media, lang),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      to={`/anime/${media.id}`}
      className="card card--uniform"
      data-st={entry ? entry.status : 'watching'}
      aria-label={title}
      onClick={onNavigate}
    >
      <div className="card__art">
        {src && <img src={src} alt="" loading="lazy" decoding="async" />}
        {media.averageScore != null && (
          <span className="score-badge">
            <Icon name="star" size={13} filled />
            {(media.averageScore / 10).toFixed(1)}
          </span>
        )}
        {marked && (
          <span className="mark-badge" data-st={entry!.status} aria-label={t(STATUS_KEY[entry!.status])}>
            <Icon name="check" size={17} />
          </span>
        )}
        {showTag && <Tag status={entry!.status} float />}
      </div>
      <div className="card__meta">
        <div className="card__title">{title}</div>
        <div className="card__sub">{meta}</div>
      </div>
    </Link>
  );
}

export function PosterRow({ items }: { items: MediaCard[] }) {
  return (
    <div className="shelf shelf--wide">
      {items.map((m) => (
        <PosterCard key={m.id} media={m} />
      ))}
    </div>
  );
}

export function PosterGrid({ items }: { items: MediaCard[] }) {
  return (
    <div className="grid">
      {items.map((m) => (
        <PosterCard key={m.id} media={m} />
      ))}
    </div>
  );
}

export function PosterRowSkeleton() {
  return (
    <div className="shelf shelf--wide">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ width: 152 }}>
          <div className="skel" style={{ aspectRatio: '2 / 3' }} />
          <div className="skel" style={{ height: 11, marginTop: 8, width: '82%' }} />
        </div>
      ))}
    </div>
  );
}
