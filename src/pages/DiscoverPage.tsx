import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDiscover, fetchGenre } from '@/api/anilist';
import { bestTitle, cover, type MediaCard } from '@/api/types';
import { PosterRow, PosterRowSkeleton } from '@/components/PosterCard';
import { ErrorBox, PageTitle, SectionHead } from '@/components/ui';
import { StatusMenu } from '@/components/TrackControls';
import { findEntryFor, useLibrary } from '@/store/library';
import { useSettings, useT } from '@/i18n';
import { IconPlus } from '@/components/icons';

/**
 * The whole default view is ONE GraphQL request (five aliased pages). Genres
 * are one more request each.
 */

const GENRES = ['Action', 'Adventure', 'Fantasy', 'Romance', 'Drama', 'Sports', 'Comedy', 'Thriller'] as const;
type Genre = (typeof GENRES)[number];

const GENRE_LABEL_DE: Record<Genre, string> = {
  Action: 'Action',
  Adventure: 'Abenteuer',
  Fantasy: 'Fantasy',
  Romance: 'Romance',
  Drama: 'Drama',
  Sports: 'Sport',
  Comedy: 'Comedy',
  Thriller: 'Thriller',
};

/** Editorial spotlight: the #1 trending title as a wide banner, not a card. */
function Spotlight({ media }: { media: MediaCard }) {
  const img = cover(media);
  const t = useT();
  const navigate = useNavigate();
  const entries = useLibrary((s) => s.entries);
  const entry = findEntryFor(entries, media.id);

  return (
    <section className="relative mb-10 overflow-hidden rounded-card border border-line">
      <div className="absolute inset-0">
        {img && (
          <img
            src={img}
            alt=""
            className="h-full w-full scale-110 object-cover object-[50%_25%] opacity-45 blur-2xl"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/40" />
      </div>
      <div className="relative flex items-center gap-6 p-6 sm:p-8">
        <div className="hidden w-[132px] shrink-0 overflow-hidden rounded-card shadow-2xl sm:block">
          {img && <img src={img} alt="" className="aspect-[2/3] w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-accent">{t('spotlightKicker')}</p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            <Link to={`/anime/${media.id}`} className="hover:underline">
              {bestTitle(media)}
            </Link>
          </h2>
          <p className="mt-1.5 line-clamp-1 text-sm text-ink-dim">{media.genres.slice(0, 4).join(' · ')}</p>
          <div className="mt-4">
            {entry ? (
              <StatusMenu rootId={entry.rootId} />
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/anime/${media.id}`)}
                className="inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110"
              >
                <IconPlus className="h-4 w-4" />
                {t('add')}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ title, items }: { title: string; items: MediaCard[] | undefined }) {
  if (!items?.length) return null;
  return (
    <section className="mb-9">
      <SectionHead title={title} />
      <PosterRow items={items} />
    </section>
  );
}

export function DiscoverPage() {
  const [genre, setGenre] = useState<Genre | null>(null);
  const t = useT();
  const lang = useSettings((s) => s.lang);

  const genreLabel = (g: Genre) => (lang === 'de' ? GENRE_LABEL_DE[g] : g);

  const main = useQuery({
    queryKey: ['discover'],
    queryFn: ({ signal }) => fetchDiscover(signal),
  });

  const genreQ = useQuery({
    queryKey: ['discover-genre', genre],
    enabled: genre !== null,
    queryFn: ({ signal }) => fetchGenre(genre!, signal),
  });

  return (
    <div>
      <PageTitle title={t('discoverTitle')} sub={t('discoverSub')} />

      <div
        className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
        role="tablist"
        aria-label="Genre"
      >
        <button
          type="button"
          role="tab"
          aria-selected={genre === null}
          onClick={() => setGenre(null)}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
            genre === null
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-line bg-surface text-ink-dim hover:text-ink'
          }`}
        >
          {t('filterAll')}
        </button>
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={genre === g}
            onClick={() => setGenre(genre === g ? null : g)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
              genre === g
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-surface text-ink-dim hover:text-ink'
            }`}
          >
            {genreLabel(g)}
          </button>
        ))}
      </div>

      {genre === null ? (
        main.isError ? (
          <ErrorBox onRetry={() => main.refetch()} />
        ) : main.isLoading ? (
          <>
            <div className="skeleton mb-10 h-48 w-full" />
            <PosterRowSkeleton />
          </>
        ) : (
          <>
            {main.data!.trending.media[0] && <Spotlight media={main.data!.trending.media[0]} />}
            <Row title={t('rowTrending')} items={main.data!.trending.media.slice(1)} />
            <Row title={t('rowSeason')} items={main.data!.season.media} />
            <Row title={t('rowUpcoming')} items={main.data!.upcoming.media} />
            <Row title={t('rowTop')} items={main.data!.top.media} />
            <Row title={t('rowMovies')} items={main.data!.movies.media} />
          </>
        )
      ) : genreQ.isError ? (
        <ErrorBox onRetry={() => genreQ.refetch()} />
      ) : genreQ.isLoading ? (
        <>
          <PosterRowSkeleton />
          <div className="h-8" />
          <PosterRowSkeleton />
        </>
      ) : (
        <>
          <Row title={t('rowPopularIn', { g: genreLabel(genre) })} items={genreQ.data!.popular.media} />
          <Row title={t('rowBestRated')} items={genreQ.data!.best.media} />
          <Row title={t('rowFresh')} items={genreQ.data!.fresh.media} />
        </>
      )}
    </div>
  );
}
