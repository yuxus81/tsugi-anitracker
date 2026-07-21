import { useMemo, useState } from 'react';
import type { Franchise } from '@/api/anilist';
import type { MediaDetail, MediaFormat } from '@/api/types';
import { formatLabel } from '@/api/types';
import { seasonSnapFrom, isReleased, STATUS_KEY, useLibrary, type SeasonSnap } from '@/store/library';
import { useToasts } from '@/store/toast';
import { useSettings, useT } from '@/i18n';
import {
  IconCheck,
  IconClock,
  IconFilm,
  IconMinus,
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

/**
 * Baut den chronologischen Franchise-Zeitstrahl (Hauptlinie + eingemischte
 * Kinofilme) — geteilt zwischen AddPanel (Auswahl-Raster) und DetailPage
 * (Sofort-Watchlist ohne eigenes Panel).
 */
export function buildFranchiseSeasons(detail: MediaDetail, franchise: Franchise | undefined): SeasonSnap[] {
  const main = franchise?.mainline ?? [];
  // Filme sind oft die eigentliche Fortsetzung (Haikyū, Chainsaw Man …), landen
  // aber je nach AniList-Verknüpfung nur in den „Extras“ statt in der Hauptlinie.
  // Damit „Geschaut“ sie nicht stillschweigend überspringt, mischen wir
  // Kinofilme in den Zeitstrahl — chronologisch einsortiert. Reine
  // Zusammenfassungs-/Recap-Filme und Spin-offs bleiben außen vor.
  const movieExtras = (franchise?.extras ?? [])
    .filter((x) => x.media.format === 'MOVIE' && x.relation !== 'Zusammenfassung' && x.relation !== 'Spin-off')
    .map((x) => x.media);

  const base = main.length > 0 ? [...main, ...movieExtras] : [detail];

  // Chronologisch nach Jahr, aber die ursprüngliche Reihenfolge als stabiler
  // Tiebreaker (Hauptlinie zuerst), dann Duplikate raus.
  const withOrder = base.map((c, i) => ({ c, i }));
  withOrder.sort((a, b) => (a.c.seasonYear ?? 9999) - (b.c.seasonYear ?? 9999) || a.i - b.i);
  const seen = new Set<number>();
  const ordered = withOrder.map((w) => w.c).filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));

  return ordered.map(seasonSnapFrom);
}

type AddMode = 'watching' | 'completed';

/**
 * Der Hinzufügen-Flow (V3): kein generischer Zwischenschritt mehr — die
 * DetailPage zeigt direkt drei Einstiege (Watchlist/Gerade am Schauen/
 * Geschaut), dieses Panel rendert nur noch den passenden Unterflow.
 * „Gerade am Schauen“ fragt Staffel + Folge ab (Episoden-Genauigkeit).
 * „Geschaut“ fragt, bis wohin geschaut wurde, inkl. V1-artigem Abschneiden:
 * alles nach dem Schnitt gehört gar nicht erst zum Eintrag — ist die letzte
 * NICHT abgeschnittene Staffel komplett geschaut, gilt das Franchise als
 * fertig, egal wie viele Staffeln danach ignoriert wurden.
 */
