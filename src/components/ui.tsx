import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/i18n';
import { STATUS_KEY, STATUS_ORDER, type WatchStatus } from '@/store/library';
import { Icon, hasFilled, type IconName } from './icons';

/**
 * V5 „Gerät" — geteilte Bausteine. 1:1 aus design-lab/v5-nativ/app.js
 * (btn/iconBtn/tag/ring/segmented/sectionHead/emptyState/openSheet/…),
 * nur als React. Aussehen kommt aus styles/theme.css.
 */

/** Kategorie → Zeichen. Fünf Status, fünf Symbole. */
export const ST_ICON: Record<WatchStatus, IconName> = {
  watching: 'play',
  nextup: 'next',
  planned: 'bookmark',
  continuation: 'clock',
  completed: 'seal',
};

/** `data-st` durchreichen — erbt die komplette Farbrolle aus theme.css. */
export const st = (status?: WatchStatus | null) =>
  status ? { 'data-st': status } : {};

/* ------------------------------------------------------------------ Knopf -- */

type BtnVariant = 'primary' | 'quiet' | 'danger';

export function Btn({
  children,
  variant,
  ico,
  sm = false,
  wide = false,
  filled = true,
  loading = false,
  className = '',
  ...rest
}: {
  children?: ReactNode;
  variant?: BtnVariant;
  ico?: IconName;
  sm?: boolean;
  wide?: boolean;
  filled?: boolean;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    'btn',
    variant && `btn--${variant}`,
    sm && 'btn--sm',
    wide && 'btn--wide',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {ico && <Icon name={ico} size={sm ? 16 : 18} filled={filled && hasFilled(ico)} />}
      {children != null && <span>{children}</span>}
    </button>
  );
}

/* ------------------------------------------------------------ Symbolknopf -- */

