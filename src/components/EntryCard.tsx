import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { seasonLabel } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Tag } from '@/components/kit';
import { countdownParts, seasonNo, seasonPct, seasonProgressLabel } from '@/domain/progress';
import { useSettings, useT } from '@/i18n';
import {
  currentSeason,
  entryCover,
  entryTitle,
  useLibrary,
  watchedEpisodes,
  type LibraryEntry,
} from '@/store/library';

/**
 * DIE KARTE. Eine Bauform, fünf Charaktere.
 *
 * Was sich je Kategorie unterscheidet: die Behandlung des Covers, das
 * Zeichen darauf und (am PC) die Bewegung. Daran erkennt man ohne
 * Überschrift, in welcher Kategorie man gerade ist.
 *
 * Jede Kategorie MUSS im Ruhezustand erkennbar sein. Touch-Geräte haben kein
 * Hover — dort ist der Ruhezustand der einzige Zustand, den man je sieht.
 * Deshalb tragen auch „Noch zu schauen" und „Geschaut" eine kleine Marke,
 * statt sich auf ihre Bewegung zu verlassen.
 *
 * `uniform` schaltet auf die KATALOG-Bauform (Entdecken, Suche,
 * Empfehlungen): dort hebt jede Karte gleich an, unabhängig vom Status. Die
 * unterschiedlichen Bewegungen sind den eigenen Listen vorbehalten — im
 * Katalog wirkten sie unruhig, weil dort viele Karten mit verschiedenem
 * Status nebeneinanderstehen. Und die „Fortsetzung folgt"-Marke bleibt dort
 * ganz weg: sie wäre ein Spoiler für einen Titel, um den es an der Stelle
 * gar nicht geht.
 */

interface EntryCardProps {
  entry: LibraryEntry;
  /**
   * Ausstrahlungstermin der nächsten Folge (AniList-Zeitstempel in
   * SEKUNDEN). Kommt von außen, weil die Karte sonst selbst Daten holen
   * müsste — sie bleibt so eine reine Anzeige.
   */
  airingAt?: number | null;
  uniform?: boolean;
  showTag?: boolean;
  justAdded?: boolean;
}

export function EntryCard({
  entry: e,
  airingAt = null,
  uniform = false,
  showTag = false,
  justAdded = false,
}: EntryCardProps) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const setProgress = useLibrary((s) => s.setProgress);

  const s = currentSeason(e) ?? e.seasons[0];
  const cover = entryCover(e);
  const st = e.status;

  const weiter = (ev: MouseEvent) => {
    // Die Karte ist ein Link — ohne das landete jeder Klick auf dem Knopf
    // zusätzlich auf der Detailseite.
    ev.preventDefault();
    ev.stopPropagation();
    setProgress(e.rootId, e.progress + 1);
  };

  /** Kurzform für die Wartemarke — die Pille ist schmal, Fließtext sprengt sie. */
  const warteText = (): string => {
    const rest = countdownParts(airingAt, Date.now());
    if (rest) {
      if (rest.days > 0) return `${rest.days} T`;
      if (rest.hours > 0) return `${rest.hours} Std`;
      return `${rest.minutes} Min`;
    }

    const roh = e.releaseNote;
    if (!roh) return '—';
    const [erstes, zweites] = roh.split(' ');
    // Nur ein echter Monatsname wird gekürzt. Ein nacktes Jahr („2027")
    // darf nicht mitten in die Ziffern geschnitten werden.
    if (zweites && /^[A-Za-zÄÖÜäöüß]+$/.test(erstes)) return `${erstes.slice(0, 3)}. ${zweites}`;
    return roh;
  };

  const untertitel = (): string => {
    switch (st) {
      case 'watching':
        return seasonProgressLabel(e);
      case 'nextup':
        return s?.format === 'MOVIE' ? t('cardFilmWaits') : t('cardSeasonWaits', { n: seasonNo(e) });
      case 'planned':
        return (s && seasonLabel(s, lang)) ?? t('cardBookmarked');
      case 'continuation':
        return e.releaseNote ?? t('cardDateUnknown');
      case 'completed':
        return `${t('cardEpisodes', { n: watchedEpisodes(e) })} · ${
          e.rating ? `${e.rating}/10` : t('cardNoRating')
        }`;
      default:
        return '';
    }
  };

  const klassen = ['card', uniform && 'card--uniform', justAdded && 'just-added']
    .filter(Boolean)
    .join(' ');

  return (
    <Link to={`/anime/${e.rootId}`} className={klassen} data-st={st}>
      <div className="card__art">
        {cover && <img src={cover} alt="" loading="lazy" decoding="async" />}

        {!uniform && st === 'watching' && (
          <>
            <div className="card__prog" aria-hidden>
              <i style={{ width: `${(seasonPct(e) * 100).toFixed(1)}%` }} />
            </div>
            <button
              type="button"
              className="card__knob"
              aria-label={t('continueWithEp', { n: e.progress + 1 })}
              onClick={weiter}
            >
              <Icon name="play" size={16} filled />
            </button>
          </>
        )}

        {!uniform && st === 'nextup' && (
          <span className="ready-badge" aria-hidden>
            <Icon name="ready" size={15} filled />
          </span>
        )}

        {!uniform && st === 'planned' && (
          <svg className="ribbon" viewBox="0 0 22 30" aria-hidden="true">
            <path
              d="M0 0h22v27.4a1 1 0 0 1-1.55.83L11 22l-9.45 6.23A1 1 0 0 1 0 27.4Z"
              fill="currentColor"
            />
          </svg>
        )}

        {!uniform && st === 'continuation' && (
          <span className="wait">
            <svg
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx={12} cy={12} r={8.6} />
              {/* Der Zeiger tickt im Sekundentakt — das Warten wird sichtbar. */}
              <path className="tick" d="M12 12V6.8" />
            </svg>
            <span className="wait__label">{warteText()}</span>
          </span>
        )}

        {!uniform && st === 'completed' && (
          <span className="seal-badge" aria-hidden>
            <Icon name="seal" size={15} filled />
          </span>
        )}

        {showTag && <Tag status={st} float />}
      </div>

      <div className="card__meta">
        <div className="card__title">{entryTitle(e)}</div>
        <div className="card__sub">{untertitel()}</div>
      </div>
    </Link>
  );
}
