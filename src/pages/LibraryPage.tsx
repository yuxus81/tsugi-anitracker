import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  currentSeason,
  entriesByStatus,
  entryCover,
  entryTitle,
  lastWatchedSeason,
  LIBRARY_TABS,
  releaseLabel,
  STATUS_KEY,
  useLibrary,
  type LibraryEntry,
  type WatchStatus,
} from '@/store/library';
import { formatLabel } from '@/api/types';
import { entryQuery, useDisplayTitle } from '@/store/titles';
import { STATUS_DOT } from '@/components/TrackControls';
import { EmptyState, PageTitle } from '@/components/ui';
import { useSearchOverlay } from '@/components/searchStore';
import { useLocale, useSettings, useT } from '@/i18n';
import {
  IconFilm,
  IconGrip,
  IconPause,
  IconPlay,
  IconSearch,
  IconSparkle,
  IconStack,
  IconStar,
} from '@/components/icons';

/**
 * Abgeschlossen — „Hall of Fame“: nummerierte Rangliste, großes Cover, Sterne
 * und persönliche Note, Gold→Grün-Unterstrich. Kein Siegel/Haken mehr — der
 * Rang selbst ist die Auszeichnung. Per Greifpunkt links draggable, damit sich
 * die Rangliste frei sortieren lässt (die eigentliche Reihenfolge kommt vom
 * Elternteil, siehe `CompletedList`).
 */
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
  const locale = useLocale();
  const season = lastWatchedSeason(entry);
  const linkId = season?.id ?? entry.rootId;
  const cov = season?.coverUrl ?? entryCover(entry);
  const stars = entry.rating != null ? Math.round(entry.rating / 2) : 0;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));

  // Franchise ist „fertig geschaut“, hat aber laut Scan eine angekündigte
  // Fortsetzung — beide Wahrheiten gehören auf diese Karte.
  const upcoming = entry.status === 'continuation' ? currentSeason(entry) : undefined;
  const upcomingWhen = upcoming ? releaseLabel(upcoming, locale) : null;

  return (
    <div
      className={`flex items-stretch gap-1 rounded-card border border-gold/20 bg-gradient-to-r from-gold/[0.06] via-surface to-surface transition-[opacity,border-color] duration-150 hover:border-gold/45 ${
        dragProps.dragging ? 'opacity-40' : ''
      } ${dragProps.dragOver ? 'ring-2 ring-gold/60' : ''}`}
    >
      <button
        type="button"
        draggable
        onDragStart={dragProps.onHandleDragStart}
        onDragEnd={dragProps.onHandleDragEnd}
        aria-label={t('dragToReorder')}
        title={t('dragToReorder')}
        className="flex shrink-0 cursor-grab touch-none items-center px-1.5 text-ink-faint/50 transition-colors duration-150 hover:text-gold active:cursor-grabbing sm:px-2"
      >
        <IconGrip className="h-4 w-4" />
      </button>
      <Link
        to={`/anime/${linkId}`}
        draggable={false}
        className="group flex min-w-0 flex-1 items-center gap-3 py-4 pr-3 sm:gap-5 sm:pr-5"
      >
        <span className="w-7 shrink-0 text-center font-display text-[28px] font-semibold leading-none text-gold sm:w-11 sm:text-[38px]">
          {index + 1}
        </span>
        <span className="block h-[104px] w-[72px] shrink-0 overflow-hidden rounded-[10px] bg-raised shadow-[0_10px_24px_-12px_rgba(0,0,0,0.7)]">
          {cov && <img src={cov} alt="" className="h-full w-full object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-ink sm:text-[17px]">{title}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-dim">
            {season ? t('watchedUpToTitle', { t: season.title }) : t('seasonOne')}
          </p>
          {entry.rating != null && (
            <div className="mt-2 flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <IconStar
                  key={i}
                  className={`h-3.5 w-3.5 ${i < stars ? 'text-gold' : 'text-ink-faint/40'}`}
                  fill={i < stars ? 'currentColor' : 'none'}
                />
              ))}
              <span className="ml-1.5 text-[12px] font-semibold tabular-nums text-gold">
                {entry.rating}/10
              </span>
            </div>
          )}
          {upcoming && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue/20 to-purple/20 px-2.5 py-1 text-[10.5px] font-bold text-blue">
              <IconSparkle className="h-3 w-3" />
              {upcomingWhen ? t('continuationComing', { when: upcomingWhen }) : t('continuationComingSoon')}
            </span>
          )}
          <div className="mt-2 h-[2px] w-16 rounded-full bg-gradient-to-r from-gold to-green" />
        </div>
      </Link>
    </div>
  );
}

/**
 * Trägt die per Drag & Drop sortierbare Rangliste. Hält eine lokale
 * Arbeitskopie für sofortiges visuelles Feedback beim Ziehen; committet die
 * fertige Reihenfolge erst beim Loslassen in den Store (localStorage).
 */
