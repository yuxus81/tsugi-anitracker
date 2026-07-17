import { useMemo, useState } from 'react';
import type { Franchise } from '@/api/anilist';
import type { MediaDetail, MediaFormat } from '@/api/types';
import { formatLabel } from '@/api/types';
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
import { IconCheck, IconFilm, IconSparkle, IconStack, IconX } from './icons';

/** Typ-Icon je Format — macht den Zeitstrahl auf einen Blick lesbar. */
function typeIcon(format: MediaFormat | null) {
  if (format === 'MOVIE') return IconFilm;
  if (format === 'SPECIAL' || format === 'OVA' || format === 'MUSIC') return IconSparkle;
  return IconStack;
}

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
    // Filme sind oft die eigentliche Fortsetzung (Haikyū, Chainsaw Man …), landen
    // aber je nach AniList-Verknüpfung nur in den „Extras“ statt in der Hauptlinie.
    // Damit „Abgeschlossen“ sie nicht stillschweigend überspringt, mischen wir
    // Kinofilme in den Zeitstrahl — chronologisch einsortiert. Reine
    // Zusammenfassungs-/Recap-Filme und Spin-offs bleiben außen vor.
    const movieExtras = (franchise?.extras ?? [])
      .filter(
        (x) => x.media.format === 'MOVIE' && x.relation !== 'Zusammenfassung' && x.relation !== 'Spin-off',
      )
      .map((x) => x.media);

    const base = main.length > 0 ? [...main, ...movieExtras] : [detail];

    // Chronologisch nach Jahr, aber die ursprüngliche Reihenfolge als stabiler
    // Tiebreaker (Hauptlinie zuerst), dann Duplikate raus.
    const withOrder = base.map((c, i) => ({ c, i }));
    withOrder.sort((a, b) => (a.c.seasonYear ?? 9999) - (b.c.seasonYear ?? 9999) || a.i - b.i);
    const seen = new Set<number>();
    const ordered = withOrder.map((w) => w.c).filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));

    return ordered.map(seasonSnapFrom);
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
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[2/3] w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Ganzes Franchise auf einen Blick als Karten-Raster statt eines
                langen, einspaltigen Zeitstrahls — auf dem Handy sonst extrem
                scrolllastig bei Franchises mit vielen Staffeln/Filmen. */}
            <button
              type="button"
              disabled={status === 'completed'}
              onClick={() => setThrough(0)}
              className={`mb-2.5 w-full rounded-ctl border px-3 py-2 text-left text-sm transition-colors duration-150 ${
                effectiveThrough === 0
                  ? 'border-accent/50 bg-accent/5 font-medium text-ink'
                  : 'border-line bg-raised text-ink-dim hover:border-accent/40 hover:text-ink'
              } disabled:opacity-50`}
            >
              {t('addNotStarted')}
            </button>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              {(() => {
                let tvIndex = 0;
                return seasons.map((s, i) => {
                  const isTv = s.format !== 'MOVIE' && s.format !== 'SPECIAL' && s.format !== 'OVA' && s.format !== 'MUSIC';
                  if (isTv) tvIndex += 1;
                  const shortLabel = isTv ? t('seasonN', { n: tvIndex }) : formatLabel(s.format ?? 'TV', lang);
                  const released = isReleased(s);
                  const watched = released && i < effectiveThrough;
                  const isMark = released && i === effectiveThrough - 1;
                  const disabled = !released || status === 'completed';
                  const TypeIcon = typeIcon(s.format);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setThrough(i + 1)}
                      title={s.title}
                      style={{ ['--i' as string]: Math.min(i, 12) }}
                      className={`stagger-in group relative block aspect-[2/3] overflow-hidden rounded-card border-2 bg-bg text-left transition-all duration-200 ${
                        watched
                          ? 'border-accent shadow-[0_0_0_3px_rgba(0,245,212,0.22)]'
                          : 'border-line hover:border-accent/40'
                      } ${disabled ? 'opacity-50' : ''}`}
                    >
                      {s.coverUrl && (
                        <img src={s.coverUrl} alt="" className="h-full w-full object-cover" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/95 via-bg/50 to-transparent px-1.5 pb-1.5 pt-5">
                        <span
                          className={`flex items-center gap-1 text-[10.5px] font-semibold leading-tight ${watched ? 'text-ink' : 'text-ink-dim'}`}
                        >
                          <TypeIcon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{shortLabel}</span>
                        </span>
                      </span>
                      {!released && (
                        <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 text-[9px] font-semibold text-ink-faint backdrop-blur-sm">
                          {t('statusNotYet')}
                        </span>
                      )}
                      {watched && (
                        <span
                          className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full ${
                            isMark ? 'bg-accent text-bg' : 'bg-bg/70 text-accent backdrop-blur-sm'
                          }`}
                        >
                          <IconCheck className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </>
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
