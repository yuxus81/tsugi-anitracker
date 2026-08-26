import { Link } from 'react-router-dom';
import { bestTitle, cover, formatLabel, seasonLabel, type MediaCard } from '@/api/types';
import { cardQuery } from '@/api/tmdb';
import { Icon } from '@/components/Icon';
import { STATUS_THEME } from '@/domain/status';
import { useDisplayTitle } from '@/store/titles';
import { useSettings, useT } from '@/i18n';
import { findEntryFor, useLibrary } from '@/store/library';

/**
 * DIE KATALOG-KARTE — Entdecken, Suche, Empfehlungen.
 *
 * Bewusst eine andere Bauform als `EntryCard`: kein Fortschritt, kein
 * Weiter-Knopf, kein Countdown, und für alle dieselbe Bewegung
 * (`card--uniform`). Im Katalog stehen viele Titel mit verschiedenem Status
 * nebeneinander — fünf verschiedene Bewegungen wirkten dort unruhig. Die
 * eigenen Bewegungen gehören den EIGENEN Listen.
 *
 * „Fortsetzung folgt" wird hier NICHT als Marke gezeigt: das wäre ein
 * Spoiler für einen Titel, um den es an dieser Stelle gar nicht geht. Die
 * Information steht weiterhin im Franchise-Zeitstrahl der Detailseite.
 *
 * Die Wertung der Gemeinschaft bleibt dagegen auf der Karte — anders als im
 * Entwurf. Gold trägt in dieser Version genau eine Bedeutung, „Wertung",
 * und eine Community-Wertung ist genau das. Ohne sie wäre „Bestbewertet"
 * eine Reihe ohne sichtbares Kriterium.
 */
export function MediaTile({ media }: { media: MediaCard }) {
  const entries = useLibrary((s) => s.entries);
  const lang = useSettings((s) => s.lang);
  const t = useT();
  const eintrag = findEntryFor(entries, media.id);
  const titel = useDisplayTitle(cardQuery(media), bestTitle(media));
  const bild = cover(media);

  // Der Status färbt die Karte, aber „Fortsetzung folgt" bleibt stumm.
  const zeigeMarke = eintrag != null && eintrag.status !== 'continuation';

  return (
    <Link
      to={`/anime/${media.id}`}
      className="card card--uniform"
      data-st={eintrag?.status ?? 'watching'}
    >
      <div className="card__art">
        {bild && <img src={bild} alt="" loading="lazy" decoding="async" />}
        {media.averageScore != null && (
          <span className="score tnum">
            <Icon name="star" size={11} filled />
            {(media.averageScore / 10).toFixed(1)}
          </span>
        )}
        {/* Nur ein Zeichen, kein Fließtext: im Katalog zählt „das hast du
            schon", nicht die genaue Kategorie. Die volle Beschriftung lief
            auf der 152 px breiten Karte unter die Wertungs-Marke. Den Namen
            trägt das `aria-label` — für Screenreader ändert sich nichts. */}
        {zeigeMarke && (
          <span className="card__owned" data-st={eintrag.status} aria-label={t(STATUS_THEME[eintrag.status].labelKey)}>
            <Icon name={STATUS_THEME[eintrag.status].icon} size={14} filled />
          </span>
        )}
      </div>

      <div className="card__meta">
        <div className="card__title">{titel}</div>
        <div className="card__sub">
          {[media.format ? formatLabel(media.format, lang) : null, seasonLabel(media, lang)]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
    </Link>
  );
}
