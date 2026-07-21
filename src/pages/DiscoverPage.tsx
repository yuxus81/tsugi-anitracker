import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDiscover, fetchGenre } from '@/api/anilist';
import { bestTitle, cover, type MediaCard } from '@/api/types';
import { PosterRow, PosterRowSkeleton } from '@/components/PosterCard';
import { ErrorBox, PageTitle, SectionHead } from '@/components/ui';
import { QuickActions } from '@/components/TrackControls';
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

/**
 * Jedes Genre färbt die Bühne über den Filtern ein — eigener Verlauf, eigene
 * treibende Partikel, eigene Akzentfarbe für den aktiven Filter-Chip.
 */
const GENRE_THEME: Record<Genre, { bg: string; glyphs: string[]; color: string }> = {
  Action: {
    bg: 'radial-gradient(70vw 60vh at 20% 0%, rgba(255,90,45,0.34), transparent 62%), radial-gradient(60vw 55vh at 90% 100%, rgba(255,138,61,0.26), transparent 64%)',
    glyphs: ['✦', '✷'],
    color: '#ff8a3d',
  },
  Adventure: {
    bg: 'radial-gradient(70vw 60vh at 15% 5%, rgba(245,165,36,0.3), transparent 62%), radial-gradient(60vw 55vh at 95% 90%, rgba(245,197,106,0.22), transparent 64%)',
    glyphs: ['✧', '➤'],
    color: '#f5c56a',
  },
  Fantasy: {
    bg: 'radial-gradient(70vw 60vh at 18% 0%, rgba(155,92,240,0.36), transparent 62%), radial-gradient(60vw 55vh at 88% 96%, rgba(58,134,255,0.22), transparent 64%)',
    glyphs: ['✧', '✦', '❋'],
    color: '#b28cff',
  },
  Romance: {
    bg: 'radial-gradient(70vw 60vh at 25% 4%, rgba(255,46,119,0.36), transparent 60%), radial-gradient(58vw 52vh at 85% 92%, rgba(255,106,158,0.26), transparent 64%)',
    glyphs: ['♥', '❤'],
    color: '#ff6a9e',
  },
  Drama: {
    bg: 'radial-gradient(70vw 60vh at 20% 0%, rgba(58,134,255,0.3), transparent 62%), radial-gradient(60vw 55vh at 90% 96%, rgba(127,168,255,0.2), transparent 64%)',
    glyphs: ['❖', '✷'],
    color: '#7fa8ff',
  },
  Sports: {
    bg: 'radial-gradient(70vw 60vh at 18% 4%, rgba(0,245,212,0.3), transparent 62%), radial-gradient(60vw 55vh at 92% 92%, rgba(79,224,208,0.22), transparent 64%)',
    glyphs: ['➤', '✦'],
    color: '#4fe0d0',
  },
  Comedy: {
    bg: 'radial-gradient(70vw 60vh at 22% 0%, rgba(255,207,77,0.34), transparent 62%), radial-gradient(58vw 52vh at 88% 94%, rgba(255,215,106,0.22), transparent 64%)',
    glyphs: ['✺', '✦', '☺'],
    color: '#ffd76a',
  },
  Thriller: {
    bg: 'radial-gradient(70vw 60vh at 20% 0%, rgba(46,204,113,0.26), transparent 64%), radial-gradient(60vw 55vh at 90% 96%, rgba(95,214,138,0.2), transparent 66%)',
    glyphs: ['●', '◆'],
    color: '#5fd68a',
  },
};

interface Particle {
  left: number;
  bottom: number;
  delay: number;
  dur: number;
  size: number;
  glyph: string;
}

/**
 * Genre-Bühne: der Farbnebel + treibende Symbole liegen als fester Layer über
 * dem GANZEN Viewport (per Portal an <body>, damit kein transformierter
 * Seiten-Container sie auf die Inhaltsbreite beschneidet — das war der Grund,
 * warum der Effekt vorher nur oben in einem schmalen Kasten sichtbar war).
 */
