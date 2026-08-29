import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react';
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
  onGrab,
  dragging,
}: {
  entry: LibraryEntry;
  index: number;
  onGrab: (e: ReactPointerEvent) => void;
  dragging: boolean;
}) {
  const t = useT();
  const season = lastWatchedSeason(entry);
  const cov = season?.coverUrl ?? entryCover(entry);
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));
  const pending = pendingSeasons(entry);

  // Offene Staffeln und offene Filme getrennt benennen — ein Kinofilm ist
  // keine „Staffel 4". Beides gleichzeitig kommt vor (Franchise mit Film
  // zwischendrin) und wird dann mit Mittelpunkt verbunden.
  const openParts: string[] = [];
  if (pending.nums.length === 1) openParts.push(t('pendingSeasonOne', { n: pending.nums[0] }));
  else if (pending.nums.length > 1)
    openParts.push(
      t('pendingSeasonRange', { a: pending.nums[0], b: pending.nums[pending.nums.length - 1] }),
    );
  if (pending.movies === 1) openParts.push(t('pendingMovieOne'));
  else if (pending.movies > 1) openParts.push(t('pendingMovieMany', { n: pending.movies }));

  const isOpen = openParts.length > 0;
  const pendingLabel = isOpen
    ? openParts.join(' · ')
    : pending.announced
      ? t('pendingSequel')
      : null;

  return (
    <div className={`row-item${dragging ? ' is-dragging' : ''}`} data-st={entry.status}>
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
            <span className={`row-item__pending${isOpen ? ' row-item__pending--open' : ''}`}>
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
          className="row-item__grip"
          onPointerDown={onGrab}
          aria-label={t('dragToReorder')}
          title={t('dragToReorder')}
        >
          <Icon name="grip" size={18} />
        </button>
      </span>
    </div>
  );
}

const ROW_GAP = 10; // muss zu `.panel--flush > * + * { margin-top }` passen

interface DragState {
  id: number;
  /** Reihenfolge OHNE den gezogenen Eintrag — ändert sich während des Zugs nie. */
  others: number[];
  heights: Map<number, number>;
  /** Oberkante des gezogenen Eintrags beim Anfassen, relativ zur Liste. */
  startTop: number;
  startIndex: number;
  pointerStartY: number;
  dy: number;
  targetIndex: number;
  /** 'dragging': folgt live dem Finger. 'settling': rastet nach dem
   *  Loslassen sichtbar in die Lücke ein, bevor die echte Reihenfolge
   *  übernommen wird. */
  phase: 'dragging' | 'settling';
}

/**
 * Umsortieren per Greifpunkt — eigene Umsetzung auf Zeiger-Ereignissen.
 *
 * Warum nicht das eingebaute Drag & Drop des Browsers (wie vorher): das
 * funktioniert auf Touchgeräten überhaupt nicht — auf dem Handy war die
 * Rangliste damit schlicht nicht sortierbar — und ohne `dataTransfer` brechen
 * auch Desktop-Browser den Zug teilweise sofort ab. `pointerdown` +
 * `setPointerCapture` deckt Maus, Stift und Finger mit demselben Code ab.
 *
 * Alles läuft über React-Zustand, nichts wird manuell am DOM-Stil
 * herumgeschraubt (das war der Fehler in der Vorversion — siehe unten).
 * Fingerbewegungen werden auf den Bildschirm-Takt gedrosselt
 * (`requestAnimationFrame`), damit nie mehr als eine Aktualisierung pro
 * Bild passiert. Beim Loslassen rastet die Zeile per CSS-Übergang sichtbar
 * ein; die echte Reihenfolge wird ERST übernommen, wenn dieser Übergang
 * tatsächlich fertig ist (`transitionend`) — nicht nach einer geschätzten
 * Wartezeit. Genau der geschätzte `setTimeout` war vorher das Problem:
 * er räumte den provisorischen Stil auf, BEVOR React die neue Reihenfolge
 * gerendert hatte, und die Zeile zuckte für einen Frame an die alte
 * Position zurück, bevor sie an der richtigen einrastete.
 */
