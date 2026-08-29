import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDetail, fetchDiscover, fetchGenre, prefetchGenres } from '@/api/anilist';
import { bestTitle, cover, formatLabel, seasonLabel, type MediaCard } from '@/api/types';
import { PosterRow, PosterRowSkeleton } from '@/components/PosterCard';
import { ErrorBox, PageTitle, SectionHead, Btn } from '@/components/ui';
import { useScreenTone } from '@/store/tone';
import { useSettings, useT } from '@/i18n';

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
] as const;
type Genre = (typeof GENRES)[number];

/**
 * Jedes Genre bekommt seinen eigenen Farbton statt des einen Rots für alles.
 * Bewusst gedeckte, dunklere Töne (kein Neon): der aktive Reiter soll sich
 * abheben, ohne die Poster darunter zu überstrahlen. Mehrere Genres dürfen
 * sich einen Ton teilen — verwandte Stimmungen liegen dann sichtbar beieinander.
 * `hue` = Farbe des Unterstrichs, `text` = die hellere Schriftvariante.
 */
const GENRE_TONE: Record<Genre, { hue: string; text: string }> = {
  Action: { hue: '#c04a4a', text: '#e39a9a' },
  Adventure: { hue: '#c08340', text: '#e0b483' },
  Comedy: { hue: '#bfa03c', text: '#ddc87f' },
  Drama: { hue: '#a85a7a', text: '#d99cb4' },
  Fantasy: { hue: '#7a5fbe', text: '#b5a4e0' },
  Mystery: { hue: '#4f6f9e', text: '#9db6d8' },
  Psychological: { hue: '#6b6f8f', text: '#adb2cb' },
  Romance: { hue: '#b85c86', text: '#e2a0bd' },
  'Sci-Fi': { hue: '#3f8f96', text: '#8ecbd0' },
  'Slice of Life': { hue: '#5b9a6b', text: '#a3d4b0' },
  Sports: { hue: '#4a86b8', text: '#9cc4e2' },
  Supernatural: { hue: '#8a5aa8', text: '#c3a0d8' },
};

/** Ton als CSS-Variablen an den Reiter reichen — `.fchip` liest sie schon. */
function toneStyle(g: Genre): CSSProperties {
  const { hue, text } = GENRE_TONE[g];
  return { '--tone': hue, '--tone-t': text } as CSSProperties;
}

const GENRE_LABEL_DE: Record<Genre, string> = {
  Action: 'Action',
  Adventure: 'Abenteuer',
  Comedy: 'Comedy',
  Drama: 'Drama',
  Fantasy: 'Fantasy',
  Mystery: 'Mystery',
  Psychological: 'Psychologisch',
  Romance: 'Romance',
  'Sci-Fi': 'Sci-Fi',
  'Slice of Life': 'Alltag',
  Sports: 'Sport',
  Supernatural: 'Übernatürlich',
};

function Spotlight({ media }: { media: MediaCard }) {
  const img = cover(media);
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: ['detail', media.id],
    queryFn: ({ signal }) => fetchDetail(media.id, signal),
  });

  const synopsis = detail.data?.description
    ? detail.data.description
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    : null;
  const meta = [
    media.format ? formatLabel(media.format, lang) : null,
    seasonLabel(media, lang),
    media.averageScore != null ? `${media.averageScore}% Community` : null,
    media.genres.slice(0, 3).join(' · '),
  ]
    .filter(Boolean)
    .join(' · ');

  const bg = media.bannerImage ?? img;

  return (
    <section className="spot" data-st="watching">
      <div className="spot__bg">{bg && <img src={bg} alt="" />}</div>
      <div className="spot__in">
        <span className="kicker">{t('spotlightKicker')}</span>
        <h2 className="spot__t" style={{ marginTop: 8 }}>
          <Link to={`/anime/${media.id}`}>{bestTitle(media)}</Link>
        </h2>
        <p className="spot__d">{synopsis ?? meta}</p>
        <div className="spot__acts">
          <Btn variant="primary" ico="plus" filled={false} onClick={() => navigate(`/anime/${media.id}`)}>
            {t('add')}
          </Btn>
          <Btn variant="quiet" ico="arrow" filled={false} onClick={() => navigate(`/anime/${media.id}`)}>
            {t('viewDetails')}
          </Btn>
        </div>
      </div>
    </section>
  );
}

