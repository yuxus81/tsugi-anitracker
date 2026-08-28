import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  entriesByStatus,
  entryCover,
  entryTitle,
  lastWatchedSeason,
  LIBRARY_TABS,
  pendingSeasons,
  STATUS_KEY,
  useLibrary,
  type LibraryEntry,
  type WatchStatus,
} from '@/store/library';
import { entryQuery, useDisplayTitle } from '@/store/titles';
import { useScreenTone } from '@/store/tone';
import { useSearchOverlay } from '@/components/searchStore';
import { Btn, EmptyState, PageTitle, Segmented, ST_ICON } from '@/components/ui';
import { Card } from '@/components/Card';
import { RollSheet } from '@/components/RollSheet';
import { Icon } from '@/components/icons';
import { useT } from '@/i18n';

/** Geschaut = Rangliste (kein Poster-Raster). Per Greifpunkt umsortierbar. */
function CompletedRow({
  entry,
  index,
  dragProps,
}: {
  entry: LibraryEntry;
  index: number;
  dragProps: {
    dragging: boolean;
    dragOver: boolean;
    onHandleDragStart: () => void;
    onHandleDragEnd: () => void;
  };
}) {
  const t = useT();
  const season = lastWatchedSeason(entry);
  const cov = season?.coverUrl ?? entryCover(entry);
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));
  const pending = pendingSeasons(entry);
  const pendingLabel =
    pending.nums.length === 1
      ? t('pendingSeasonOne', { n: pending.nums[0] })
      : pending.nums.length > 1
        ? t('pendingSeasonRange', { a: pending.nums[0], b: pending.nums[pending.nums.length - 1] })
        : pending.announced
          ? t('pendingSequel')
          : null;

  return (
    <div
      className="row-item"
      data-st={entry.status}
      style={dragProps.dragging ? { opacity: 0.4 } : dragProps.dragOver ? { boxShadow: 'inset 0 0 0 2px var(--tone)' } : undefined}
    >
      <Link
        to={`/anime/${season?.id ?? entry.rootId}`}
        draggable={false}
        style={{ display: 'contents', color: 'inherit' }}
      >
        <span className="row-item__rank tnum">{index + 1}</span>
        <span className="row-item__art">
          {cov && <img src={cov} alt="" />}
        </span>
        <span className="row-item__body">
          <span className="row-item__t" style={{ display: 'block' }}>
            {title}
          </span>
          {pendingLabel && (
            <span className="row-item__pending">
              <Icon name="next" size={12} filled />
              <span>{pendingLabel}</span>
            </span>
          )}
        </span>
      </Link>
      <span className="row-item__end">
        {entry.rating != null && (
          <span className="rate">
            <Icon name="star" size={14} filled />
            {entry.rating}
          </span>
        )}
        <button
          type="button"
          draggable
          onDragStart={dragProps.onHandleDragStart}
          onDragEnd={dragProps.onHandleDragEnd}
          aria-label={t('dragToReorder')}
          title={t('dragToReorder')}
          style={{ cursor: 'grab', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
        >
          <Icon name="grip" size={18} />
        </button>
      </span>
    </div>
  );
}

function CompletedList({ list }: { list: LibraryEntry[] }) {
  const setCompletedOrder = useLibrary((s) => s.setCompletedOrder);
  const [items, setItems] = useState(list);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  useEffect(() => {
    setItems((prev) => {
      const a = prev.map((e) => e.rootId).join(',');
      const b = list.map((e) => e.rootId).join(',');
      return a === b ? prev : list;
    });
  }, [list]);

  function handleDrop(targetId: number) {
    if (draggingId != null && draggingId !== targetId) {
      const from = items.findIndex((e) => e.rootId === draggingId);
      const to = items.findIndex((e) => e.rootId === targetId);
      if (from !== -1 && to !== -1) {
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setItems(next);
        setCompletedOrder(next.map((e) => e.rootId));
      }
    }
    setDraggingId(null);
    setOverId(null);
  }

  return (
    <div className="panel panel--flush">
      {items.map((e, i) => (
        <div
          key={e.rootId}
          onDragOver={(ev) => {
            if (draggingId == null || draggingId === e.rootId) return;
            ev.preventDefault();
            if (overId !== e.rootId) setOverId(e.rootId);
          }}
          onDrop={(ev) => {
            ev.preventDefault();
            handleDrop(e.rootId);
          }}
        >
          <CompletedRow
            entry={e}
            index={i}
            dragProps={{
              dragging: draggingId === e.rootId,
              dragOver: overId === e.rootId && draggingId !== e.rootId,
              onHandleDragStart: () => setDraggingId(e.rootId),
              onHandleDragEnd: () => {
                setDraggingId(null);
                setOverId(null);
              },
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function LibraryPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const completedOrder = useLibrary((s) => s.completedOrder);
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  const [tab, setTab] = useState<WatchStatus>('completed');
  const [onlyFullyDone, setOnlyFullyDone] = useState(false);
  const [rolling, setRolling] = useState(false);

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const total = Object.keys(entries).length;

  const completedList = useMemo(() => {
    const merged = [
      ...byStatus.completed,
      ...byStatus.continuation.filter((e) => lastWatchedSeason(e) !== undefined),
      ...byStatus.nextup.filter((e) => lastWatchedSeason(e) !== undefined),
      ...byStatus.watching.filter((e) => lastWatchedSeason(e) !== undefined),
    ];
    const rank = new Map(completedOrder.map((id, i) => [id, i]));
    return merged.sort((a, b) => {
      const ra = rank.has(a.rootId) ? rank.get(a.rootId)! : Infinity;
      const rb = rank.has(b.rootId) ? rank.get(b.rootId)! : Infinity;
      if (ra !== rb) return ra - rb;
      return b.updatedAt - a.updatedAt;
    });
  }, [byStatus, completedOrder]);

  const filteredCompleted = useMemo(
    () =>
      onlyFullyDone
        ? completedList.filter((e) => e.status !== 'nextup' && e.status !== 'watching')
        : completedList,
    [completedList, onlyFullyDone],
  );

  const counts: Record<WatchStatus, number> = {
    ...(Object.fromEntries(
      Object.keys(byStatus).map((k) => [k, byStatus[k as WatchStatus].length]),
    ) as Record<WatchStatus, number>),
    completed: completedList.length,
  };

  const activeTab = counts[tab] > 0 ? tab : LIBRARY_TABS.find((s) => counts[s] > 0) ?? tab;
  useScreenTone(activeTab);

  const list = activeTab === 'completed' ? filteredCompleted : byStatus[activeTab];
  const rollPool = [...byStatus.planned, ...byStatus.nextup];

  if (hydrated && total === 0) {
    return (
      <div>
        <PageTitle title={t('libraryTitle')} />
        <EmptyState
          status="completed"
          title={t('libraryEmptyTitle')}
          hint={t('libraryEmptyHint')}
          action={
            <Btn variant="primary" ico="search" onClick={openSearch}>
              {t('libraryEmptyCta')}
            </Btn>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={t('libraryTitle')} sub={t('librarySub', { n: total })} />

      <Segmented
        items={LIBRARY_TABS.map((s) => ({
          key: s,
          label: t(STATUS_KEY[s]),
          count: counts[s],
          ico: ST_ICON[s],
        }))}
        active={activeTab}
        onPick={setTab}
      />

      <div style={{ marginTop: 18 }} data-st={activeTab}>
        {list.length === 0 ? (
          <EmptyState
            status={activeTab}
            title={t('libraryNothingIn', { s: t(STATUS_KEY[activeTab]) })}
            hint={t('libraryNothingHint')}
            action={
              <Btn variant="primary" ico="search" onClick={openSearch}>
                {t('libraryEmptyCta')}
              </Btn>
            }
          />
        ) : activeTab === 'completed' ? (
          <>
            <p className="muted" style={{ margin: '0 0 8px', paddingLeft: 4 }}>
              {t('libSortedByRating')}
            </p>
            <div style={{ margin: '0 0 12px', paddingLeft: 4 }}>
              <button
                type="button"
                className={`chip${onlyFullyDone ? ' is-on' : ''}`}
                data-st="completed"
                aria-pressed={onlyFullyDone}
                onClick={() => setOnlyFullyDone((v) => !v)}
              >
                {onlyFullyDone && <Icon name="check" size={13} />}
                {t('geschautFilterAll')}
                {onlyFullyDone && <span className="tnum" style={{ opacity: 0.7 }}>{filteredCompleted.length}</span>}
              </button>
            </div>
            <CompletedList key={activeTab} list={list} />
          </>
        ) : activeTab === 'continuation' ? (
          <>
            <p className="muted" style={{ margin: '0 0 12px', paddingLeft: 4 }}>
              {t('continuationComingSoon')}
            </p>
            <div className="grid grid--roomy">
              {list.map((e) => (
                <Card key={e.rootId} entry={e} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <Btn variant="primary" ico="dice" onClick={() => setRolling(true)}>
                {t('randomPickBtn')}
              </Btn>
              <Btn variant="quiet" ico="plus" filled={false} onClick={openSearch}>
                {t('add')}
              </Btn>
            </div>
            <div className="grid grid--roomy">
              {list.map((e) => (
                <Card key={e.rootId} entry={e} />
              ))}
            </div>
          </>
        )}
      </div>

      {rolling && <RollSheet pool={rollPool} onClose={() => setRolling(false)} />}
    </div>
  );
}
