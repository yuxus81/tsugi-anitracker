import { useEffect, useRef, useState } from 'react';
import type { MediaCard } from '@/api/types';
import {
  STATUS_LABEL,
  STATUS_ORDER,
  useLibrary,
  type WatchStatus,
} from '@/store/library';
import { useToasts } from '@/store/toast';
import { IconCheck, IconChevronDown, IconMinus, IconPlus, IconTrash } from './icons';

export const STATUS_DOT: Record<WatchStatus, string> = {
  watching: 'bg-jade',
  planned: 'bg-blue',
  completed: 'bg-ink-dim',
  paused: 'bg-amber',
  dropped: 'bg-rose',
};

/**
 * Status control: an "Hinzufügen" split affordance for untracked media, a
 * status dropdown for tracked ones. Same vocabulary on every screen.
 */
export function StatusMenu({ media }: { media: MediaCard }) {
  const entry = useLibrary((s) => s.entries[media.id]);
  const add = useLibrary((s) => s.add);
  const setStatus = useLibrary((s) => s.setStatus);
  const remove = useLibrary((s) => s.remove);
  const push = useToasts((s) => s.push);
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

  const choose = (status: WatchStatus) => {
    if (entry) {
      setStatus(media.id, status);
    } else {
      add(media, status);
      push(`Zu „${STATUS_LABEL[status]}“ hinzugefügt`);
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-2 rounded-ctl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
          entry
            ? 'border border-line bg-surface text-ink hover:border-jade'
            : 'bg-jade-deep text-ink hover:brightness-110'
        }`}
      >
        {entry ? (
          <>
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[entry.status]}`} />
            {STATUS_LABEL[entry.status]}
          </>
        ) : (
          <>
            <IconPlus className="h-4 w-4" />
            Hinzufügen
          </>
        )}
        <IconChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-overlay mt-1.5 w-56 overflow-hidden rounded-card border border-line bg-raised py-1.5 shadow-xl"
        >
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              role="menuitem"
              type="button"
              onClick={() => choose(s)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink transition-colors duration-150 hover:bg-surface"
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              {STATUS_LABEL[s]}
              {entry?.status === s && <IconCheck className="ml-auto h-4 w-4 text-jade" />}
            </button>
          ))}
          {entry && (
            <>
              <div className="mx-3.5 my-1.5 border-t border-line" />
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  remove(media.id);
                  push('Aus der Bibliothek entfernt');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-rose transition-colors duration-150 hover:bg-surface"
              >
                <IconTrash className="h-4 w-4" />
                Entfernen
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** −/+ episode stepper with the count as the centerpiece. */
export function EpisodeStepper({ mediaId }: { mediaId: number }) {
  const entry = useLibrary((s) => s.entries[mediaId]);
  const setProgress = useLibrary((s) => s.setProgress);
  if (!entry) return null;

  const max = entry.episodes;
  const atMax = max !== null && entry.progress >= max;

  return (
    <div className="inline-flex items-center gap-1 rounded-ctl border border-line bg-surface p-1">
      <button
        type="button"
        aria-label="Eine Episode zurück"
        disabled={entry.progress <= 0}
        onClick={() => setProgress(mediaId, entry.progress - 1)}
        className="grid h-9 w-9 place-items-center rounded-[6px] text-ink-dim transition-colors duration-150 hover:bg-raised hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <span className="min-w-[76px] text-center text-sm font-semibold tabular-nums text-ink">
        {entry.progress}
        <span className="font-normal text-ink-faint"> / {max ?? '?'}</span>
      </span>
      <button
        type="button"
        aria-label="Episode gesehen"
        disabled={atMax}
        onClick={() => setProgress(mediaId, entry.progress + 1)}
        className="grid h-9 w-9 place-items-center rounded-[6px] text-jade transition-colors duration-150 hover:bg-raised disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <IconPlus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** 1–10 personal rating as a compact segmented strip. */
export function RatingStrip({ mediaId }: { mediaId: number }) {
  const entry = useLibrary((s) => s.entries[mediaId]);
  const setRating = useLibrary((s) => s.setRating);
  if (!entry) return null;

  return (
    <div className="flex items-center gap-[3px]" role="radiogroup" aria-label="Deine Wertung">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = entry.rating !== null && n <= entry.rating;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={entry.rating === n}
            aria-label={`${n} von 10`}
            onClick={() => setRating(mediaId, entry.rating === n ? null : n)}
            className={`h-6 w-4 rounded-[3px] transition-colors duration-150 ${
              active ? 'bg-jade' : 'bg-raised hover:bg-line'
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
