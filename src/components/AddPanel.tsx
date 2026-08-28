import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { Franchise } from '@/api/anilist';
import type { MediaDetail } from '@/api/types';
import { formatLabel } from '@/api/types';
import { seasonSnapFrom, isReleased, STATUS_KEY, useLibrary, type SeasonSnap } from '@/store/library';
import { useToasts } from '@/store/toast';
import { useSettings, useT } from '@/i18n';
import { Btn } from './ui';
import { Icon } from './icons';

/**
 * Baut den chronologischen Franchise-Zeitstrahl (Hauptlinie + eingemischte
 * Kinofilme) — geteilt zwischen AddPanel und DetailPage.
 */
export function buildFranchiseSeasons(detail: MediaDetail, franchise: Franchise | undefined): SeasonSnap[] {
  const main = franchise?.mainline ?? [];
  const movieExtras = (franchise?.extras ?? [])
    .filter((x) => x.media.format === 'MOVIE' && x.relation !== 'Zusammenfassung' && x.relation !== 'Spin-off')
    .map((x) => x.media);
  const base = main.length > 0 ? [...main, ...movieExtras] : [detail];
  const withOrder = base.map((c, i) => ({ c, i }));
  withOrder.sort((a, b) => (a.c.seasonYear ?? 9999) - (b.c.seasonYear ?? 9999) || a.i - b.i);
  const seen = new Set<number>();
  const ordered = withOrder.map((w) => w.c).filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
  return ordered.map(seasonSnapFrom);
}

type FxKey = 'seasons' | 'movies' | 'specials';

/** Franchise-Kacheln in Staffeln / Filme / Specials aufteilen (Originalindex bleibt). */
function groupSeasons(list: SeasonSnap[]): Record<FxKey, Array<{ snap: SeasonSnap; idx: number }>> {
  const out: Record<FxKey, Array<{ snap: SeasonSnap; idx: number }>> = {
    seasons: [],
    movies: [],
    specials: [],
  };
  list.forEach((snap, idx) => {
    const f = snap.format;
    if (f === 'MOVIE') out.movies.push({ snap, idx });
    else if (f === 'SPECIAL' || f === 'OVA' || f === 'MUSIC') out.specials.push({ snap, idx });
    else out.seasons.push({ snap, idx });
  });
  return out;
}

type AddMode = 'watching' | 'completed';

/**
 * Hinzufügen-Flow: „Gerade am Schauen" fragt Staffel + Folge ab. „Geschaut"
 * fragt, bis wohin geschaut wurde, inkl. Abschneiden per Schere — alles nach
 * dem Schnitt gehört gar nicht erst zum Eintrag.
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
  const maxEpisode = watchingSeason?.episodes ?? undefined;

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

  const groups = useMemo(() => groupSeasons(seasons), [seasons]);

  const GROUPS: Array<{ key: FxKey; ico: 'stack' | 'film' | 'sparkle'; label: string }> = [
    { key: 'seasons', ico: 'stack', label: t('fbSeasons') },
    { key: 'movies', ico: 'film', label: t('fbMovies') },
    { key: 'specials', ico: 'sparkle', label: t('extrasTitle') },
  ];

  /** Gruppierte Kachel-Raster; `renderTile` bekommt Snap, Originalindex und
   *  (nur bei Staffeln) die laufende Staffelnummer. */
  function renderGroups(renderTile: (s: SeasonSnap, i: number, seasonNo: number | null) => ReactNode) {
    return GROUPS.map(({ key, ico, label }) => {
      const items = groups[key];
      if (!items.length) return null;
      return (
        <div className="fx__group" key={key}>
          <div className="fx__gh">
            <Icon name={ico} size={14} filled />
            <span>{label}</span>
            <span className="fx__gn tnum">{items.length}</span>
          </div>
          <div className="grid">
            {items.map(({ snap, idx }, gi) =>
              renderTile(snap, idx, key === 'seasons' ? gi + 1 : null),
            )}
          </div>
        </div>
      );
    });
  }

  return (
    <section className="panel" data-st="watching" style={{ marginTop: 16 }} aria-label={t('add')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 className="h-sec" style={{ flex: 1 }}>
          {mode === 'watching' ? t('addWatchingBtn') : t('stCompleted')}
        </h2>
        <button type="button" className="iconbtn iconbtn--bare iconbtn--sm" aria-label={t('cancel')} onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {mode === 'watching' ? (
        <>
          <p className="muted" style={{ marginBottom: 10 }}>
            {t('addWatchingSeasonPrompt')}
          </p>
          {loading ? (
            <div className="grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skel" style={{ aspectRatio: '2 / 3' }} />
              ))}
            </div>
          ) : (
            renderGroups((s, i, seasonNo) => {
              const short = seasonNo != null ? t('seasonN', { n: seasonNo }) : formatLabel(s.format ?? 'TV', lang);
              const released = isReleased(s);
              return (
                <SeasonTile
                  key={s.id}
                  cover={s.coverUrl}
                  label={short}
                  released={released}
                  selected={watchingIdx === i}
                  selectColor="var(--cy)"
                  onClick={released ? () => { setWatchingIdx(i); setEpisode(1); } : undefined}
                  lockedLabel={released ? undefined : t('statusNotYet')}
                />
              );
            })
          )}

          {watchingSeason && (
            <div style={{ marginTop: 14 }}>
              <p className="muted" style={{ marginBottom: 8 }}>
                {t('addWatchingEpisodePrompt')}
              </p>
              <div className="stepper">
                <button
                  type="button"
                  className="stepper__btn"
                  aria-label="−1"
                  disabled={episode <= 1}
                  onClick={() => setEpisode((e) => Math.max(1, e - 1))}
                >
                  <Icon name="minus" size={18} />
                </button>
                <span className="stepper__val">
                  {episode}
                  <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>/ {maxEpisode ?? '?'}</span>
                </span>
                <button
                  type="button"
                  className="stepper__btn"
                  aria-label="+1"
                  disabled={maxEpisode !== undefined && episode >= maxEpisode}
                  onClick={() => setEpisode((e) => (maxEpisode !== undefined ? Math.min(maxEpisode, e + 1) : e + 1))}
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <Btn variant="primary" ico="check" onClick={confirmWatching} disabled={watchingIdx === null}>
              {t('addConfirm')}
            </Btn>
            <Btn variant="quiet" onClick={onClose}>
              {t('cancel')}
            </Btn>
          </div>
        </>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 4 }}>
            {t('addHowFar')}
          </p>
          <p className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
            {t('addCutoffHint')}
          </p>

          {cutoff !== null && (
            <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--cy-t)', display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Icon name="scissors" size={13} />
              {t('addCutoffActive', { t: seasons[cutoff]?.title ?? '' })}
              <button
                type="button"
                onClick={() => setCutoff(null)}
                style={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                {t('addCutoffClear')}
              </button>
            </p>
          )}

          {loading ? (
            <div className="grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skel" style={{ aspectRatio: '2 / 3' }} />
              ))}
            </div>
          ) : (
            renderGroups((s, i, seasonNo) => {
              const short = seasonNo != null ? t('seasonN', { n: seasonNo }) : formatLabel(s.format ?? 'TV', lang);
              const released = isReleased(s);
              const excluded = cutoff !== null && i > cutoff;
              const watched = released && i < effectiveThrough && !excluded;
              const isCut = cutoff === i;
              const disabled = !released || excluded;
              return (
                <SeasonTile
                  key={s.id}
                  cover={s.coverUrl}
                  label={short}
                  released={released}
                  excluded={excluded}
                  selected={isCut || watched}
                  selectColor="var(--cy)"
                  checked={watched}
                  onClick={disabled ? undefined : () => setThrough(i + 1)}
                  onCut={() => setCutoff((prev) => (prev === i ? null : i))}
                  cutActive={isCut}
                  lockedLabel={
                    !released && !excluded
                      ? t('statusNotYet')
                      : excluded
                        ? t('addExcluded')
                        : isCut
                          ? t('addCutoffEndsHere')
                          : undefined
                  }
                />
              );
            })
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <Btn variant="primary" ico="check" onClick={confirmCompleted}>
              {t('addConfirm')}
            </Btn>
            <Btn variant="quiet" onClick={onClose}>
              {t('cancel')}
            </Btn>
          </div>
        </>
      )}
    </section>
  );
}