function CompletedList({ list }: { list: LibraryEntry[] }) {
  const setCompletedOrder = useLibrary((s) => s.setCompletedOrder);
  const [items, setItems] = useState(list);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  useEffect(() => {
    setItems((prev) => {
      const prevIds = prev.map((e) => e.rootId).join(',');
      const nextIds = list.map((e) => e.rootId).join(',');
      return prevIds === nextIds ? prev : list;
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
    <ul className="space-y-3">
      {items.map((e, i) => (
        <li
          key={e.rootId}
          className="stagger-in"
          style={{ ['--i' as string]: Math.min(i, 12) }}
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
        </li>
      ))}
    </ul>
  );
}

/**
 * Pausiert — „Eingefroren“: entsättigtes Cover mit Frost-Overlay und Pause-Glyph,
 * ein Fortschrittsbalken zeigt, wo man stehen geblieben ist. Beim Hover taut das
 * Cover auf und „Fortsetzen“ erscheint.
 */
function PausedRow({ entry, index }: { entry: LibraryEntry; index: number }) {
  const t = useT();
  const setStatus = useLibrary((s) => s.setStatus);
  const season = currentSeason(entry);
  const linkId = season?.id ?? entry.rootId;
  const cov = entryCover(entry);
  const pct = season?.episodes ? Math.min(100, Math.round((entry.progress / season.episodes) * 100)) : 0;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));

  return (
    <li className="stagger-in" style={{ ['--i' as string]: Math.min(index, 12) }}>
      <Link
        to={`/anime/${linkId}`}
        className="group flex items-center gap-4 rounded-card border border-dashed border-amber/40 bg-surface px-3 py-3.5 transition-colors duration-150 hover:border-amber/70 sm:px-4"
      >
        <span className="relative block h-[88px] w-[62px] shrink-0 overflow-hidden rounded-[9px] bg-raised">
          {cov && (
            <img
              src={cov}
              alt=""
              className="h-full w-full object-cover saturate-[0.3] brightness-[0.8] transition-[filter] duration-300 group-hover:saturate-100 group-hover:brightness-100"
            />
          )}
          <span className="absolute inset-0 grid place-items-center bg-bg/25 transition-opacity duration-300 group-hover:opacity-0">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bg/70 text-amber backdrop-blur-sm">
              <IconPause className="h-3.5 w-3.5" />
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink-dim">{title}</p>
          <p className="mt-0.5 truncate text-xs text-ink-faint">
            {season?.episodes
              ? t('pausedAtEp', { n: entry.progress, t: season.episodes })
              : t('episodesSeen', { n: entry.progress })}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-amber to-gold"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-amber">{pct}%</span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setStatus(entry.rootId, 'watching');
          }}
          className="hidden shrink-0 rounded-full border border-amber/40 px-3 py-1.5 text-[12px] font-semibold text-amber opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:inline-block"
        >
          {t('resumeBtn')}
        </button>
      </Link>
    </li>
  );
}

/**
 * Fortsetzung folgt — Countdown-Kachel (Poster-Format wie „Noch zu schauen“):
 * großes Cover, Blau-Violett-Schleier, und direkt auf der Karte, was kommt
 * (Film oder Staffel) und wann. Kein flaches Listen-Layout — dieses eine Tab
 * ist ein Raster.
 */
