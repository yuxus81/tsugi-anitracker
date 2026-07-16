import { useMemo, useState } from 'react';
import type { Franchise } from '@/api/anilist';
import type { MediaDetail } from '@/api/types';
import { formatLabel, seasonLabel } from '@/api/types';
import {
  ADD_STATUSES,
  seasonSnapFrom,
  isReleased,
  STATUS_KEY,
  useLibrary,
  type WatchStatus,
} from '@/store/library';
import { STATUS_DOT } from './TrackControls';
import { useToasts } from '@/store/toast';
import { useSettings, useT } from '@/i18n';
import { IconCheck, IconX } from './icons';

/**
 * Der Hinzufügen-Flow (V1-Prinzip): oben Status-Chips wie die Entdecken-Filter,
 * darunter klappt der Franchise-Zeitstrahl auf — antippen, bis wohin geschaut
 * wurde. Ergebnis: EIN Bibliothekseintrag fürs ganze Franchise.
 */
export function AddPanel({
  detail,
  franchise,
  loading,
  onClose,
}: {
  detail: MediaDetail;
  franchise: Franchise | undefined;
  loading: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const addFranchise = useLibrary((s) => s.addFranchise);
  const push = useToasts((s) => s.push);

  const [status, setStatus] = useState<WatchStatus>('watching');
  const [through, setThrough] = useState(0);

  const seasons = useMemo(() => {
    const main = franchise?.mainline ?? [];
    // Fallback: solange der Zeitstrahl lädt oder leer ist, gilt die aktuelle
    // Seite als einziges Glied der Hauptlinie.
    const cards = main.length > 0 ? main : [detail];
    return cards.map(seasonSnapFrom);
  }, [franchise, detail]);

  const releasedCount = seasons.filter(isReleased).length;
  const effectiveThrough = status === 'completed' ? releasedCount : Math.min(through, releasedCount);

  const confirm = () => {
    const entry = addFranchise({
      seasons,
      genres: detail.genres,
      status,
      watchedThrough: effectiveThrough,
    });
    if (entry) push(t('addedToast', { s: t(STATUS_KEY[entry.status]) }));
    onClose();
  };

  return (
    <section
      className="unfold mt-5 overflow-hidden rounded-card border border-accent/30 bg-surface"
      aria-label={t('add')}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-ink">{t('add')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('cancel')}
          className="rounded p-1 text-ink-dim transition-colors duration-150 hover:text-ink"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      {/* Status-Chips — dieselbe Sprache wie die Entdecken-Filter. */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-4 sm:px-5" role="radiogroup">
        {ADD_STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setStatus(s)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? 'border-accent bg-accent/10 text-accent shadow-glow-accent'
                  : 'border-line bg-raised text-ink-dim hover:text-ink'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
              {t(STATUS_KEY[s])}
            </button>
          );
        })}
      </div>

      {/* Zeitstrahl: bis wohin geschaut? */}
      <div className="px-4 py-4 sm:px-5">
        <p className="mb-3 text-[13px] font-medium text-ink-dim">{t('addHowFar')}</p>

        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : (
          <ol className="relative ml-2 border-l border-line pl-5">
            <li className="relative pb-2.5" style={{ ['--i' as string]: 0 }}>
              <span
                aria-hidden
                className={`absolute -left-5 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 ${
                  effectiveThrough === 0 ? 'border-accent bg-accent' : 'border-line bg-bg'
                }`}
              />
              <button
                type="button"
                disabled={status === 'completed'}
                onClick={() => setThrough(0)}
                className={`stagger-in w-full rounded-ctl border px-3 py-2 text-left text-sm transition-colors duration-150 ${
                  effectiveThrough === 0
                    ? 'border-accent/50 bg-accent/5 font-medium text-ink'
                    : 'border-line bg-raised text-ink-dim hover:border-accent/40 hover:text-ink'
                } disabled:opacity-50`}
              >
                {t('addNotStarted')}
              </button>
            </li>

            {seasons.map((s, i) => {
              const released = isReleased(s);
              const watched = released && i < effectiveThrough;
              const isMark = released && i === effectiveThrough - 1;
              return (
                <li key={s.id} className="relative pb-2.5 last:pb-0" style={{ ['--i' as string]: i + 1 }}>
                  <span
                    aria-hidden
                    className={`absolute -left-5 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                      watched ? 'border-accent bg-accent' : 'border-line bg-bg'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={!released || status === 'completed'}
                    onClick={() => setThrough(i + 1)}
                    className={`stagger-in flex w-full items-center gap-3 rounded-ctl border px-3 py-2 text-left transition-colors duration-150 ${
                      watched
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-line bg-raised hover:border-accent/40'
                    } ${!released || status === 'completed' ? 'opacity-50' : ''}`}
                  >
                    <span className="block h-11 w-8 shrink-0 overflow-hidden rounded-[4px] bg-bg">
                      {s.coverUrl && (
                        <img src={s.coverUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${watched ? 'font-medium text-ink' : 'text-ink-dim'}`}>
                        {s.title}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        {[
                          s.format ? formatLabel(s.format, lang) : null,
                          seasonLabel({ season: null, seasonYear: s.seasonYear }, lang),
                          s.episodes ? `${s.episodes} Ep.` : null,
                          !released ? t('statusNotYet') : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {isMark && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
                        <IconCheck className="h-3 w-3" />
                        {t('addUpTo')}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={confirm}
            className="pop-in inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]"
          >
            <IconCheck className="h-4 w-4" />
            {t('addConfirm')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-dim transition-colors duration-150 hover:text-ink"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </section>
  );
}
