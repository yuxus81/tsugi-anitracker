import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  entriesByStatus,
  STATUS_LABEL,
  STATUS_ORDER,
  useLibrary,
  type LibraryEntry,
  type WatchStatus,
} from '@/store/library';
import { STATUS_DOT, EpisodeStepper } from '@/components/TrackControls';
import { EmptyState, PageTitle } from '@/components/ui';
import { useSearchOverlay } from '@/components/searchStore';
import { FORMAT_LABEL } from '@/api/types';
import { IconSearch } from '@/components/icons';

function LibraryRow({ entry, showStepper }: { entry: LibraryEntry; showStepper: boolean }) {
  const pct =
    entry.episodes && entry.episodes > 0
      ? Math.min(100, (entry.progress / entry.episodes) * 100)
      : null;

  return (
    <li className="flex items-center gap-4 px-3 py-3 sm:px-4">
      <Link
        to={`/anime/${entry.mediaId}`}
        className="block h-[72px] w-[52px] shrink-0 overflow-hidden rounded-[8px] bg-raised"
      >
        {entry.coverUrl && <img src={entry.coverUrl} alt="" className="h-full w-full object-cover" />}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/anime/${entry.mediaId}`}
          className="block truncate text-[15px] font-semibold text-ink hover:text-jade"
        >
          {entry.title}
        </Link>
        <p className="mt-0.5 text-xs text-ink-dim">
          {[
            entry.format ? FORMAT_LABEL[entry.format] : null,
            entry.seasonYear,
            entry.rating ? `deine Wertung ${entry.rating}/10` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {pct !== null && (
          <div className="mt-1.5 h-1 max-w-[200px] overflow-hidden rounded-full bg-raised">
            <div className="h-full bg-jade" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {showStepper ? (
        <div className="hidden shrink-0 sm:block">
          <EpisodeStepper mediaId={entry.mediaId} />
        </div>
      ) : (
        <span className="shrink-0 text-sm tabular-nums text-ink-dim">
          {entry.episodes ? `${entry.progress}/${entry.episodes}` : entry.progress || ''}
        </span>
      )}
    </li>
  );
}

export function LibraryPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const openSearch = useSearchOverlay((s) => s.open);
  const [tab, setTab] = useState<WatchStatus>('watching');

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const total = Object.keys(entries).length;

  // Default to the first non-empty tab so the page never opens on a void.
  const activeTab = byStatus[tab].length > 0 ? tab : (STATUS_ORDER.find((s) => byStatus[s].length > 0) ?? tab);
  const list = byStatus[activeTab];

  if (hydrated && total === 0) {
    return (
      <div>
        <PageTitle title="Bibliothek" />
        <EmptyState
          title="Hier entsteht dein Archiv"
          hint="Alles, was du trackst, landet hier — sortiert nach Status, mit Fortschritt und deiner Wertung."
          action={
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex items-center gap-2 rounded-ctl bg-jade-deep px-4 py-2.5 text-sm font-semibold text-ink transition-[filter] duration-150 hover:brightness-110"
            >
              <IconSearch className="h-4 w-4" />
              Anime suchen
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Bibliothek" sub={`${total} ${total === 1 ? 'Titel' : 'Titel'} in deinem Archiv.`} />

      <div
        className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
        role="tablist"
        aria-label="Status"
      >
        {STATUS_ORDER.map((s) => {
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
                  ? 'border-jade bg-jade-deep/30 text-jade'
                  : 'border-line bg-surface text-ink-dim hover:text-ink'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
              {STATUS_LABEL[s]}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={`Nichts unter „${STATUS_LABEL[activeTab]}“`}
          hint="Ändere den Status eines Titels oder füg etwas Neues hinzu."
        />
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {list.map((e) => (
            <LibraryRow key={e.mediaId} entry={e} showStepper={activeTab === 'watching'} />
          ))}
        </ul>
      )}
    </div>
  );
}