export function AddPanel({
  detail,
  franchise,
  loading,
  mode,
  onClose,
}: {
  detail: MediaDetail;
  franchise: Franchise | undefined;
  loading: boolean;
  mode: AddMode;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const addFranchise = useLibrary((s) => s.addFranchise);
  const push = useToasts((s) => s.push);

  const [through, setThrough] = useState(0);
  const [cutoff, setCutoff] = useState<number | null>(null);
  const [watchingIdx, setWatchingIdx] = useState<number | null>(null);
  const [episode, setEpisode] = useState(1);

  const seasons = useMemo(() => buildFranchiseSeasons(detail, franchise), [franchise, detail]);
  const releasedCount = seasons.filter(isReleased).length;
  const effectiveThrough = Math.min(through, releasedCount);
  const watchingSeason = watchingIdx !== null ? seasons[watchingIdx] : undefined;

  function confirmCompleted() {
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

  function confirmWatching() {
    if (watchingIdx === null) return;
    const entry = addFranchise({
      seasons,
      genres: detail.genres,
      status: 'watching',
      watchedThrough: watchingIdx,
      currentEpisode: episode,
    });
    if (entry) push(t('addedToast', { s: t(STATUS_KEY[entry.status]) }));
    onClose();
  }

  const maxEpisode = watchingSeason?.episodes ?? undefined;

  return (
    <section
      className="unfold mt-5 overflow-hidden rounded-sheet border border-accent/30 bg-surface"
      aria-label={t('add')}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-ink">
          {mode === 'watching' ? t('addWatchingBtn') : t('stCompleted')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('cancel')}
          className="rounded p-1 text-ink-dim transition-colors duration-150 hover:text-ink"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {mode === 'watching' ? (
          <>
            <p className="mb-3 text-[13px] font-medium text-ink-dim">{t('addWatchingSeasonPrompt')}</p>
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
                    const isSel = watchingIdx === i;
                    const TypeIcon = typeIcon(s.format);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!released}
                        onClick={() => {
                          setWatchingIdx(i);
                          setEpisode(1);
                        }}
                        title={s.title}
                        style={{ ['--i' as string]: Math.min(i, 12) }}
                        className={`stagger-in group relative block aspect-[2/3] overflow-hidden rounded-card border-2 bg-bg text-left transition-all duration-200 ${
                          isSel
                            ? 'border-accent shadow-[0_0_0_3px_rgba(0,245,212,0.22)]'
                            : 'border-line hover:border-accent/40'
                        } ${released ? '' : 'opacity-70'}`}
                      >
                        {s.coverUrl && <img src={s.coverUrl} alt="" className={`h-full w-full object-cover ${released ? '' : 'grayscale'}`} />}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/95 via-bg/50 to-transparent px-1.5 pb-1.5 pt-5">
                          <span className={`flex items-center gap-1 text-[10.5px] font-semibold leading-tight ${isSel ? 'text-ink' : 'text-ink-dim'}`}>
                            <TypeIcon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{shortLabel}</span>
                          </span>
                        </span>
                        {!released && (
                          <>
                            <span className="absolute inset-0 grid place-items-center">
                              <span className="grid h-7 w-7 place-items-center rounded-full bg-bg/70 text-ink-dim backdrop-blur-sm">
                                <IconClock className="h-3.5 w-3.5" />
                              </span>
                            </span>
                            <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 text-[9px] font-semibold text-ink-faint backdrop-blur-sm">
                              {t('statusNotYet')}
                            </span>
                          </>
                        )}
                        {isSel && (
                          <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-bg">
                            <IconCheck className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {watchingSeason && (
              <div className="mt-4">
                <p className="mb-2 text-[13px] font-medium text-ink-dim">{t('addWatchingEpisodePrompt')}</p>
                <div className="inline-flex items-center gap-1 rounded-ctl border border-line bg-surface p-1">
                  <button
                    type="button"
                    aria-label="−1"
                    disabled={episode <= 1}
                    onClick={() => setEpisode((e) => Math.max(1, e - 1))}
                    className="grid h-9 w-9 place-items-center rounded-[6px] text-ink-dim transition-colors duration-150 hover:bg-raised hover:text-ink disabled:opacity-30"
                  >
                    <IconMinus className="h-4 w-4" />
                  </button>
                  <span className="flex min-w-[70px] items-center justify-center text-sm font-semibold tabular-nums text-ink">
                    {episode}
                    <span className="font-normal text-ink-faint">&nbsp;/ {maxEpisode ?? '?'}</span>
                  </span>
                  <button
                    type="button"
                    aria-label="+1"
                    disabled={maxEpisode !== undefined && episode >= maxEpisode}
                    onClick={() => setEpisode((e) => (maxEpisode !== undefined ? Math.min(maxEpisode, e + 1) : e + 1))}
                    className="grid h-9 w-9 place-items-center rounded-[6px] text-accent transition-colors duration-150 hover:bg-raised disabled:opacity-30"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={confirmWatching}
                disabled={watchingIdx === null}
                className="pop-in inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
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
          </>
        ) : (
          <>
            <p className="mb-1.5 text-[13px] font-medium text-ink-dim">{t('addHowFar')}</p>
            <p className="mb-3 text-[12px] leading-5 text-ink-faint">{t('addCutoffHint')}</p>

            {cutoff !== null && (
              <div className="mb-3 flex">
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
              </div>
            )}

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
                    const disabled = !released || excluded;
                    const TypeIcon = typeIcon(s.format);
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={disabled ? -1 : 0}
                        aria-disabled={disabled}
                        onClick={() => {
                          if (!disabled) setThrough(i + 1);
                        }}
                        onKeyDown={(e) => {
                          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setThrough(i + 1);
                          }
                        }}
                        title={s.title}
                        style={{ ['--i' as string]: Math.min(i, 12) }}
                        className={`stagger-in group relative block aspect-[2/3] overflow-hidden rounded-card border-2 bg-bg text-left transition-all duration-200 ${
                          disabled ? '' : 'cursor-pointer'
                        } ${
                          cutoff === i
                            ? 'border-rose shadow-[0_0_0_3px_rgba(244,63,94,0.22)]'
                            : watched
                              ? 'border-accent shadow-[0_0_0_3px_rgba(0,245,212,0.22)]'
                              : 'border-line hover:border-accent/40'
                        } ${excluded ? 'opacity-30 grayscale' : ''}`}
                      >
                        {s.coverUrl && (
                          <img
                            src={s.coverUrl}
                            alt=""
                            className={`h-full w-full object-cover ${!released && !excluded ? 'opacity-70 grayscale' : ''}`}
                          />
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
                          <span className="absolute inset-0 grid place-items-center">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-bg/70 text-ink-dim backdrop-blur-sm">
                              <IconClock className="h-3.5 w-3.5" />
                            </span>
                          </span>
                        )}
                        {excluded && (
                          <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 text-[9px] font-semibold text-rose backdrop-blur-sm">
                            {t('addExcluded')}
                          </span>
                        )}
                        {!released && !excluded && (
                          <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 text-[9px] font-semibold text-ink-faint backdrop-blur-sm">
                            {t('statusNotYet')}
                          </span>
                        )}
                        <span className="absolute right-1 top-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCutoff((prev) => (prev === i ? null : i));
                            }}
                            aria-label={t('addCutoffToggle')}
                            title={t('addCutoffToggle')}
                            className={`grid h-5 w-5 place-items-center rounded-full backdrop-blur-sm transition-colors duration-150 ${
                              cutoff === i
                                ? 'bg-rose text-bg'
                                : 'bg-bg/70 text-ink-faint hover:text-rose'
                            }`}
                          >
                            <IconScissors className="h-2.5 w-2.5" />
                          </button>
                          {watched && (
                            <span
                              className={`grid h-5 w-5 place-items-center rounded-full ${
                                isMark ? 'bg-accent text-bg' : 'bg-bg/70 text-accent backdrop-blur-sm'
                              }`}
                            >
                              <IconCheck className="h-3 w-3" />
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={confirmCompleted}
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
          </>
        )}
      </div>
    </section>
  );
}
