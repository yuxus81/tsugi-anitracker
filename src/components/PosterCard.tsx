import { Link } from 'react-router-dom';
import type { MediaCard } from '@/api/types';
import { bestTitle, cover, formatLabel, seasonLabel } from '@/api/types';
import { findEntryFor, isReleased, useLibrary } from '@/store/library';
import { cardQuery } from '@/api/tmdb';
import { useDisplayTitle } from '@/store/titles';
import { useSettings } from '@/i18n';
import { IconStar } from '@/components/icons';

/**
 * The workhorse card: cover, title, one meta line. Tracked franchises carry an
 * accent progress hairline at the bottom edge of the cover — library state is
 * visible everywhere without opening anything.
 */
export function PosterCard({ media, sizes }: { media: MediaCard; sizes?: string }) {
  const entries = useLibrary((s) => s.entries);
  const lang = useSettings((s) => s.lang);
  const entry = findEntryFor(entries, media.id);
  const src = cover(media);
  const title = useDisplayTitle(cardQuery(media), bestTitle(media));

  // Fortschritt dieser Staffel innerhalb des Franchise-Eintrags.
  let progress: number | null = null;
  if (entry) {
    const idx = entry.seasons.findIndex((s) => s.id === media.id);
    const season = entry.seasons[idx];
    if (idx < entry.seasonIndex) progress = 1;
    else if (idx === entry.seasonIndex && season?.episodes) {
      progress = Math.min(1, entry.progress / season.episodes);
    } else if (idx === entry.seasonIndex && season && isReleased(season)) {
      progress = 0;
    } else {
      progress = 0;
    }
  }

  return (
    <Link
      to={`/anime/${media.id}`}
      className="group block w-full"
      aria-label={title}
    >
      <div className="hover-lift relative aspect-[2/3] w-full overflow-hidden rounded-card bg-surface">
        {src && (
          <img
            src={src}
            alt=""
            loading="lazy"
            sizes={sizes}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        )}
        {media.averageScore != null && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#ffe27a] to-gold px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-[#402700] shadow-[0_3px_10px_-2px_rgba(255,207,77,0.7)]">
            <IconStar className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
            {(media.averageScore / 10).toFixed(1)}
          </span>
        )}
        {entry && (
          <>
            <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_0_3px_rgba(13,15,24,0.8)]" />
            {progress !== null && progress > 0 && (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-bg/70">
                <span
                  className="block h-full bg-accent transition-[width] duration-200 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </span>
            )}
          </>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">
        {title}
      </p>
      <p className="mt-0.5 text-xs text-ink-dim">
        {[media.format ? formatLabel(media.format, lang) : null, seasonLabel(media, lang)]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </Link>
  );
}

export function PosterRow({ items }: { items: MediaCard[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
      {items.map((m) => (
        <div key={m.id} className="w-[136px] shrink-0 snap-start sm:w-[156px]">
          <PosterCard media={m} sizes="156px" />
        </div>
      ))}
    </div>
  );
}

export function PosterGrid({ items }: { items: MediaCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {items.map((m) => (
        <PosterCard key={m.id} media={m} sizes="(max-width: 640px) 30vw, 156px" />
      ))}
    </div>
  );
}

export function PosterRowSkeleton() {
  return (
    <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:-mx-6 sm:px-6">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="w-[136px] shrink-0 sm:w-[156px]">
          <div className="skeleton aspect-[2/3] w-full" />
          <div className="skeleton mt-2 h-3.5 w-4/5 rounded" />
        </div>
      ))}
    </div>
  );
}
