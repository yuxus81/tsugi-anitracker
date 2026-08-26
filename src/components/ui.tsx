import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/i18n';
import { IconArrowRight } from './icons';

/** Editorial page header: serif display title + quiet subline. */
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-7">
      <h1 className="font-display text-[32px] font-semibold leading-tight tracking-tight text-ink sm:text-[40px]">
        {title}
      </h1>
      {sub && <p className="mt-1.5 max-w-[65ch] text-sm text-ink-dim">{sub}</p>}
    </header>
  );
}

export function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-3.5 flex items-baseline gap-2.5">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {count !== undefined && (
        <span className="text-sm tabular-nums text-ink-faint">{count}</span>
      )}
    </div>
  );
}

export function ErrorBox({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5">
      <p className="text-sm text-ink-dim">{text ?? t('detailError')}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-ctl bg-raised px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-accent-deep"
        >
          {t('retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-6 text-ink-dim">{hint}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Zentriertes Bestätigungs-Popup (statt Inline-Texterweiterung) — für
 * destruktive Aktionen wie Löschen. Backdrop-Klick und Escape schließen wie
 * abbrechen.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Der Dialog verabschiedet sich mit einer eigenen Abblend-Animation, statt
  // hart zu verschwinden. Dafür lebt er nach dem Auslösen noch kurz weiter
  // (`leaving`) und meldet erst danach nach oben. Nebeneffekt, der genauso
  // wichtig ist: solange die Overlay-Fläche noch liegt, fängt sie den
  // „Geister-Klick“ ab, den Touch-Geräte nach dem Tippen nachschicken — sonst
  // landet der auf dem Knopf, der zufällig hinter dem Dialog lag.
  const [leaving, setLeaving] = useState(false);
  const closingRef = useRef(false);

  const dismiss = (action: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setLeaving(true);
    window.setTimeout(action, 160);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(onCancel);
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onEsc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-modal grid place-items-center p-4 ${leaving ? 'scrim-out' : 'scrim-in'}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) dismiss(onCancel);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-full max-w-sm overflow-hidden rounded-sheet border border-line bg-surface p-5 shadow-glass-lift ${
          leaving ? 'sheet-out' : 'sheet-in'
        }`}
      >
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        {message && <p className="mt-1.5 text-sm leading-6 text-ink-dim">{message}</p>}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => dismiss(onCancel)}
            className="press flex-1 rounded-ctl border border-line bg-raised px-3.5 py-2.5 text-sm font-medium text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => dismiss(onConfirm)}
            className={`press flex-1 rounded-ctl px-3.5 py-2.5 text-sm font-semibold text-bg transition-[filter] duration-150 hover:brightness-110 ${
              danger ? 'bg-rose' : 'bg-accent'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function LinkishButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity duration-150 hover:opacity-80"
    >
      {children}
      <IconArrowRight className="h-4 w-4" />
    </button>
  );
}
