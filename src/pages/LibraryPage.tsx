import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EntryCard } from '@/components/EntryCard';
import { Icon } from '@/components/Icon';
import { Button, EmptyState, Segmented } from '@/components/kit';
import { useSearchOverlay } from '@/components/searchStore';
import { STATUS_THEME } from '@/domain/status';
import { useRoller } from '@/lib/useRoller';
import { useT } from '@/i18n';
import {
  entriesByStatus,
  entryCover,
  entryTitle,
  lastWatchedSeason,
  LIBRARY_TABS,
  useLibrary,
  watchedEpisodes,
  type LibraryEntry,
  type WatchStatus,
} from '@/store/library';

/**
 * DIE BIBLIOTHEK — das Archiv, nicht der Alltag.
 *
 * Home zeigt, was gerade läuft. Hier stehen die drei Kategorien, die dort
 * NICHT vorkommen: Geschaut, Fortsetzung folgt, Watchlist.
 *
 * „Geschaut" ist eine RANGLISTE, kein Poster-Raster. Das ist Absicht: eine
 * andere Kategorie soll sich auch anders anfühlen, nicht bloß anders färben.
 * Und ein Archiv ist eine Reihenfolge — deshalb hängt an jeder Zeile ein
 * Greifpunkt.
 */

const PANEL_ID = 'bibliothek-inhalt';

/**
 * Eine Zeile der Rangliste.
 *
 * Der Greifpunkt liegt NEBEN dem Link, nicht darin: ein Knopf innerhalb
 * eines Links ist ungültiges Markup, und die Tastatur käme an genau einen
 * der beiden nie heran.
 */
