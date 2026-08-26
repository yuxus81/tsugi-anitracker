import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDiscover, fetchGenre } from '@/api/anilist';
import { bestTitle, cover, type MediaCard } from '@/api/types';
import { cardQuery } from '@/api/tmdb';
import { MediaTile } from '@/components/MediaTile';
import { Button, SectionHead } from '@/components/kit';
import { useDisplayTitle } from '@/store/titles';
import { useSettings, useT } from '@/i18n';

/**
 * ENTDECKEN — der Katalog.
 *
 * Alles hier gehört (noch) nicht dem Nutzer. Deshalb tragen die Karten die
 * einheitliche Katalog-Bauform (`MediaTile`): keine eigenen Bewegungen,
 * keine Spoiler-Marken.
 *
 * Der ganze Standard-Blick ist EIN GraphQL-Request (fünf Reihen als Aliase);
 * ein Genre ist je ein weiterer.
 *
 * ABGESCHAFFT GEGENÜBER DEM ALTEN STAND: die Genre-Bühne — ein bildschirm-
 * füllendes Farbbad mit treibenden Partikeln hinter der ganzen Seite. Sie
 * gehörte zur alten Bildsprache („atmosphärische Website") und widerspricht
 * dem Gerät-Modell direkt: In einem Gerät liegt hinter dem Inhaltsbereich
 * kein Wetter. Was sie sagen wollte — „du bist gerade im Fantasy-Regal" —
 * sagt jetzt die eingefärbte Genre-Leiste über `data-st`.
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
 * Die Bühne: ein Titel, breit — kein größeres Poster.
 *
 * BEWUSST OHNE INHALTSANGABE, anders als im Entwurf: `description` steckt
 * nur in der Detail-Abfrage, nicht in den Kartendaten. Sie hier zu zeigen
 * hieße, entweder 90 Inhaltsangaben für eine einzige sichtbare Zeile
 * mitzuladen oder eine zweite Abfrage bei jedem Öffnen zu schicken. Die
 * Zeile aus Genres trägt die Fläche genauso — und kostet nichts.
 */
function Spotlight({ media }: { media: MediaCard }) {
  const t = useT();
  const bild = cover(media);
  const titel = useDisplayTitle(cardQuery(media), bestTitle(media));

  return (
    <section className="spot" data-st="watching" data-testid="spotlight">
      <div className="spot__bg" aria-hidden>
        {bild && <img src={bild} alt="" decoding="async" />}
      </div>
      <div className="spot__in">
        <span className="kicker">
          <span className="dot" aria-hidden />
          {t('spotlightKicker')}
        </span>
        <h2 className="spot__t">
          <Link to={`/anime/${media.id}`}>{titel}</Link>
        </h2>
        <p className="spot__d">{media.genres.slice(0, 4).join(' · ')}</p>
      </div>
    </section>
  );
}

function Shelf({ title, items }: { title: string; items: MediaCard[] | undefined }) {
  // Eine Reihe ohne Inhalt ist keine leere Reihe, sondern gar keine.
  if (!items?.length) return null;

  return (
    <section className="shelfblock">
      <SectionHead title={title} count={items.length} />
      <div className="shelf shelf--wide">
        {items.map((m) => (
          <MediaTile key={m.id} media={m} />
        ))}
      </div>
    </section>
  );
}

/** Platzhalter in der Form dessen, was gleich kommt — kein Drehkreisel. */
function ShelfSkeleton() {
  return (
    <div className="shelf shelf--wide" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i}>
          <div className="skel skel--poster" />
          <div className="skel skel--line" />
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="panel errorbox" data-st="continuation">
      <p className="sub">{t('detailError')}</p>
      <Button icon="refresh" onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}

export function DiscoverPage() {
  const [genre, setGenre] = useState<Genre | null>(null);
  const t = useT();
  const lang = useSettings((s) => s.lang);

  const label = (g: Genre) => (lang === 'de' ? GENRE_LABEL_DE[g] : g);

  const alles = useQuery({
    queryKey: ['discover'],
    queryFn: ({ signal }) => fetchDiscover(signal),
  });

  const proGenre = useQuery({
    queryKey: ['discover-genre', genre],
    enabled: genre !== null,
    queryFn: ({ signal }) => fetchGenre(genre!, signal),
  });

  return (
    <>
      <header className="pagehead">
        <h1 className="h-large">{t('discoverTitle')}</h1>
        <p className="sub">{t('discoverSub')}</p>
      </header>

      {/* Schalter, keine Tabs: es gibt kein zugehöriges Panel und keine
          Pfeiltasten-Navigation. `group` + `aria-pressed` sagt genau das. */}
      <div className="genrebar" role="group" aria-label={t('discoverGenreFilter')}>
        <button
          type="button"
          className={`chip${genre === null ? ' is-on' : ''}`}
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
            className={`chip${genre === g ? ' is-on' : ''}`}
            data-st="nextup"
            aria-pressed={genre === g}
            onClick={() => setGenre(genre === g ? null : g)}
          >
            {label(g)}
          </button>
        ))}
      </div>

      {genre === null ? (
        alles.isError ? (
          <ErrorBox onRetry={() => void alles.refetch()} />
        ) : alles.isLoading || !alles.data ? (
          <>
            <div className="skel skel--spot" aria-hidden />
            <ShelfSkeleton />
          </>
        ) : (
          <>
            {alles.data.trending.media[0] && <Spotlight media={alles.data.trending.media[0]} />}
            {/* Ab dem zweiten: der herausgestellte Titel steht schon oben
                und wäre hier direkt darunter ein zweites Mal zu sehen. */}
            <Shelf title={t('rowTrending')} items={alles.data.trending.media.slice(1)} />
            <Shelf title={t('rowSeason')} items={alles.data.season.media} />
            <Shelf title={t('rowUpcoming')} items={alles.data.upcoming.media} />
            <Shelf title={t('rowTop')} items={alles.data.top.media} />
            <Shelf title={t('rowMovies')} items={alles.data.movies.media} />
          </>
        )
      ) : proGenre.isError ? (
        <ErrorBox onRetry={() => void proGenre.refetch()} />
      ) : proGenre.isLoading || !proGenre.data ? (
        <>
          <ShelfSkeleton />
          <ShelfSkeleton />
        </>
      ) : (
        <>
          <Shelf title={t('rowPopularIn', { g: label(genre) })} items={proGenre.data.popular.media} />
          <Shelf title={t('rowBestRated')} items={proGenre.data.best.media} />
          <Shelf title={t('rowFresh')} items={proGenre.data.fresh.media} />
        </>
      )}
    </>
  );
}
