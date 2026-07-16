import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDetail, fetchFranchise } from '@/api/anilist';
import {
  bestTitle,
  cover,
  FORMAT_LABEL,
  seasonLabel,
  type MediaCard,
} from '@/api/types';
import { useLibrary } from '@/store/library';
import { EpisodeStepper, RatingStrip, StatusMenu } from '@/components/TrackControls';
import { PosterRow } from '@/components/PosterCard';
import { ErrorBox, SectionHead } from '@/components/ui';
import { IconChevronLeft, IconPlay } from '@/components/icons';

const STATUS_TEXT: Record<string, string> = {
  FINISHED: 'Abgeschlossen',
  RELEASING: 'Läuft gerade',
  NOT_YET_RELEASED: 'Angekündigt',
  CANCELLED: 'Abgebrochen',
  HIATUS: 'Pausiert',
};

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Vertical franchise timeline. The current page's anime is marked "Du bist hier". */
function FranchiseTimeline({ mainline, currentId }: { mainline: MediaCard[]; currentId: number }) {
  const entries = useLibrary((s) => s.entries);
  if (mainline.length < 2) return null;

  return (
    <section className="mb-10">
      <SectionHead title="Franchise-Zeitstrahl" count={mainline.length} />
      <ol className="relative ml-2 border-l border-line pl-6">
        {mainline.map((m) => {
          const here = m.id === currentId;
          const tracked = entries[m.id];
          return (
            <li key={m.id} className="relative pb-5 last:pb-0">
              <span
                aria-hidden
                className={`absolute -left-6 top-4 h-3 w-3 -translate-x-1/2 rounded-full border-2 ${
                  here
                    ? 'border-jade bg-jade'
                    : tracked
                      ? 'border-jade bg-bg'
                      : 'border-line bg-bg'
                }`}
              />
              <Link
                to={`/anime/${m.id}`}
                className={`flex items-center gap-3.5 rounded-card border p-2.5 transition-colors duration-150 ${
                  here
                    ? 'border-jade/50 bg-jade-deep/15'
                    : 'border-line bg-surface hover:border-jade/40'
                }`}
              >
                <span className="block h-[58px] w-[42px] shrink-0 overflow-hidden rounded-[6px] bg-raised">
                  {cover(m) && <img src={cover(m)!} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {bestTitle(m)}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-dim">
                    {[
                      m.format ? FORMAT_LABEL[m.format] : null,
                      seasonLabel(m),
                      m.episodes ? `${m.episodes} Ep.` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {here ? (
                  <span className="shrink-0 rounded-full bg-jade/15 px-2.5 py-1 text-[11px] font-semibold text-jade">
                    Du bist hier
                  </span>
                ) : tracked ? (
                  <span className="shrink-0 rounded-full bg-raised px-2.5 py-1 text-[11px] font-medium text-ink-dim">
                    im Archiv
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function DetailPage() {
  const { id } = useParams();
  const mediaId = Number(id);
  const navigate = useNavigate();
  const entry = useLibrary((s) => s.entries[mediaId]);
  const refreshSnapshot = useLibrary((s) => s.refreshSnapshot);

  const q = useQuery({
    queryKey: ['detail', mediaId],
    enabled: Number.isFinite(mediaId),
    queryFn: async ({ signal }) => {
      const detail = await fetchDetail(mediaId, signal);
      // Keep the offline snapshot in sync whenever fresh data flows through.
      refreshSnapshot(detail);
      return detail;
    },
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

  if (q.isError) {
    return (
      <div className="pt-6">
        <ErrorBox onRetry={() => q.refetch()} />
      </div>
    );
  }

  if (q.isLoading || !q.data) {
    return (
      <div>
        <div className="skeleton h-52 w-full" />
        <div className="mt-6 flex gap-6">
          <div className="skeleton hidden h-[264px] w-[176px] shrink-0 sm:block" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-9 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-24 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  const m = q.data;
  const img = cover(m);
  const studios = m.studios.nodes.filter((s) => s.isAnimationStudio).map((s) => s.name);
  const trailerUrl =
    m.trailer?.site === 'youtube' && m.trailer.id
      ? `https://www.youtube.com/watch?v=${m.trailer.id}`
      : null;

  return (
    <div className="-mt-5 md:-mt-8">
      {/* Banner bleeds to the content edges; content overlaps it. */}
      <div className="relative -mx-4 h-44 overflow-hidden sm:-mx-6 sm:h-56">
        {(m.bannerImage || img) && (
          <img
            src={m.bannerImage ?? img!}
            alt=""
            className={`h-full w-full object-cover ${m.bannerImage ? '' : 'scale-110 blur-xl'} opacity-60`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-bg/70 py-1.5 pl-2 pr-3.5 text-sm font-medium text-ink backdrop-blur transition-colors duration-150 hover:bg-bg"
        >
          <IconChevronLeft className="h-4 w-4" />
          Zurück
        </button>
      </div>

      <div className="relative z-10 -mt-16 flex flex-col gap-6 sm:flex-row">
        <div className="w-[132px] shrink-0 overflow-hidden rounded-card border border-line shadow-2xl sm:w-[176px]">
          {img && <img src={img} alt="" className="aspect-[2/3] w-full object-cover" />}
        </div>

        <div className="min-w-0 flex-1 sm:pt-16">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {bestTitle(m)}
          </h1>
          {m.title.romaji && m.title.english && m.title.romaji !== m.title.english && (
            <p className="mt-1 text-sm text-ink-dim">{m.title.romaji}</p>
          )}
          <p className="mt-2 text-sm text-ink-dim">
            {[
              m.format ? FORMAT_LABEL[m.format] : null,
              seasonLabel(m),
              m.episodes ? `${m.episodes} Episoden` : null,
              m.status ? STATUS_TEXT[m.status] : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatusMenu media={m} />
            {entry && (entry.status === 'watching' || entry.status === 'paused') && (
              <EpisodeStepper mediaId={mediaId} />
            )}
            {trailerUrl && (
              <a
                href={trailerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-ctl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-jade"
              >
                <IconPlay className="h-4 w-4" />
                Trailer
              </a>
            )}
          </div>

          {entry && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-ink-dim">Deine Wertung</span>
              <RatingStrip mediaId={mediaId} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {m.description && (
            <section className="mb-10">
              <SectionHead title="Worum es geht" />
              <p
                className="max-w-[70ch] whitespace-pre-line text-[15px] leading-7 text-ink-dim"
                style={{ textWrap: 'pretty' }}
              >
                {m.description
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<[^>]+>/g, '')
                  .replace(/\n{2,}/g, '\n\n')
                  .trim()}
              </p>
            </section>
          )}

          {franchise.isLoading ? (
            <div className="mb-10">
              <SectionHead title="Franchise-Zeitstrahl" />
              <div className="space-y-3">
                <div className="skeleton h-[78px] w-full" />
                <div className="skeleton h-[78px] w-full" />
              </div>
            </div>
          ) : (
            franchise.data && (
              <>
                <FranchiseTimeline mainline={franchise.data.mainline} currentId={mediaId} />
                {franchise.data.extras.length > 0 && (
                  <section className="mb-10">
                    <SectionHead
                      title="Specials & Nebengeschichten"
                      count={franchise.data.extras.length}
                    />
                    <ul className="divide-y divide-line rounded-card border border-line bg-surface">
                      {franchise.data.extras.slice(0, 10).map(({ relation, media }) => (
                        <li key={media.id}>
                          <Link
                            to={`/anime/${media.id}`}
                            className="flex items-center gap-3.5 px-4 py-2.5 transition-colors duration-150 hover:bg-raised"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                              {bestTitle(media)}
                            </span>
                            <span className="shrink-0 rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-medium text-ink-dim">
                              {media.format === 'SPECIAL' || media.format === 'OVA'
                                ? (media.format === 'OVA' ? 'OVA' : 'Special')
                                : relation}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )
          )}

          {recommendations.length > 0 && (
            <section className="mb-10">
              <SectionHead title="Wenn dir das gefällt" />
              <PosterRow items={recommendations} />
            </section>
          )}
        </div>

        <aside>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-card border border-line bg-surface p-5 lg:grid-cols-1">
            <Fact label="Community-Wertung" value={m.averageScore != null ? `${(m.averageScore / 10).toFixed(1)} / 10` : null} />
            <Fact label="Studio" value={studios.length ? studios.join(', ') : null} />
            <Fact label="Episodenlänge" value={m.duration ? `${m.duration} min` : null} />
            <Fact
              label="Zeitraum"
              value={
                m.startDate?.year
                  ? `${m.startDate.year}${m.endDate?.year && m.endDate.year !== m.startDate.year ? ` – ${m.endDate.year}` : ''}`
                  : null
              }
            />
            <Fact label="Genres" value={m.genres.length ? m.genres.join(', ') : null} />
            {m.nextAiringEpisode && (
              <Fact
                label="Nächste Episode"
                value={`Ep. ${m.nextAiringEpisode.episode} · ${new Date(m.nextAiringEpisode.airingAt * 1000).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}`}
              />
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}
