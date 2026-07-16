import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchManyByIds } from '@/api/anilist';
import { useLibrary, entriesByStatus, type LibraryEntry } from '@/store/library';
import { EpisodeStepper } from '@/components/TrackControls';
import { EmptyState, PageTitle, SectionHead } from '@/components/ui';
import { useSearchOverlay } from '@/components/searchStore';
import { IconCalendar, IconPlay, IconSearch } from '@/components/icons';

const WEEKDAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function fmtAiring(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  const diffDays = Math.floor(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `heute, ${time}`;
  if (diffDays === 1) return `morgen, ${time}`;
  if (diffDays < 7) return `${WEEKDAY[d.getDay()]}., ${time}`;
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

/** One "continue watching" row: cover, next episode, stepper right there. */
function ContinueCard({ entry }: { entry: LibraryEntry }) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-3 pr-4">
      <Link
        to={`/anime/${entry.mediaId}`}
        className="block h-[84px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-raised"
      >
        {entry.coverUrl && (
          <img src={entry.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/anime/${entry.mediaId}`}
          className="block truncate text-[15px] font-semibold text-ink hover:text-jade"
        >
          {entry.title}
        </Link>
        <p className="mt-0.5 text-[13px] text-ink-dim">
          {entry.episodes
            ? `Weiter mit Episode ${Math.min(entry.progress + 1, entry.episodes)}`
            : `${entry.progress} Episoden gesehen`}
        </p>
        <div className="mt-1.5 h-1 max-w-[220px] overflow-hidden rounded-full bg-raised">
          <div
            className="h-full bg-jade transition-[width] duration-200 ease-out"
            style={{
              width: entry.episodes
                ? `${Math.min(100, (entry.progress / entry.episodes) * 100)}%`
                : '0%',
            }}
          />
        </div>
      </div>
      <div className="shrink-0">
        <EpisodeStepper mediaId={entry.mediaId} />
      </div>
    </div>
  );
}

export function HomePage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const openSearch = useSearchOverlay((s) => s.open);
  const navigate = useNavigate();

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const watching = byStatus.watching;
  const releasingIds = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.releasing && (e.status === 'watching' || e.status === 'planned'))
        .map((e) => e.mediaId),
    [entries],
  );

  // One batched request for everything airing in the library.
  const airing = useQuery({
    queryKey: ['airing', releasingIds.slice().sort().join(',')],
    enabled: hydrated && releasingIds.length > 0,
    queryFn: async ({ signal }) => {
      const cards = await fetchManyByIds(releasingIds, signal);
      return cards
        .filter((c) => c.nextAiringEpisode)
        .sort((a, b) => a.nextAiringEpisode!.airingAt - b.nextAiringEpisode!.airingAt);
    },
    staleTime: 30 * 60 * 1000,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Späte Session?';
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Hey';
    return 'Guten Abend';
  })();

  const isEmpty = hydrated && Object.keys(entries).length === 0;

  return (
    <div>
      <PageTitle
        title={greeting}
        sub={
          watching.length > 0
            ? `${watching.length} ${watching.length === 1 ? 'Serie läuft' : 'Serien laufen'} gerade in deinem Archiv.`
            : 'Dein Archiv, dein Tempo.'
        }
      />

      {isEmpty ? (
        <EmptyState
          title="Noch ein leeres Archiv"
          hint="Such deinen ersten Anime und setz ihn auf „Schaue ich“ — ab dann startet jede Sitzung hier mit deiner nächsten Episode."
          action={
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex items-center gap-2 rounded-ctl bg-jade-deep px-4 py-2.5 text-sm font-semibold text-ink transition-[filter] duration-150 hover:brightness-110"
            >
              <IconSearch className="h-4 w-4" />
              Ersten Anime suchen
            </button>
          }
        />
      ) : (
        <>
          {watching.length > 0 && (
            <section className="mb-9">
              <SectionHead title="Weiterschauen" count={watching.length} />
              <div className="grid gap-3 lg:grid-cols-2">
                {watching.slice(0, 6).map((e) => (
                  <ContinueCard key={e.mediaId} entry={e} />
                ))}
              </div>
            </section>
          )}

          {(airing.data?.length ?? 0) > 0 && (
            <section className="mb-9">
              <SectionHead title="Als Nächstes im Simulcast" />
              <ul className="divide-y divide-line rounded-card border border-line bg-surface">
                {airing.data!.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/anime/${c.id}`}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors duration-150 hover:bg-raised"
                    >
                      <IconCalendar className="h-4 w-4 shrink-0 text-jade" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {entries[c.id]?.title ?? c.title.romaji}
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-ink-dim">
                        Ep. {c.nextAiringEpisode!.episode} · {fmtAiring(c.nextAiringEpisode!.airingAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {byStatus.planned.length > 0 && watching.length === 0 && (
            <section className="mb-9">
              <SectionHead title="Bereit zum Start" />
              <p className="mb-3 text-sm text-ink-dim">
                Nichts läuft gerade — such dir was von deiner Merkliste aus.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {byStatus.planned.slice(0, 4).map((e) => (
                  <button
                    key={e.mediaId}
                    type="button"
                    onClick={() => navigate(`/anime/${e.mediaId}`)}
                    className="flex items-center gap-4 rounded-card border border-line bg-surface p-3 text-left transition-colors duration-150 hover:border-jade"
                  >
                    <span className="block h-[62px] w-[44px] shrink-0 overflow-hidden rounded-[6px] bg-raised">
                      {e.coverUrl && (
                        <img src={e.coverUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {e.title}
                      </span>
                      <span className="text-xs text-ink-dim">
                        {e.episodes ? `${e.episodes} Episoden` : 'Laufend'}
                      </span>
                    </span>
                    <IconPlay className="h-5 w-5 shrink-0 text-jade" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
