import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  currentSeason,
  entriesByStatus,
  entryCover,
  entryTitle,
  LIBRARY_TABS,
  STATUS_KEY,
  totalEpisodes,
  useLibrary,
  watchedEpisodes,
  type LibraryEntry,
  type WatchStatus,
} from '@/store/library';
import { STATUS_DOT, EpisodeStepper } from '@/components/TrackControls';
import { EmptyState, PageTitle } from '@/components/ui';
import { useSearchOverlay } from '@/components/searchStore';
import { useT } from '@/i18n';
import { IconSearch } from '@/components/icons';

function LibraryRow({ entry, index }: { entry: LibraryEntry; index: number }) {
  const t = useT();
  const season = currentSeason(entry);
  const seasonCount = entry.seasons.length;
  const total = totalEpisodes(entry);
  const seen = watchedEpisodes(entry);
  const pct = total > 0 ? Math.min(100, (seen / total) * 100) : null;
  const linkId = season?.id ?? entry.rootId;

  const meta: Array<string | null> = [
    seasonCount === 1 ? t('seasonOne') : t('seasonsDone', { n: seasonCount }),
    entry.rating ? t('yourRatingShort', { n: entry.rating }) : null,
  ];

  return (
    <li
      className="stagger-in flex items-center gap-4 px-3 py-3 sm:px-4"
      style={{ ['--i' as string]: Math.min(index, 12) }}
    >
      <Link
        to={`/anime/${linkId}`}
        className="block h-[72px] w-[52px] shrink-0 overflow-hidden rounded-[8px] bg-raised"
      >
        {entryCover(entry) && (
          <img src={entryCover(entry)!} alt="" className="h-full w-full object-cover" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/anime/${linkId}`}
          className="block truncate text-[15px] font-semibold text-ink hover:text-accent"
        >
          {entryTitle(entry)}
        </Link>
        <p className="mt-0.5 truncate text-xs text-ink-dim">{meta.filter(Boolean).join(' · ')}</p>

        {entry.status === 'continuation' ? (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue/15 px-2.5 py-0.5 text-[11px] font-semibold text-blue">
            {entry.releaseNote
              ? t('announcedFor', { when: entry.releaseNote })
              : t('waitingForSequel')}
          </span>
        ) : entry.status === 'nextup' ? (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-pink/15 px-2.5 py-0.5 text-[11px] font-semibold text-pink">
            {t('newSeasonReady')}
          </span>
        ) : pct !== null ? (
          <div className="mt-1.5 h-1 max-w-[200px] overflow-hidden rounded-full bg-raised">
            <div
              className={`h-full ${entry.status === 'completed' ? 'bg-green' : 'bg-accent'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </div>

      {entry.status === 'paused' ? (
        <div className="hidden shrink-0 sm:block">
          <EpisodeStepper rootId={entry.rootId} />
        </div>
      ) : (
        <span className="shrink-0 text-sm tabular-nums text-ink-dim">
          {total ? `${seen}/${total}` : seen || ''}
        </span>
      )}
    </li>
  );
}

export function LibraryPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  const [tab, setTab] = useState<WatchStatus>('completed');

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const total = Object.keys(entries).length;

  // Nie auf einem leeren Tab öffnen, wenn woanders etwas liegt.
  const activeTab =
    byStatus[tab].length > 0 ? tab : (LIBRARY_TABS.find((s) => byStatus[s].length > 0) ?? tab);
  const list = byStatus[activeTab];

  if (hydrated && total === 0) {
    return (
      <div>
        <PageTitle title={t('libraryTitle')} />
        <EmptyState
          title={t('libraryEmptyTitle')}
          hint={t('libraryEmptyHint')}
          action={
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110"
            >
              <IconSearch className="h-4 w-4" />
              {t('libraryEmptyCta')}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={t('libraryTitle')} sub={t('librarySub', { n: total })} />

      <div
        className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
        role="tablist"
        aria-label="Status"
      >
        {LIBRARY_TABS.map((s) => {
          const active = s === activeTab;
          const count = byStatus[s].length;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(s)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-surface text-ink-dim hover:text-ink'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
              {t(STATUS_KEY[s])}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={t('libraryNothingIn', { s: t(STATUS_KEY[activeTab]) })}
          hint={t('libraryNothingHint')}
        />
      ) : (
        <ul key={activeTab} className="divide-y divide-line rounded-card border border-line bg-surface">
          {list.map((e, i) => (
            <LibraryRow key={e.rootId} entry={e} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
