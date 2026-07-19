import { useMemo, useState } from 'react';
import type { Franchise } from '@/api/anilist';
import type { MediaDetail, MediaFormat } from '@/api/types';
import { formatLabel } from '@/api/types';
import { seasonSnapFrom, isReleased, STATUS_KEY, useLibrary } from '@/store/library';
import { useToasts } from '@/store/toast';
import { useSettings, useT } from '@/i18n';
import {
  IconCheck,
  IconChevronLeft,
  IconFilm,
  IconPlus,
  IconScissors,
  IconSparkle,
  IconStack,
  IconX,
} from './icons';

/** Typ-Icon je Format — macht den Zeitstrahl auf einen Blick lesbar. */
function typeIcon(format: MediaFormat | null) {
  if (format === 'MOVIE') return IconFilm;
  if (format === 'SPECIAL' || format === 'OVA' || format === 'MUSIC') return IconSparkle;
  return IconStack;
}

type Step = 'choose' | 'seasons';

/**
 * Der Hinzufügen-Flow (V2-Prinzip): zwei große Entscheidungs-Kacheln statt
 * eines Chip-Reglers mit vier Status. „Watchlist“ fügt sofort hinzu — Fragen
 * nach bereits geschauten Staffeln ergeben dort keinen Sinn. Die zweite
 * Kachel öffnet den Franchise-Zeitstrahl zum Antippen, bis wohin geschaut
 * wurde; der tatsächliche Status (Weiter schauen/Noch zu schauen/Fortsetzung
 * folgt/Geschaut) wird danach automatisch abgeleitet (siehe `deriveStatus`
 * im Store) — keine manuelle Status-Wahl mehr nötig. Zusätzlich lässt sich
 * das Franchise (wie in V1) an einer beliebigen Stelle „abschneiden“ — alles
 * danach wird dem Eintrag gar nicht erst hinzugefügt.
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

  const [step, setStep] = useState<Step>('choose');
  const [through, setThrough] = useState(0);
  const [cutMode, setCutMode] = useState(false);
  const [cutoff, setCutoff] = useState<number | null>(null);

  const seasons = useMemo(() => {
    const main = franchise?.mainline ?? [];
    // Filme sind oft die eigentliche Fortsetzung (Haikyū, Chainsaw Man …), landen
    // aber je nach AniList-Verknüpfung nur in den „Extras“ statt in der Hauptlinie.
    // Damit „Geschaut“ sie nicht stillschweigend überspringt, mischen wir
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
  const effectiveThrough = Math.min(through, releasedCount);

  function confirmWatchlist() {
    const entry = addFranchise({ seasons, genres: detail.genres, status: 'planned', watchedThrough: 0 });
    if (entry) push(t('addedToast', { s: t(STATUS_KEY[entry.status]) }));
    onClose();
  }

  function confirmTracked() {
    const cutSeasons = cutoff !== null ? seasons.slice(0, cutoff + 1) : seasons;
    const cutThrough = Math.min(effectiveThrough, cutSeasons.length);
    const entry = addFranchise({
      seasons: cutSeasons,
      genres: detail.genres,
      status: 'watching',
      watchedThrough: cutThrough,
    });
    if (entry) push(t('addedToast', { s: t(STATUS_KEY[entry.status]) }));
    onClose();
  }

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

      {step === 'choose' ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
          <button
            type="button"
            onClick={confirmWatchlist}
            className="pop-in flex flex-col items-start gap-2.5 rounded-card border border-purple/30 bg-purple/[0.06] p-4 text-left transition-colors duration-150 hover:border-purple/60 hover:bg-purple/[0.1]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-purple/15 text-purple">
              <IconStack className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-semibold text-ink">{t('stPlanned')}</span>
            <span className="text-[13px] leading-snug text-ink-dim">{t('addWatchlistHint')}</span>
          </button>
          <button
            type="button"
            onClick={() => setStep('seasons')}
            className="pop-in flex flex-col items-start gap-2.5 rounded-card border border-accent/30 bg-accent/[0.06] p-4 text-left transition-colors duration-150 hover:border-accent/60 hover:bg-accent/[0.1]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent/15 text-accent">
              <IconPlus className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-semibold text-ink">{t('add')}</span>
            <span className="text-[13px] leading-snug text-ink-dim">{t('addTrackHint')}</span>
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 sm:px-5">
          <button
            type="button"
            onClick={() => setStep('choose')}
            className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-dim transition-colors duration-150 hover:text-ink"
          >
            <IconChevronLeft className="h-3.5 w-3.5" />
            {t('addBack')}
          </button>
          <p className="mb-3 text-[13px] font-medium text-ink-dim">{t('addHowFar')}</p>

          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-ctl border border-line bg-raised p-1" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={!cutMode}
                onClick={() => setCutMode(false)}
                className={`rounded-[6px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-150 ${
                  !cutMode ? 'bg-accent/15 text-accent' : 'text-ink-faint hover:text-ink-dim'
                }`}
              >
                {t('addModeWatched')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={cutMode}
                onClick={() => setCutMode(true)}
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-150 ${
                  cutMode ? 'bg-rose/15 text-rose' : 'text-ink-faint hover:text-ink-dim'
                }`}
              >
                <IconScissors className="h-3 w-3" />
                {t('addModeCutoff')}
              </button>
            </div>
            {cutoff !== null && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-rose">
                <IconScissors className="h-3 w-3" />
                {t('addCutoffActive', { t: seasons[cutoff]?.title ?? '' })}
                <button
                  type="button"
                  onClick={() => setCutoff(null)}
                  className="font-semibold underline underline-offset-2 transition-opacity duration-150 hover:opacity-70"
                >
                  {t('addCutoffClear')}
                </button>
              </span>
            )}
          </div>
          {cutMode && <p className="mb-3 text-[12px] leading-5 text-ink-faint">{t('addCutoffHint')}</p>}

          {loading ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton aspect-[2/3] w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              {(() => {
                let tvIndex = 0;
                return seasons.map((s, i) => {
                  const isTv = s.format !== 'MOVIE' && s.format !== 'SPECIAL' && s.format !== 'OVA' && s.format !== 'MUSIC';
                  if (isTv) tvIndex += 1;
                  const shortLabel = isTv ? t('seasonN', { n: tvIndex }) : formatLabel(s.format ?? 'TV', lang);
                  const released = isReleased(s);
                  const excluded = cutoff !== null && i > cutoff;
                  const watched = released && i < effectiveThrough && !excluded;
                  const isMark = released && i === effectiveThrough - 1 && !excluded;
                  const disabled = cutMode ? false : !released || excluded;
                  const TypeIcon = typeIcon(s.format);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => (cutMode ? setCutoff((prev) => (prev === i ? null : i)) : setThrough(i + 1))}
                      title={s.title}
                      style={{ ['--i' as string]: Math.min(i, 12) }}
                      className={`stagger-in group relative block aspect-[2/3] overflow-hidden rounded-card border-2 bg-bg text-left transition-all duration-200 ${
                        cutoff === i
                          ? 'border-rose shadow-[0_0_0_3px_rgba(244,63,94,0.22)]'
                          : watched
                            ? 'border-accent shadow-[0_0_0_3px_rgba(0,245,212,0.22)]'
                            : 'border-line hover:border-accent/40'
                      } ${excluded ? 'opacity-30 grayscale' : disabled ? 'opacity-50' : ''}`}
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
                      {!released && !excluded && (
                        <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 text-[9px] font-semibold text-ink-faint backdrop-blur-sm">
                          {t('statusNotYet')}
                        </span>
                      )}
                      {excluded && (
                        <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 text-[9px] font-semibold text-rose backdrop-blur-sm">
                          {t('addExcluded')}
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
                      {cutoff === i && (
                        <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-rose text-bg">
                          <IconScissors className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={confirmTracked}
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
      )}
    </section>
  );
}