function SeasonTile({
  cover,
  label,
  released,
  excluded = false,
  selected = false,
  selectColor,
  checked = false,
  cutActive = false,
  lockedLabel,
  onClick,
  onCut,
}: {
  cover: string | null;
  label: string;
  released: boolean;
  excluded?: boolean;
  selected?: boolean;
  selectColor: string;
  checked?: boolean;
  cutActive?: boolean;
  lockedLabel?: string;
  onClick?: () => void;
  onCut?: () => void;
}) {
  const t = useT();
  const art: CSSProperties = {
    position: 'relative',
    aspectRatio: '2 / 3',
    borderRadius: 'var(--r-2)',
    overflow: 'hidden',
    background: 'var(--s1)',
    boxShadow: selected
      ? `inset 0 0 0 2px ${selectColor}, 0 0 0 3px color-mix(in srgb, ${selectColor} 24%, transparent)`
      : 'var(--sh-1), inset 0 0 0 1px var(--line)',
    filter: excluded ? 'grayscale(1) brightness(.7)' : undefined,
    cursor: onClick ? 'pointer' : 'default',
  };
  return (
    <div
      role="button"
      tabIndex={onClick ? 0 : -1}
      aria-disabled={!onClick}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={art}>
        {cover && (
          <img
            src={cover}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: !released && !excluded ? 'grayscale(1) brightness(.7)' : undefined,
            }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            inset: 'auto 0 0',
            padding: '18px 6px 6px',
            background: 'linear-gradient(to top, rgba(6,8,14,.95), transparent)',
            fontSize: 10.5,
            fontWeight: 600,
            color: selected ? 'var(--ink)' : 'var(--ink-2)',
          }}
        >
          {label}
        </span>
        {lockedLabel && (
          <span
            style={{
              position: 'absolute',
              left: 4,
              top: 4,
              padding: '2px 6px',
              borderRadius: 'var(--r-pill)',
              background: 'rgba(8,10,16,.85)',
              fontSize: 9,
              fontWeight: 600,
              color: excluded ? 'var(--pk-t)' : 'var(--ink-3)',
            }}
          >
            {lockedLabel}
          </span>
        )}
        <span style={{ position: 'absolute', right: 4, top: 4, display: 'flex', gap: 4 }}>
          {onCut && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCut();
              }}
              aria-label={t('addCutoffToggle')}
              title={t('addCutoffToggle')}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 20,
                height: 20,
                borderRadius: 6,
                background: cutActive ? 'var(--cy)' : 'rgba(8,10,16,.7)',
                color: cutActive ? '#04241f' : 'var(--ink-3)',
              }}
            >
              <Icon name="scissors" size={11} />
            </button>
          )}
          {checked && (
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 20,
                height: 20,
                borderRadius: 6,
                background: 'var(--cy)',
                color: '#04241f',
              }}
            >
              <Icon name="check" size={12} />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