export function IconBtn({
  name,
  label,
  sm = false,
  filled = false,
  className = '',
  ...rest
}: {
  name: IconName;
  label: string;
  sm?: boolean;
  filled?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ['iconbtn', sm && 'iconbtn--sm', className].filter(Boolean).join(' ');
  return (
    <button type="button" aria-label={label} title={label} className={cls} {...rest}>
      <Icon name={name} size={sm ? 17 : 20} filled={filled && hasFilled(name)} />
    </button>
  );
}

/* ------------------------------------------------------------ Status-Marke -- */

export function Tag({
  status,
  float = false,
  solid = false,
  children,
}: {
  status: WatchStatus;
  float?: boolean;
  solid?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  const cls = ['tag', float && 'tag--float', solid && 'tag--solid'].filter(Boolean).join(' ');
  return (
    <span className={cls} data-st={status}>
      <Icon name={ST_ICON[status]} size={13} filled />
      <span>{children ?? t(STATUS_KEY[status])}</span>
    </span>
  );
}

export function Dot() {
  return <span className="dot" />;
}

/* ------------------------------------------------------- Fortschrittsring -- */

export function Ring({
  pct,
  size = 46,
  w = 4,
  label,
}: {
  pct: number;
  size?: number;
  w?: number;
  label?: string;
}) {
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <span className="ring-wrap">
      <svg className="ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={w} />
        <circle
          className="ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={w}
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={(c * (1 - clamped)).toFixed(1)}
        />
      </svg>
      {label != null && <span className="ring-wrap__label tnum">{label}</span>}
    </span>
  );
}

/* --------------------------------------------------------------- Balken --- */

export function Bar({ pct }: { pct: number }) {
  return (
    <span className="bar">
      <span className="bar__fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

/* ------------------------------------------------------------ Abschnitt --- */

export function SectionHead({
  title,
  count,
  tone,
  kana,
  more,
}: {
  title: string;
  count?: number;
  tone?: WatchStatus;
  kana?: string;
  more?: ReactNode;
}) {
  return (
    <div className="sechead" {...st(tone)}>
      <h2 className="h-sec">{title}</h2>
      {kana && <span className="kana">{kana}</span>}
      {count !== undefined && <span className="sechead__count tnum">{count}</span>}
      {more && <span className="sechead__more">{more}</span>}
    </div>
  );
}

/** Seitentitel (Header oben auf jedem Bildschirm). */
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header style={{ marginBottom: 16 }}>
      <h1 className="h-large">{title}</h1>
      {sub && (
        <p className="sub" style={{ marginTop: 4 }}>
          {sub}
        </p>
      )}
    </header>
  );
}

/* ---------------------------------------------------------- Leerzustand --- */

export function EmptyState({
  status = 'planned',
  title,
  hint,
  action,
}: {
  status?: WatchStatus;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty" data-st={status}>
      <span className="empty__ico">
        <Icon name={ST_ICON[status]} size={24} filled />
      </span>
      <p className="empty__t">{title}</p>
      <p className="empty__h">{hint}</p>
      {action && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>{action}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Fehlerbox --- */

export function ErrorBox({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const t = useT();
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <p className="sub">{text ?? t('detailError')}</p>
      {onRetry && (
        <Btn variant="quiet" ico="refresh" filled={false} onClick={onRetry}>
          {t('retry')}
        </Btn>
      )}
    </div>
  );
}

export function LinkishButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn--quiet btn--sm"
      style={{ minHeight: 36 }}
    >
      <span>{children}</span>
      <Icon name="arrow" size={15} />
    </button>
  );
}

/* --------------------------------------------------- Segmentierte Auswahl -- */

export interface SegItem<K extends string> {
  key: K;
  label: string;
  count?: number;
  ico?: IconName;
}

export function Segmented<K extends string>({
  items,
  active,
  onPick,
  tone = true,
  className = '',
  style,
}: {
  items: SegItem<K>[];
  active: K;
  onPick: (key: K) => void;
  tone?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const idx = Math.max(
    0,
    items.findIndex((x) => x.key === active),
  );
  return (
    <div
      className={`seg ${className}`.trim()}
      role="tablist"
      {...(tone ? { 'data-st': active } : {})}
      style={{ ['--n' as string]: String(items.length), ['--i' as string]: String(idx), ...style }}
    >
      <span className={`seg__thumb${tone ? ' is-tone' : ''}`} />
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={on}
            className={`seg__btn${on ? ' is-on' : ''}`}
            style={on ? ({ ['--seg-on' as string]: 'var(--tone-on)' } as CSSProperties) : undefined}
            onClick={() => onPick(it.key)}
          >
            {it.ico && <Icon name={it.ico} size={15} filled={on && hasFilled(it.ico)} />}
            <span>{it.label}</span>
            {it.count !== undefined && <span className="seg__count tnum seg-count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Blatt ---- */

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  const closingRef = useRef(false);
  const t = useT();

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setLeaving(true);
    window.setTimeout(onClose, 260);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onEsc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <>
      <div className={`scrim${leaving ? ' is-out' : ''}`} onPointerDown={close} />
      <div
        className={`sheet${leaving ? ' is-out' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <span className="sheet__grip" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 className="sheet__t" style={{ flex: 1 }}>
            {title}
          </h2>
          <IconBtn name="x" label={t('cancel')} sm className="iconbtn--bare" onClick={close} />
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </>,
    document.body,
  );
}

/** Statuswahl — dieselbe Liste beim Hinzufügen und beim Verschieben. */
export function StatusPicker({
  current,
  onPick,
}: {
  current: WatchStatus | null;
  onPick: (s: WatchStatus) => void;
}) {
  const t = useT();
  const hints: Record<WatchStatus, string> = {
    watching: t('addTrackHint'),
    nextup: t('readySeasonOpen'),
    planned: t('addWatchlistHint'),
    continuation: t('continuationComingSoon'),
    completed: t('statusFinished'),
  };
  return (
    <>
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          className={`pickrow${s === current ? ' is-on' : ''}`}
          data-st={s}
          onClick={() => onPick(s)}
        >
          <span className="pickrow__ico">
            <Icon name={ST_ICON[s]} size={19} filled />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="pickrow__t" style={{ display: 'block' }}>
              {t(STATUS_KEY[s])}
            </span>
            <span className="pickrow__s" style={{ display: 'block' }}>
              {hints[s]}
            </span>
          </span>
          {s === current && <Icon name="check" size={18} />}
        </button>
      ))}
    </>
  );
}

/* --------------------------------------------------------- Bestätigung --- */

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
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
  return (
    <Sheet title={title} onClose={onCancel}>
      {message && (
        <p className="sub" style={{ marginBottom: 18 }}>
          {message}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="quiet" wide onClick={onCancel}>
          {cancelLabel}
        </Btn>
        <Btn variant="danger" wide ico="trash" filled={false} onClick={onConfirm}>
          {confirmLabel}
        </Btn>
      </div>
    </Sheet>
  );
}
