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
import { IconCheck, IconChevronDown, IconMinus, IconPlus, IconTrash } from './icons';

/** Statusfarben — Palette aus V1: Neon, Purple, Pink, Blau, Grün, Amber. */
export const STATUS_DOT: Record<WatchStatus, string> = {
  watching: 'bg-accent',
  planned: 'bg-purple',
  nextup: 'bg-pink',
  continuation: 'bg-blue',
  completed: 'bg-green',
  paused: 'bg-amber',
};

/** Status-Dropdown für bereits getrackte Franchises (inkl. Entfernen). */
export function StatusMenu({ rootId }: { rootId: number }) {
  const entry = useLibrary((s) => s.entries[rootId]);
  const setStatus = useLibrary((s) => s.setStatus);
  const remove = useLibrary((s) => s.remove);
  const push = useToasts((s) => s.push);
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

  if (!entry) return null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-ctl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:border-accent"
      >
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[entry.status]}`} />
        {t(STATUS_KEY[entry.status])}
        <IconChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className="unfold absolute left-0 top-full z-overlay mt-1.5 w-60 overflow-hidden rounded-card border border-line bg-raised py-1.5 shadow-xl"
        >
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              role="menuitem"
              type="button"
              onClick={() => {
                setStatus(rootId, s);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink transition-colors duration-150 hover:bg-surface"
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              {t(STATUS_KEY[s])}
              {entry.status === s && <IconCheck className="ml-auto h-4 w-4 text-accent" />}
            </button>
          ))}
          <div className="mx-3.5 my-1.5 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              remove(rootId);
              push(t('removedToast'));
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-rose transition-colors duration-150 hover:bg-surface"
          >
            <IconTrash className="h-4 w-4" />
            {t('remove')}
          </button>
        </div>
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
