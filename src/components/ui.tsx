import type { ReactNode } from 'react';
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
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5">
      <p className="text-sm text-ink-dim">
        {text ?? 'Das hat gerade nicht geklappt. AniList ist vermutlich kurz nicht erreichbar.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-ctl bg-raised px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-jade-deep"
        >
          Nochmal versuchen
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
      className="inline-flex items-center gap-1.5 text-sm font-medium text-jade transition-opacity duration-150 hover:opacity-80"
    >
      {children}
      <IconArrowRight className="h-4 w-4" />
    </button>
  );
}
