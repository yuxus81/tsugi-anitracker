import { Link } from 'react-router-dom';
import type { MediaCard } from '@/api/types';
import { bestTitle, cover, FORMAT_LABEL, seasonLabel } from '@/api/types';
import { useLibrary } from '@/store/library';

/**
 * The workhorse card: cover, title, one meta line. Tracked entries carry a
 * jade progress hairline at the bottom edge of the cover — library state is
 * visible everywhere without opening anything.
 */
export function PosterCard({ media, sizes }: { media: MediaCard; sizes?: string }) {
  const entry = useLibrary((s) => s.entries[media.id]);
  const src = cover(media);
  const progress =
    entry && entry.episodes ? Math.min(1, entry.progress / entry.episodes) : entry ? 0 : null;

  return (
    <Link
      to={`/anime/${media.id}`}
      className="group block w-full"
      aria-label={bestTitle(media)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-card bg-surface">
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
          <span className="absolute right-1.5 top-1.5 rounded bg-bg/85 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink">
            {(media.averageScore / 10).toFixed(1)}
          </span>
        )}
        {entry && (
          <>
            <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-jade shadow-[0_0_0_3px_oklch(0.115_0_0/0.8)]" />
            {progress !== null && progress > 0 && (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-bg/70">
                <span
                  className="block h-full bg-jade transition-[width] duration-200 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </span>
            )}
          </>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">
        {bestTitle(media)}
      </p>
      <p className="mt-0.5 text-xs text-ink-dim">
        {[media.format ? FORMAT_LABEL[media.format] : null, seasonLabel(media)]
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