function Row({ title, items }: { title: string; items: MediaCard[] | undefined }) {
  if (!items?.length) return null;
  return (
    <section style={{ marginTop: 6 }}>
      <SectionHead title={title} tone="watching" count={items.length} />
      <PosterRow items={items} />
    </section>
  );
}

export function DiscoverPage() {
  const [genre, setGenre] = useState<Genre | null>(null);
  const t = useT();
  const lang = useSettings((s) => s.lang);
  useScreenTone('watching');

  const genreLabel = (g: Genre) => (lang === 'de' ? GENRE_LABEL_DE[g] : g);

  const main = useQuery({
    queryKey: ['discover'],
    queryFn: ({ signal }) => fetchDiscover(signal),
  });

  const genreQ = useQuery({
    queryKey: ['discover-genre', genre],
    enabled: genre !== null,
    queryFn: ({ signal }) => fetchGenre(genre!, signal),
    // BEWUSST kein `keepPreviousData`: das ließ beim Filterwechsel das alte
    // Genre ausgegraut stehen, was sich wie ein Hänger anfühlte (Yunus
    // 29.08.2026). Ein kurzes Skelett macht sofort klar „lädt", statt
    // zweideutig auszusehen. Dank Cache + Vorauslesen beim Berühren des
    // Reiters (`prefetchGenres`) ist das Skelett meist nur ein Wimpernschlag.
  });

  // Auch die Genre-Filter bekommen einen großen „Gesprächsthema"-Anime oben:
  // ohne Filter der Trend-Spitzenreiter, mit Filter der beliebteste im Genre.
  const spotlightMedia =
    genre === null ? main.data?.trending.media[0] : genreQ.data?.popular.media[0];

  return (
    <div>
      <PageTitle title={t('discoverTitle')} sub={t('discoverSub')} />

      {spotlightMedia && <Spotlight key={spotlightMedia.id} media={spotlightMedia} />}

      {/* Kategorien wie bei Netflix/Crunchyroll: leichte Textreiter in einer
          seitlich scrollenden Zeile, aktive nur farbig unterstrichen —
          keine einzeln stehenden „schweren Knöpfe". */}
      <div className="filterbar" role="group" aria-label={t('discoverGenreFilter')}>
        <button
          type="button"
          className={`fchip${genre === null ? ' is-on' : ''}`}
          data-st="watching"
          aria-pressed={genre === null}
          onClick={() => setGenre(null)}
        >
          {t('filterAll')}
        </button>
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            className={`fchip${genre === g ? ' is-on' : ''}`}
            style={toneStyle(g)}
            aria-pressed={genre === g}
            // Berührung/Zeiger auf dem Reiter heißt fast immer: gleich Klick.
            // Bis dahin liegt die Antwort schon im Cache.
            onPointerEnter={() => prefetchGenres([g])}
            onTouchStart={() => prefetchGenres([g])}
            onFocus={() => prefetchGenres([g])}
            onClick={() => setGenre((cur) => (cur === g ? null : g))}
          >
            {genreLabel(g)}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        {genre === null ? (
          main.isError ? (
            <ErrorBox onRetry={() => main.refetch()} />
          ) : main.isLoading ? (
            <>
              <div className="skel" style={{ height: 300, borderRadius: 'var(--r-4)', margin: '0 0 18px' }} />
              <PosterRowSkeleton />
            </>
          ) : (
            <>
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
            <div style={{ height: 24 }} />
            <PosterRowSkeleton />
          </>
        ) : (
          <>
            <Row title={t('rowPopularIn', { g: genreLabel(genre) })} items={genreQ.data!.popular.media.slice(1)} />
            <Row title={t('rowBestRated')} items={genreQ.data!.best.media} />
            <Row title={t('rowFresh')} items={genreQ.data!.fresh.media} />
          </>
        )}
      </div>
    </div>
  );
}
