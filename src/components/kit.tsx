import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { STATUS_THEME } from '@/domain/status';
import { useT } from '@/i18n';
import type { WatchStatus } from '@/store/library';

/**
 * Die Bedienelemente des V5-Designs.
 *
 * Gemeinsamer Nenner: Alles Drückbare hat eine Lichtkante oben, einen
 * Kontaktschatten unten und fährt beim Drücken nach unten — das Aussehen
 * steckt in `src/styles/controls.css`. Hier steht nur das Verhalten.
 *
 * Aktive Zustände wechseln die FORM (Kapsel wächst, Zeichen füllt sich),
 * nicht nur die Farbe. Das ist der Unterschied zwischen „Hover-Farbe" und
 * „Knopf".
 */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max));
}

// ---- Knöpfe ---------------------------------------------------------------

interface ButtonProps {
  children?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'quiet' | 'danger';
  icon?: IconName;
  size?: 'sm' | 'md';
  wide?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  children,
  onClick,
  variant,
  icon,
  size = 'md',
  wide = false,
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const klassen = [
    'btn',
    variant && `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    wide && 'btn--wide',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={klassen}
      // Während des Ladens gesperrt: ohne das schickt ein ungeduldiger
      // Doppelklick dieselbe Aktion zweimal los.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} filled />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({
  name,
  label,
  onClick,
  size = 'md',
  filled = false,
  bare = false,
  disabled = false,
  className = '',
}: {
  name: IconName;
  /** Pflicht: der Knopf zeigt nur ein Zeichen und braucht trotzdem einen Namen. */
  label: string;
  onClick: () => void;
  size?: 'sm' | 'md';
  filled?: boolean;
  bare?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const klassen = ['iconbtn', size === 'sm' && 'iconbtn--sm', bare && 'iconbtn--bare', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={klassen}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={name} size={size === 'sm' ? 17 : 20} filled={filled} />
    </button>
  );
}

// ---- Segmentierte Auswahl -------------------------------------------------

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
  count?: number;
  icon: IconName;
}

/**
 * Der Daumen gleitet, statt zu springen — und trägt die Farbe der gewählten
 * Kategorie. Deshalb steht `data-st` auf der Leiste selbst: die Farbrolle
 * gilt für den Daumen, nicht für die einzelnen Kacheln.
 */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));

  return (
    <div className="seg" role="tablist" aria-label={label} data-st={value}>
      <span
        className="seg__thumb is-tone"
        aria-hidden
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => {
        const gewaehlt = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={gewaehlt}
            className={`seg__btn${gewaehlt ? ' is-on' : ''}`}
            onClick={() => onChange(o.key)}
          >
            <Icon name={o.icon} size={15} filled={gewaehlt} />
            <span>{o.label}</span>
            {/* Eine 0 ist kein Wert, sondern Rauschen — leere Kategorien
                zeigen gar keine Zahl. */}
            {o.count ? <span className="seg__count seg-count">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ---- Fortschritt ----------------------------------------------------------

export function Ring({
  pct,
  size = 46,
  width = 4,
  label,
}: {
  pct: number;
  size?: number;
  width?: number;
  label?: string;
}) {
  const r = (size - width) / 2;
  const umfang = 2 * Math.PI * r;
  const offset = umfang * (1 - clamp(pct, 0, 1));

  return (
    <span className="ring-wrap">
      <svg className="ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={width} />
        <circle
          className="ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={width}
          strokeDasharray={umfang.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
        />
      </svg>
      {label && <span className="ring-wrap__label tnum">{label}</span>}
    </span>
  );
}

export function Bar({ pct, label }: { pct: number; label: string }) {
  const prozent = Math.round(clamp(pct, 0, 1) * 100);

  return (
    <span
      className="bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={prozent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="bar__fill" style={{ width: `${prozent}%` }} />
    </span>
  );
}

// ---- Stepper --------------------------------------------------------------

/**
 * Echte Hardware-Anmutung mit Trennfuge. `max: null` heißt „Folgenzahl
 * unbekannt" — bei laufenden Staffeln liefert AniList oft keine, und ein
 * Stepper, der dann bei 0 feststeckt, wäre unbenutzbar.
 */
export function Stepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number | null;
  onChange: (next: number) => void;
  label: string;
}) {
  const t = useT();
  const amEnde = max !== null && value >= max;

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        aria-label={t('stepperBack', { label })}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        <Icon name="minus" size={18} />
      </button>
      <span className="stepper__val tnum">
        <span>{value}</span>
      </span>
      <button
        type="button"
        className="stepper__btn"
        aria-label={t('stepperForward', { label })}
        disabled={amEnde}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

// ---- Marken und Überschriften ---------------------------------------------

export function Tag({
  status,
  text,
  float = false,
  solid = false,
}: {
  status: WatchStatus;
  text?: string;
  float?: boolean;
  solid?: boolean;
}) {
  const t = useT();
  const klassen = ['tag', float && 'tag--float', solid && 'tag--solid'].filter(Boolean).join(' ');

  return (
    <span className={klassen} data-st={status}>
      <Icon name={STATUS_THEME[status].icon} size={13} filled />
      <span>{text ?? t(STATUS_THEME[status].labelKey)}</span>
    </span>
  );
}

export function SectionHead({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="sechead">
      <span className="sechead__rail" aria-hidden />
      <h2 className="h-sec">{title}</h2>
      {/* `count != null` statt einer Wahrheitsprüfung: eine ausdrückliche 0
          ist eine Aussage („nichts drin"), kein fehlender Wert. */}
      {count != null && <span className="sechead__count tnum">{count}</span>}
      {action && <span className="sechead__more">{action}</span>}
    </div>
  );
}

export function EmptyState({
  status,
  title,
  hint,
  action,
}: {
  status: WatchStatus;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty" data-st={status}>
      <span className="empty__ico" aria-hidden>
        <Icon name={STATUS_THEME[status].icon} size={24} filled />
      </span>
      <p className="empty__t">{title}</p>
      <p className="empty__h">{hint}</p>
      {action && <div className="empty__act">{action}</div>}
    </div>
  );
}