function ContinuationTile({ entry, index }: { entry: LibraryEntry; index: number }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const locale = useLocale();
  const upcoming = currentSeason(entry);
  const linkId = upcoming?.id ?? entry.rootId;
  const cov = entryCover(entry);
  const isFilm = upcoming?.format === 'MOVIE';
  const typeLabel = isFilm
    ? formatLabel('MOVIE', lang)
    : entry.seasons.length > 1
      ? `${formatLabel('TV', lang)} ${entry.seasonIndex + 1}`
      : formatLabel('TV', lang);
  const when = upcoming ? releaseLabel(upcoming, locale) : null;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));

  return (
    <div className="stagger-in" style={{ ['--i' as string]: Math.min(index, 12) }}>
      <Link
        to={`/anime/${linkId}`}
        className="group relative block aspect-[2/3] overflow-hidden rounded-card bg-raised shadow-[0_16px_34px_-20px_rgba(58,134,255,0.6)] ring-1 ring-blue/25 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:ring-blue/55"
      >
        {cov && (
          <img
            src={cov}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/35 to-blue/25" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-bg/70 px-2 py-0.5 text-[10.5px] font-bold text-blue backdrop-blur-sm">
          {isFilm ? <IconFilm className="h-2.5 w-2.5" /> : <IconStack className="h-2.5 w-2.5" />}
          {typeLabel}
        </span>
        <span className="absolute inset-x-0 bottom-0 p-3">
          <span className="block line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink drop-shadow">
            {title}
          </span>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue to-purple px-2.5 py-1 text-[11px] font-bold text-ink">
            <span className="blink-dot h-1.5 w-1.5 rounded-full bg-ink" />
            {when ? t('announcedFor', { when }) : t('waitingForSequel')}
          </span>
        </span>
      </Link>
    </div>
  );
}

/**
 * Noch zu schauen — „Bereit-Regal“: kräftiger Pink-Akzent, Typ-Chip (Film/Staffel)
 * und ein großer Play-Knopf als klare Handlungsaufforderung.
 */
function NextupRow({ entry, index }: { entry: LibraryEntry; index: number }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const season = currentSeason(entry);
  const linkId = season?.id ?? entry.rootId;
  const cov = entryCover(entry);
  const isFilm = season?.format === 'MOVIE';
  const typeLabel = isFilm
    ? formatLabel('MOVIE', lang)
    : entry.seasons.length > 1
      ? t('seasonN', { n: entry.seasonIndex + 1 })
      : null;
  const title = useDisplayTitle(entryQuery(entry), entryTitle(entry));

  return (
    <li className="stagger-in" style={{ ['--i' as string]: Math.min(index, 12) }}>
      <Link
        to={`/anime/${linkId}`}
        className="group flex items-center gap-4 rounded-card border border-pink/30 bg-gradient-to-r from-pink/[0.08] to-surface px-3 py-3.5 shadow-[0_16px_34px_-24px_rgba(255,0,85,0.7)] transition-colors duration-150 hover:border-pink/55 sm:px-4"
      >
        <span className="block h-[84px] w-[60px] shrink-0 overflow-hidden rounded-[9px] bg-raised shadow-[0_0_0_2px_rgba(255,0,85,0.4)]">
          {cov && <img src={cov} alt="" className="h-full w-full object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {typeLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[10.5px] font-semibold text-ink-dim">
                {isFilm && <IconFilm className="h-2.5 w-2.5" />}
                {typeLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-pink/15 px-2.5 py-0.5 text-[11px] font-semibold text-pink">
              {t('newSeasonReady')}
            </span>
          </span>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink text-ink shadow-glow-pink transition-transform duration-150 group-hover:scale-105">
          <IconPlay className="h-4 w-4 translate-x-[1px]" />
        </span>
      </Link>
    </li>
  );
}

export function LibraryPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const completedOrder = useLibrary((s) => s.completedOrder);
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  const [tab, setTab] = useState<WatchStatus>('completed');

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const total = Object.keys(entries).length;

  // „Abgeschlossen“ zeigt zusätzlich Einträge mit angekündigter Fortsetzung —
  // die haben alles Veröffentlichte bereits geschaut, tauchen aber sonst nur
  // unter „Fortsetzung folgt“ auf. Beides gleichzeitig ist der Punkt. Danach
  // greift die manuelle Drag-&-Drop-Reihenfolge; neue/unsortierte Einträge
  // fallen ans Ende (nach Aktualität sortiert).
  const completedList = useMemo(() => {
    const merged = [
      ...byStatus.completed,
      ...byStatus.continuation.filter((e) => lastWatchedSeason(e) !== undefined),
    ];
    const rank = new Map(completedOrder.map((id, i) => [id, i]));
    return merged.sort((a, b) => {
      const ra = rank.has(a.rootId) ? rank.get(a.rootId)! : Infinity;
      const rb = rank.has(b.rootId) ? rank.get(b.rootId)! : Infinity;
      if (ra !== rb) return ra - rb;
      return b.updatedAt - a.updatedAt;
    });
  }, [byStatus, completedOrder]);

  const counts: Record<WatchStatus, number> = {
    ...Object.fromEntries(Object.keys(byStatus).map((k) => [k, byStatus[k as WatchStatus].length])),
    completed: completedList.length,
  } as Record<WatchStatus, number>;

  // Nie auf einem leeren Tab öffnen, wenn woanders etwas liegt.
  const activeTab = counts[tab] > 0 ? tab : (LIBRARY_TABS.find((s) => counts[s] > 0) ?? tab);
  const list = activeTab === 'completed' ? completedList : byStatus[activeTab];

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
              <span className="tabular-nums opacity-70">{counts[s]}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={t('libraryNothingIn', { s: t(STATUS_KEY[activeTab]) })}
          hint={t('libraryNothingHint')}
        />
      ) : activeTab === 'continuation' ? (
        <div key={activeTab} className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((e, i) => (
            <ContinuationTile key={e.rootId} entry={e} index={i} />
          ))}
        </div>
      ) : activeTab === 'completed' ? (
        <CompletedList key={activeTab} list={list} />
      ) : (
        <ul key={activeTab} className="space-y-3">
          {activeTab === 'paused' &&
            list.map((e, i) => <PausedRow key={e.rootId} entry={e} index={i} />)}
          {activeTab === 'nextup' &&
            list.map((e, i) => <NextupRow key={e.rootId} entry={e} index={i} />)}
        </ul>
      )}
    </div>
  );
}
