import { useEffect, useRef, useState } from 'react';
import {
  currentSeason,
  STATUS_KEY,
  STATUS_ORDER,
  useLibrary,
  type WatchStatus,
} from '@/store/library';
import { useToasts } from '@/store/toast';
import { useT } from '@/i18n';
import { ConfirmDialog } from './ui';
import { IconCheck, IconMinus, IconMore, IconPlay, IconPlus, IconTrash } from './icons';

/** Statusfarben — Palette aus V1: Neon, Purple, Pink, Blau, Grün. */
export const STATUS_DOT: Record<WatchStatus, string> = {
  watching: 'bg-accent',
  planned: 'bg-purple',
  nextup: 'bg-pink',
  continuation: 'bg-blue',
  completed: 'bg-green',
};

/** Aktiv-Stil je Status im „Manuell verschieben“-Raster — dieselbe Farbwelt. */
const STATUS_ACTIVE_CLS: Record<WatchStatus, string> = {
  watching: 'border-accent/60 bg-accent/10 text-accent',
  planned: 'border-purple/60 bg-purple/10 text-purple',
  nextup: 'border-pink/60 bg-pink/10 text-pink',
  continuation: 'border-blue/60 bg-blue/10 text-blue',
  completed: 'border-green/60 bg-green/10 text-green',
};

/**
 * „Manuell verschieben“ — ein kompaktes Popover mit allen sechs Status als
 * farbiges Kachel-Raster (statt der alten schmucklosen Liste). Ergänzt die
 * kontextuellen Shortcut-Buttons für den Fall, dass jemand doch bewusst in
 * eine „unpassende“ Kategorie wechseln will.
 */