function CompletedList({ list }: { list: LibraryEntry[] }) {
  const setCompletedOrder = useLibrary((s) => s.setCompletedOrder);
  const [items, setItems] = useState(list);
  const [drag, setDrag] = useState<DragState | null>(null);
  const nodes = useRef(new Map<number, HTMLDivElement>());
  const dragRef = useRef<DragState | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingYRef = useRef(0);
  dragRef.current = drag;

  useEffect(() => {
    setItems((prev) => {
      const a = prev.map((e) => e.rootId).join(',');
      const b = list.map((e) => e.rootId).join(',');
      return a === b ? prev : list;
    });
  }, [list]);

  // Läuft der Bildschirm gerade weg (Navigation mitten im Zug) — angefangene
  // rAF-Anfrage nicht überleben lassen.
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  /** Zielposition aus der Mitte des gezogenen Eintrags ableiten. */
  function indexFor(d: DragState, centerY: number): number {
    let top = 0;
    for (let i = 0; i < d.others.length; i++) {
      const h = d.heights.get(d.others[i]) ?? 0;
      if (centerY < top + h / 2) return i;
      top += h + ROW_GAP;
    }
    return d.others.length;
  }

  /** Verschiebung eines NICHT gezogenen Eintrags während des Zugs. */
  function shiftFor(d: DragState, id: number): number {
    const from = d.startIndex;
    const to = d.targetIndex;
    if (from === to) return 0;
    const idxInOthers = d.others.indexOf(id);
    const h = (d.heights.get(d.id) ?? 0) + ROW_GAP;
    // `others` ist die Liste ohne den Gezogenen: alle, die zwischen alter und
    // neuer Position liegen, rücken um dessen Höhe auf bzw. ab.
    if (to > from && idxInOthers >= from && idxInOthers < to) return -h;
    if (to < from && idxInOthers >= to && idxInOthers < from) return h;
    return 0;
  }

  /** Wohin der gezogene Eintrag beim Loslassen einrasten würde. */
  function restingOffset(d: DragState): number {
    let top = 0;
    for (let i = 0; i < d.targetIndex; i++) top += (d.heights.get(d.others[i]) ?? 0) + ROW_GAP;
    return top - d.startTop;
  }

  /** Reihenfolge wirklich übernehmen — erst wenn die Einrast-Animation fertig ist. */
  function commitDrag(d: DragState) {
    if (d.targetIndex !== d.startIndex) {
      const nextIds = [...d.others];
      nextIds.splice(d.targetIndex, 0, d.id);
      const byId = new Map(items.map((e) => [e.rootId, e]));
      setItems(nextIds.map((rid) => byId.get(rid)!).filter(Boolean));
      setCompletedOrder(nextIds);
    }
    setDrag(null);
  }

  function onGrab(id: number, ev: ReactPointerEvent) {
    if (items.length < 2) return;
    ev.preventDefault();
    const handle = ev.currentTarget as HTMLElement;
    try {
      handle.setPointerCapture(ev.pointerId);
    } catch {
      // Manche Browser/Eingaben liefern eine Zeiger-ID, die sich nicht
      // einfangen lässt — darf den Zug nicht abbrechen, `pointermove` läuft
      // per Bubbling ohnehin weiter, nur ohne die Garantie, dass er auch
      // außerhalb des Griffs ankommt.
    }
    handleRef.current = handle;

    const heights = new Map<number, number>();
    let top = 0;
    let startTop = 0;
    const order = items.map((e) => e.rootId);
    order.forEach((rid) => {
      const el = nodes.current.get(rid);
      const h = el ? el.getBoundingClientRect().height : 0;
      heights.set(rid, h);
      if (rid === id) startTop = top;
      top += h + ROW_GAP;
    });

    const startIndex = order.indexOf(id);
    setDrag({
      id,
      others: order.filter((rid) => rid !== id),
      heights,
      startTop,
      startIndex,
      pointerStartY: ev.clientY,
      dy: 0,
      targetIndex: startIndex,
      phase: 'dragging',
    });
  }

  function onMove(ev: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d || d.phase !== 'dragging') return;
    pendingYRef.current = ev.clientY;
    // Höchstens eine Aktualisierung pro gezeichnetem Bild — mehr Auflösung
    // sieht der Bildschirm ohnehin nicht, und React bekommt nie mehr
    // Zeigerereignisse zugeworfen, als es verarbeiten kann.
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const cur = dragRef.current;
      if (!cur || cur.phase !== 'dragging') return;
      const dy = pendingYRef.current - cur.pointerStartY;
      const center = cur.startTop + dy + (cur.heights.get(cur.id) ?? 0) / 2;
      setDrag({ ...cur, dy, targetIndex: indexFor(cur, center) });
    });
  }

  function onRelease(ev: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d || d.phase !== 'dragging') return;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      handleRef.current?.releasePointerCapture(ev.pointerId);
    } catch {
      /* schon losgelassen — egal */
    }

    const resting = restingOffset(d);
    if (Math.abs(d.dy - resting) < 0.5) {
      // Nichts zu verschieben (z. B. reiner Klick auf den Griff): OHNE
      // Bewegung feuert nie ein `transitionend`, also hier sofort fertig
      // machen statt auf ein Ereignis zu warten, das nicht kommt.
      commitDrag(d);
      return;
    }
    setDrag({ ...d, phase: 'settling' });
  }

  /** Fängt auf, falls der Übergang aus irgendeinem Grund nie feuert
   *  (reduced-motion, ein verschlucktes Ereignis) — die Zeile darf nie
   *  dauerhaft in der Schwebe hängen bleiben. */
  useEffect(() => {
    if (!drag || drag.phase !== 'settling') return;
    const captured = drag;
    const id = window.setTimeout(() => {
      if (dragRef.current === captured) commitDrag(captured);
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  function onSettled(ev: ReactTransitionEvent<HTMLDivElement>) {
    if (ev.target !== ev.currentTarget || ev.propertyName !== 'transform') return;
    const d = dragRef.current;
    if (!d || d.phase !== 'settling') return;
    commitDrag(d);
  }

  return (
    <div className="panel panel--flush droplist">
      {items.map((e, i) => {
        const isDragged = drag?.id === e.rootId;
        let style: { transform: string; transition?: 'none' } | undefined;
        if (drag) {
          if (isDragged) {
            const y = drag.phase === 'settling' ? restingOffset(drag) : drag.dy;
            style = {
              transform: `translate3d(0, ${y}px, 0)`,
              // Während des aktiven Ziehens 1:1 dem Finger folgen, ohne
              // Verzögerung. Beim Einrasten (`settling`) wird diese
              // Eigenschaft bewusst WEGGELASSEN, statt sie manuell
              // zurückzusetzen — dann greift automatisch der normale
              // 240ms-Übergang der `.droprow`-Klasse, und React räumt den
              // vorherigen Inline-Wert selbst korrekt ab.
              transition: drag.phase === 'dragging' ? 'none' : undefined,
            };
          } else {
            const offset = shiftFor(drag, e.rootId);
            if (offset) style = { transform: `translate3d(0, ${offset}px, 0)` };
          }
        }
        return (
          <div
            key={e.rootId}
            ref={(el) => {
              if (el) nodes.current.set(e.rootId, el);
              else nodes.current.delete(e.rootId);
            }}
            className={`droprow${isDragged ? ' is-lifted' : ''}${
              drag && !isDragged ? ' is-sliding' : ''
            }`}
            style={style}
            onPointerMove={isDragged ? onMove : undefined}
            onPointerUp={isDragged ? onRelease : undefined}
            onPointerCancel={isDragged ? onRelease : undefined}
            onTransitionEnd={isDragged ? onSettled : undefined}
          >
            <CompletedRow
              entry={e}
              index={i}
              dragging={isDragged}
              onGrab={(ev) => onGrab(e.rootId, ev)}
            />
          </div>
        );
      })}
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
            {/* Kein Knopf mehr (Yunus 29.08.2026): der Schalter ist ein
                kleiner Kippschalter mit Beschriftung — er gehört zur Liste,
                statt als eigenes Bedienteil davor zu stehen. */}
            <div style={{ margin: '0 0 12px', paddingLeft: 4 }}>
              <button
                type="button"
                className={`toggleline${onlyFullyDone ? ' is-on' : ''}`}
                data-st="completed"
                role="switch"
                aria-checked={onlyFullyDone}
                onClick={() => setOnlyFullyDone((v) => !v)}
              >
                <span className="toggleline__track" aria-hidden="true">
                  <span className="toggleline__knob" />
                </span>
                <span className="toggleline__label">{t('geschautFilterAll')}</span>
                {onlyFullyDone && (
                  <span className="toggleline__count tnum">{filteredCompleted.length}</span>
                )}
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
