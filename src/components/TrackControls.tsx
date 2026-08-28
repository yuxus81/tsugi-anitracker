import { useState } from 'react';
import { currentSeason, STATUS_KEY, useLibrary, type WatchStatus } from '@/store/library';
import { useToasts } from '@/store/toast';
import { useT } from '@/i18n';
import { Btn, ConfirmDialog, Sheet, StatusPicker, Tag } from './ui';
import { Icon } from './icons';

/**
 * Kontextsensitive Aktionsleiste für bereits getrackte Franchises: Status-Marke,
 * die vom aktuellen Status aus sinnvollen Shortcuts, „Status ändern" (Blatt mit
 * Statuswahl) und Löschen.
 */
export function QuickActions({ rootId }: { rootId: number }) {
  const entry = useLibrary((s) => s.entries[rootId]);
  const setStatus = useLibrary((s) => s.setStatus);
  const remove = useLibrary((s) => s.remove);
  const push = useToasts((s) => s.push);
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  if (!entry) return null;

  const shortcut =
    entry.status === 'watching'
      ? { label: t('markCompleteBtn'), ico: 'seal' as const, to: 'completed' as WatchStatus }
      : entry.status === 'planned' || entry.status === 'nextup'
        ? { label: t('watchNowBtn'), ico: 'play' as const, to: 'watching' as WatchStatus }
        : null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
      <Tag status={entry.status} />
      {shortcut && (
        <Btn
          variant="primary"
          ico={shortcut.ico}
          onClick={() => {
            setStatus(rootId, shortcut.to);
            push(t('addedToast', { s: t(STATUS_KEY[shortcut.to]) }));
          }}
        >
          {shortcut.label}
        </Btn>
      )}
      <Btn variant="quiet" ico="dots" filled={false} onClick={() => setPickOpen(true)}>
        {t('moveTo')}
      </Btn>
      <button
        type="button"
        className="iconbtn iconbtn--sm"
        aria-label={t('remove')}
        title={t('remove')}
        onClick={() => setConfirmDelete(true)}
      >
        <Icon name="trash" size={17} />
      </button>

      {pickOpen && (
        <Sheet title={t('moveTo')} onClose={() => setPickOpen(false)}>
          <StatusPicker
            current={entry.status}
            onPick={(s) => {
              setPickOpen(false);
              if (s !== entry.status) {
                setStatus(rootId, s);
                push(t('addedToast', { s: t(STATUS_KEY[s]) }));
              }
            }}
          />
        </Sheet>
      )}

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

/** Episoden-Stepper (V5 `.stepper`) — Zahl in der Mitte ist editierbar. */
export function EpisodeStepper({ rootId }: { rootId: number }) {
  const entry = useLibrary((s) => s.entries[rootId]);
  const setProgress = useLibrary((s) => s.setProgress);
  const [draft, setDraft] = useState<string | null>(null);
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
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        aria-label="−1"
        disabled={entry.progress <= 0}
        onClick={() => setProgress(rootId, entry.progress - 1)}
      >
        <Icon name="minus" size={18} />
      </button>
      <span className="stepper__val">
        <input
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
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(null);
              (e.target as HTMLInputElement).blur();
            }
          }}
          style={{
            width: 48,
            background: 'transparent',
            border: 0,
            outline: 'none',
            textAlign: 'center',
            font: 'inherit',
            color: 'var(--ink)',
          }}
        />
      </span>
      <button
        type="button"
        className="stepper__btn"
        aria-label="+1"
        disabled={atMax}
        onClick={() => setProgress(rootId, entry.progress + 1)}
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

/** 1–10 Wertung als V5-Pip-Streifen. */
export function RatingStrip({ rootId }: { rootId: number }) {
  const entry = useLibrary((s) => s.entries[rootId]);
  const setRating = useLibrary((s) => s.setRating);
  const push = useToasts((s) => s.push);
  const t = useT();
  const [just, setJust] = useState<number | null>(null);
  if (!entry) return null;

  return (
    <div className="pips" role="radiogroup" aria-label={t('yourRating')}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const on = entry.rating !== null && n <= entry.rating;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={entry.rating === n}
            aria-label={`${n} / 10`}
            className={`pip${on ? ' is-on' : ''}${just === n ? ' just' : ''}`}
            onClick={() => {
              const next = entry.rating === n ? null : n;
              setRating(rootId, next);
              setJust(n);
              window.setTimeout(() => setJust(null), 460);
              push(next ? t('yourRatingShort', { n: next }) : t('cancel'));
            }}
          >
            <Icon name="star" size={22} filled={on} />
          </button>
        );
      })}
    </div>
  );
}