function GenreStage({ genre }: { genre: Genre | null }) {
  const theme = genre ? GENRE_THEME[genre] : null;
  // Handys: weniger Partikel und ein leiseres Farbbad — auf kleinen Screens
  // wirkte der volle Effekt wie ein Overlay, das den eigentlichen Inhalt
  // (Genre-Filter, Karten) erschlägt, und kostete spürbar Performance.
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768;

  const particles = useMemo<Particle[]>(() => {
    if (!theme) return [];
    return Array.from({ length: isNarrow ? 8 : 22 }, (_, i) => ({
      left: 3 + ((i * 41) % 94),
      bottom: (i * 27) % 96,
      delay: -((i * 1.3) % 10),
      dur: 9 + ((i * 2.3) % 8),
      size: 12 + ((i * 5) % 18),
      glyph: theme.glyphs[i % theme.glyphs.length],
    }));
  }, [theme]);

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden transition-[background,opacity] duration-700 ease-out"
      style={{
        zIndex: -1,
        background: theme?.bg ?? 'transparent',
        opacity: theme ? (isNarrow ? 0.55 : 1) : 0,
      }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="genre-particle"
          style={{
            left: `${p.left}%`,
            bottom: `${p.bottom}%`,
            fontSize: p.size,
            color: theme?.color,
            animationName: 'particle-float',
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>,
    document.body,
  );
}

/** Editorial spotlight: the #1 trending title as a wide banner, not a card. */
function Spotlight({ media }: { media: MediaCard }) {
  const img = cover(media);
  const t = useT();
  const navigate = useNavigate();
  const entries = useLibrary((s) => s.entries);
  const entry = findEntryFor(entries, media.id);

  return (
    <section className="relative mb-6 overflow-hidden rounded-card border border-line sm:mb-10">
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
      <div className="relative flex items-center gap-4 p-4 sm:gap-6 sm:p-8">
        <div className="relative aspect-[2/3] w-[76px] shrink-0 overflow-hidden rounded-card shadow-2xl sm:w-[132px]">
          {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-accent sm:text-[13px]">{t('spotlightKicker')}</p>
          <h2 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-tight text-ink sm:mt-1.5 sm:line-clamp-none sm:text-3xl">
            <Link to={`/anime/${media.id}`} className="hover:underline">
              {bestTitle(media)}
            </Link>
          </h2>
          <p className="mt-1.5 line-clamp-1 text-xs text-ink-dim sm:text-sm">{media.genres.slice(0, 4).join(' · ')}</p>
          <div className="mt-3 sm:mt-4">
            {entry ? (
              <QuickActions rootId={entry.rootId} />
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/anime/${media.id}`)}
                className="inline-flex items-center gap-2 rounded-ctl bg-accent px-3.5 py-2 text-[13px] font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110 sm:px-4 sm:py-2.5 sm:text-sm"
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
    <div className="relative">
      <GenreStage genre={genre} />

      <PageTitle title={t('discoverTitle')} sub={t('discoverSub')} />

      <div
        className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 py-3 sm:-mx-6 sm:px-6"
        role="tablist"
        aria-label="Genre"
      >
        <button
          type="button"
          role="tab"
          aria-selected={genre === null}
          onClick={() => setGenre(null)}
          className={`press shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
            genre === null
              ? 'border-accent/40 bg-accent/15 text-accent shadow-[0_2px_14px_-3px_rgba(0,245,212,0.45)]'
              : 'border-white/10 bg-white/[0.05] text-ink-dim hover:text-ink'
          }`}
        >
          {t('filterAll')}
        </button>
        {GENRES.map((g) => {
          const active = genre === g;
          const theme = GENRE_THEME[g];
          return (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setGenre(genre === g ? null : g)}
              style={
                active
                  ? {
                      borderColor: theme.color,
                      background: `${theme.color}22`,
                      color: theme.color,
                      boxShadow: `0 0 16px -4px ${theme.color}`,
                    }
                  : undefined
              }
              className={`press shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                active ? '' : 'border-white/10 bg-white/[0.05] text-ink-dim hover:text-ink'
              }`}
            >
              {genreLabel(g)}
            </button>
          );
        })}
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