function MoveToMenu({ rootId, currentStatus }: { rootId: number; currentStatus: WatchStatus }) {
  const setStatus = useLibrary((s) => s.setStatus);
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('moveTo')}
        title={t('moveTo')}
        className="inline-flex shrink-0 items-center justify-center rounded-ctl border border-line bg-surface p-2.5 text-ink-faint transition-colors duration-150 hover:border-ink-faint hover:text-ink-dim"
      >
        <IconMore className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="unfold absolute right-0 top-full z-overlay mt-1.5 w-64 rounded-card border border-line bg-raised p-3 shadow-xl"
        >
          <p className="mb-2.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            {t('moveTo')}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_ORDER.map((s) => {
              const active = s === currentStatus;
              return (
                <button
                  key={s}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setStatus(rootId, s);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-ctl border px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors duration-150 ${
                    active ? STATUS_ACTIVE_CLS[s] : 'border-line text-ink-dim hover:border-ink-faint hover:text-ink'
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s]}`} />
                  <span className="truncate">{t(STATUS_KEY[s])}</span>
                  {active && <IconCheck className="ml-auto h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Kontextsensitive Shortcut-Leiste für bereits getrackte Franchises — statt
 * eines Dropdowns mit allen sechs Status (inkl. sinnfreier Sprünge wie
 * "Schaue ich" → "Watchlist") gibt es nur die Aktionen, die vom aktuellen
 * Status aus tatsächlich Sinn ergeben, direkt als antippbare Buttons.
 */
export function QuickActions({ rootId }: { rootId: number }) {
  const entry = useLibrary((s) => s.entries[rootId]);
  const setStatus = useLibrary((s) => s.setStatus);
  const remove = useLibrary((s) => s.remove);
  const push = useToasts((s) => s.push);
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirmDelete) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setConfirmDelete(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDelete(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [confirmDelete]);

  if (!entry) return null;

  type Action = { key: string; label: string; Icon: typeof IconPlay; onClick: () => void; hoverCls: string };
  const actions: Action[] = [];
  if (entry.status === 'watching') {
    actions.push({
      key: 'complete',
      label: t('markCompleteBtn'),
      Icon: IconCheck,
      onClick: () => setStatus(rootId, 'completed'),
      hoverCls: 'hover:border-green/50 hover:text-green',
    });
  } else if (entry.status === 'planned' || entry.status === 'nextup') {
    actions.push({
      key: 'watch',
      label: t('watchNowBtn'),
      Icon: IconPlay,
      onClick: () => setStatus(rootId, 'watching'),
      hoverCls: 'hover:border-accent/50 hover:text-accent',
    });
  }

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-2">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-ctl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink-dim">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[entry.status]}`} />
        {t(STATUS_KEY[entry.status])}
      </span>
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={a.onClick}
          className={`inline-flex shrink-0 items-center gap-2 rounded-ctl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 ${a.hoverCls}`}
        >
          <a.Icon className="h-4 w-4" />
          {a.label}
        </button>
      ))}
      <MoveToMenu rootId={rootId} currentStatus={entry.status} />
      <button
        type="button"
        aria-label={t('remove')}
        title={t('remove')}
        onClick={() => setConfirmDelete(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-ctl border border-line bg-surface p-2.5 text-ink-faint transition-colors duration-150 hover:border-rose/50 hover:text-rose"
      >
        <IconTrash className="h-4 w-4" />
      </button>
      {confirmDelete && (
        <ConfirmDialog
          title={t('removeConfirm')}
          confirmLabel={t('removeConfirmYes')}
          cancelLabel={t('cancel')}
          danger
          onConfirm={() => {
            remove(rootId);
            push(t('removedToast'));
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

/**
 * Episoden-Stepper: −/+ UND direkt editierbare Zahl in der Mitte —
 * anklicken, Zahl eintippen, Enter (oder Feld verlassen) übernimmt.
 */
export function EpisodeStepper({ rootId }: { rootId: number }) {
  const entry = useLibrary((s) => s.entries[rootId]);
  const setProgress = useLibrary((s) => s.setProgress);
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  if (!entry) return null;

  const season = currentSeason(entry);
  const max = season?.episodes ?? null;
  const atMax = max !== null && entry.progress >= max;

  const commit = () => {
    if (draft !== null) {
      const n = parseInt(draft, 10);
      if (Number.isFinite(n)) setProgress(rootId, n);
    }
    setDraft(null);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-ctl border border-line bg-surface p-1">
      <button
        type="button"
        aria-label="−1"
        disabled={entry.progress <= 0}
        onClick={() => setProgress(rootId, entry.progress - 1)}
        className="grid h-9 w-9 place-items-center rounded-[6px] text-ink-dim transition-colors duration-150 hover:bg-raised hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <span className="flex min-w-[84px] items-center justify-center text-sm font-semibold tabular-nums text-ink">
        <input
          ref={inputRef}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Episode"
          value={draft ?? String(entry.progress)}
          onFocus={(e) => {
            setDraft(String(entry.progress));
            e.target.select();
          }}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
              inputRef.current?.blur();
            }
            if (e.key === 'Escape') {
              setDraft(null);
              inputRef.current?.blur();
            }
          }}
          className="w-9 rounded-[4px] bg-transparent text-center outline-none transition-colors duration-150 focus:bg-raised"
        />
        <span className="font-normal text-ink-faint">/ {max ?? '?'}</span>
      </span>
      <button
        type="button"
        aria-label="+1"
        disabled={atMax}
        onClick={() => setProgress(rootId, entry.progress + 1)}
        className="grid h-9 w-9 place-items-center rounded-[6px] text-accent transition-colors duration-150 hover:bg-raised disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <IconPlus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** 1–10 persönliche Wertung als kompakter Segment-Streifen. */
export function RatingStrip({ rootId }: { rootId: number }) {
  const entry = useLibrary((s) => s.entries[rootId]);
  const setRating = useLibrary((s) => s.setRating);
  const t = useT();
  if (!entry) return null;

  return (
    <div className="flex items-center gap-[3px]" role="radiogroup" aria-label={t('yourRating')}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = entry.rating !== null && n <= entry.rating;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={entry.rating === n}
            aria-label={`${n} / 10`}
            onClick={() => setRating(rootId, entry.rating === n ? null : n)}
            className={`h-6 w-4 rounded-[3px] transition-colors duration-150 ${
              active ? 'bg-accent' : 'bg-raised hover:bg-line'
            }`}
          />
        );
      })}
      <span className="ml-2 w-8 text-sm font-semibold tabular-nums text-ink">
        {entry.rating ?? '–'}
      </span>
    </div>
  );
}