function RankRow({
  entry: e,
  index,
  dragging,
  dragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  entry: LibraryEntry;
  index: number;
  dragging: boolean;
  dragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (ev: React.DragEvent) => void;
  onDrop: (ev: React.DragEvent) => void;
}) {
  const t = useT();
  const season = lastWatchedSeason(e);
  const cover = season?.coverUrl ?? entryCover(e);
  const folgen = watchedEpisodes(e);

  const klassen = ['rank-row', dragging && 'is-dragging', dragOver && 'is-over']
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={klassen}
      data-st="completed"
      data-testid="rank-row"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="rank-grip"
        aria-label={t('dragToReorder')}
        title={t('dragToReorder')}
      >
        <Icon name="grip" size={18} />
      </button>

      <Link to={`/anime/${e.rootId}`} className="row-item" data-st="completed" draggable={false}>
        <span className="row-item__rank tnum" data-testid="rank">
          {index + 1}
        </span>
        <span className="row-item__art">
          {cover && <img src={cover} alt="" loading="lazy" decoding="async" />}
          <span className="seal-badge seal-badge--sm" aria-hidden>
            <Icon name="seal" size={14} filled />
          </span>
        </span>
        <span className="row-item__body">
          <span className="row-item__t">{entryTitle(e)}</span>
          <span className="row-item__s">
            <span>{folgen === 1 ? t('episodeOne') : t('cardEpisodes', { n: folgen })}</span>
            <span className="dot" aria-hidden />
            <span>
              {e.seasons.length === 1
                ? t('seasonOneCount')
                : t('seasonsCount', { n: e.seasons.length })}
            </span>
          </span>
        </span>
        <span className="row-item__end">
          {/* Gold und ein Stern — in dieser Version bedeutet Gold GENAU eine
              Sache: Wertung. Eine grüne Siegel-Marke mit einer 9 darin läse
              sich wie ein Status, nicht wie eine Note. */}
          {e.rating != null && (
            <span className="rating-tag tnum">
              <Icon name="star" size={12} filled />
              {e.rating}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/**
 * Die Rangliste mit ihrer Arbeitskopie.
 *
 * Beim Ziehen wird lokal umsortiert, damit man sofort sieht, wohin es geht;
 * erst beim Loslassen wandert die fertige Reihenfolge in den Store.
 */
function RankList({ list }: { list: LibraryEntry[] }) {
  const setCompletedOrder = useLibrary((s) => s.setCompletedOrder);
  const [items, setItems] = useState(list);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  useEffect(() => {
    // Nur übernehmen, wenn sich die MENGE geändert hat — sonst würde jedes
    // Rendern des Elternteils die gerade gezogene Reihenfolge zurücksetzen.
    setItems((prev) => {
      const vorher = prev.map((e) => e.rootId).join(',');
      const nachher = list.map((e) => e.rootId).join(',');
      return vorher === nachher ? prev : list;
    });
  }, [list]);

  function drop(zielId: number) {
    if (draggingId != null && draggingId !== zielId) {
      const von = items.findIndex((e) => e.rootId === draggingId);
      const nach = items.findIndex((e) => e.rootId === zielId);
      if (von !== -1 && nach !== -1) {
        const next = [...items];
        const [bewegt] = next.splice(von, 1);
        next.splice(nach, 0, bewegt);
        setItems(next);
        setCompletedOrder(next.map((e) => e.rootId));
      }
    }
    setDraggingId(null);
    setOverId(null);
  }

  return (
    <ul className="panel panel--flush ranklist">
      {items.map((e, i) => (
        <RankRow
          key={e.rootId}
          entry={e}
          index={i}
          dragging={draggingId === e.rootId}
          dragOver={overId === e.rootId && draggingId !== e.rootId}
          onDragStart={() => setDraggingId(e.rootId)}
          onDragEnd={() => {
            setDraggingId(null);
            setOverId(null);
          }}
          // Der Greifpunkt startet den Zug, die ZEILE nimmt ihn entgegen —
          // sonst müsste man exakt den kleinen Griff des Ziels treffen.
          onDragOver={(ev) => {
            if (draggingId == null || draggingId === e.rootId) return;
            ev.preventDefault();
            if (overId !== e.rootId) setOverId(e.rootId);
          }}
          onDrop={(ev) => {
            ev.preventDefault();
            drop(e.rootId);
          }}
        />
      ))}
    </ul>
  );
}

export function LibraryPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const completedOrder = useLibrary((s) => s.completedOrder);
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();

  // `null` heißt „noch nicht gewählt". Der Unterschied ist wichtig: die
  // Startkategorie darf ausweichen, eine ANGETIPPTE nie — sonst schnappt die
  // Leiste zurück und eine leere Kategorie ist überhaupt nicht erreichbar.
  const [tab, setTab] = useState<WatchStatus | null>(null);
  const [nurFertig, setNurFertig] = useState(false);

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const gesamt = Object.keys(entries).length;

  /**
   * „Geschaut" zeigt alles, was mindestens EINE Staffel komplett durch hat —
   * auch, wenn der Eintrag selbst gerade woanders steht. Ein Franchise, das
   * bei Staffel 2 hängt, hat Staffel 1 trotzdem gesehen; ohne diese
   * Zusammenführung verschwände sie aus dem Archiv.
   *
   * Danach greift die von Hand gezogene Reihenfolge; alles Unsortierte fällt
   * nach Aktualität ans Ende.
   */
  const geschaut = useMemo(() => {
    const zusammen = [
      ...byStatus.completed,
      ...byStatus.continuation.filter((e) => lastWatchedSeason(e) !== undefined),
      ...byStatus.nextup.filter((e) => lastWatchedSeason(e) !== undefined),
      ...byStatus.watching.filter((e) => lastWatchedSeason(e) !== undefined),
    ];
    const rang = new Map(completedOrder.map((id, i) => [id, i]));
    return zusammen.sort((a, b) => {
      const ra = rang.get(a.rootId) ?? Infinity;
      const rb = rang.get(b.rootId) ?? Infinity;
      return ra !== rb ? ra - rb : b.updatedAt - a.updatedAt;
    });
  }, [byStatus, completedOrder]);

  /** Der Filter blendet aus, was noch einen offenen Posten hat. */
  const gefiltert = useMemo(
    () => (nurFertig ? geschaut.filter((e) => e.status !== 'nextup' && e.status !== 'watching') : geschaut),
    [geschaut, nurFertig],
  );

  const zaehler: Record<WatchStatus, number> = {
    watching: byStatus.watching.length,
    nextup: byStatus.nextup.length,
    planned: byStatus.planned.length,
    continuation: byStatus.continuation.length,
    completed: geschaut.length,
  };

  // Beim Öffnen die erste Kategorie zeigen, in der etwas liegt — eine leere
  // Bibliothek zu begrüßen, obwohl nebenan 40 Titel stehen, wäre unsinnig.
  const aktiv = tab ?? LIBRARY_TABS.find((s) => zaehler[s] > 0) ?? 'completed';

  const watchlist = byStatus.planned;
  const roller = useRoller(useMemo(() => watchlist.map((e) => e.rootId), [watchlist]));

  if (hydrated && gesamt === 0) {
    return (
      <>
        <header className="pagehead">
          <h1 className="h-large">{t('libraryTitle')}</h1>
        </header>
        <EmptyState
          status="planned"
          title={t('libraryEmptyTitle')}
          hint={t('libraryEmptyHint')}
          action={
            <Button variant="primary" icon="search" onClick={openSearch}>
              {t('libraryEmptyCta')}
            </Button>
          }
        />
      </>
    );
  }

  const liste = aktiv === 'completed' ? gefiltert : byStatus[aktiv];

  return (
    <>
      <header className="pagehead">
        <h1 className="h-large">{t('libraryTitle')}</h1>
        <p className="sub">{t('librarySub', { n: gesamt })}</p>
      </header>

      <Segmented
        label={t('libraryTitle')}
        value={aktiv}
        onChange={setTab}
        panelId={PANEL_ID}
        options={LIBRARY_TABS.map((key) => ({
          key,
          label: t(STATUS_THEME[key].labelKey),
          count: zaehler[key],
          icon: STATUS_THEME[key].icon,
        }))}
      />

      <div
        className="panel-body"
        data-st={aktiv}
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`tab-${aktiv}`}
      >
        {liste.length === 0 ? (
          <EmptyState
            status={aktiv}
            title={t('libraryNothingIn', { s: t(STATUS_THEME[aktiv].labelKey) })}
            hint={t('libraryNothingHint')}
            action={
              <Button variant="primary" icon="search" onClick={openSearch}>
                {t('libraryEmptyCta')}
              </Button>
            }
          />
        ) : aktiv === 'completed' ? (
          <>
            <div className="libbar">
              <button
                type="button"
                className={`chip${nurFertig ? ' is-on' : ''}`}
                data-st="completed"
                aria-pressed={nurFertig}
                onClick={() => setNurFertig((v) => !v)}
              >
                {nurFertig && <Icon name="check" size={14} />}
                {t('geschautFilterAll')}
                {nurFertig && <span className="tnum">{gefiltert.length}</span>}
              </button>
            </div>
            <p className="muted libnote">{t('libraryRankHint')}</p>
            <RankList key={String(nurFertig)} list={gefiltert} />
          </>
        ) : aktiv === 'continuation' ? (
          <>
            <p className="muted libnote">{t('libraryWaitingHint')}</p>
            <div className="grid grid--roomy">
              {liste.map((e) => (
                <EntryCard key={e.rootId} entry={e} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="libbar">
              <Button
                variant="primary"
                icon="dice"
                size="sm"
                disabled={roller.rolling}
                onClick={roller.roll}
              >
                {t('randomPickBtn')}
              </Button>
              <Button icon="plus" size="sm" onClick={openSearch}>
                {t('add')}
              </Button>
            </div>
            <div className="grid grid--roomy">
              {liste.map((e) => (
                <EntryCard key={e.rootId} entry={e} justAdded={roller.highlightId === e.rootId} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
