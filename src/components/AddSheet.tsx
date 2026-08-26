import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Button, Stepper } from '@/components/kit';
import { Sheet, StatusPicker } from '@/components/overlays';
import { STATUS_THEME } from '@/domain/status';
import { useToasts } from '@/store/toast';
import { isReleased, useLibrary, type SeasonSnap, type WatchStatus } from '@/store/library';
import { useT } from '@/i18n';

/**
 * DER AUFNAHME-WEG — zwei Schritte, der zweite nur bei Bedarf.
 *
 *  1. In welche Kategorie?
 *  2. Wie weit bist du? — nur bei „Weiter schauen" und „Geschaut". Wer etwas
 *     nur vormerkt, hat nichts zu beantworten, und ein Zwischenschritt ohne
 *     Frage ist nur ein Klick.
 *
 * Im zweiten Schritt steckt die SCHERE. Sie ist nicht Deko: viele Franchises
 * führen Staffeln, die man nie sehen will (oder die nur auf dem Papier
 * existieren). Ohne den Schnitt gälte so ein Franchise NIE als fertig — es
 * wartete für immer auf eine Staffel, die einen nicht interessiert.
 */

interface AddSheetProps {
  seasons: SeasonSnap[];
  genres: string[];
  onClose: () => void;
  /** Wird nach dem erfolgreichen Aufnehmen gerufen. */
  onDone: () => void;
}

/** Braucht diese Kategorie überhaupt eine Rückfrage? */
function fragtNach(status: WatchStatus, anzahl: number): boolean {
  // „Weiter schauen" immer: die Staffel mag klar sein, die Folge ist es nie.
  if (status === 'watching') return true;
  // „Geschaut" nur bei mehreren Staffeln — bei einer gibt es nichts zu wählen.
  if (status === 'completed') return anzahl > 1;
  return false;
}

export function AddSheet({ seasons, genres, onClose, onDone }: AddSheetProps) {
  const t = useT();
  const addFranchise = useLibrary((s) => s.addFranchise);
  const push = useToasts((s) => s.push);

  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [index, setIndex] = useState(0);
  const [episode, setEpisode] = useState(1);
  const [cutoff, setCutoff] = useState<number | null>(null);

  const aufnehmen = (gewaehlt: WatchStatus, idx: number, folge: number, schnitt: number | null) => {
    // Der Schnitt zuerst: alles danach gehört gar nicht erst zum Eintrag.
    const behalten = schnitt !== null ? seasons.slice(0, schnitt + 1) : seasons;

    let durch: number;
    if (gewaehlt === 'completed') {
      // „bis Staffel N geschaut" heißt: N Staffeln sind durch.
      durch = Math.min(idx + 1, behalten.length);
    } else if (gewaehlt === 'watching') {
      durch = Math.min(idx, behalten.length);
    } else {
      durch = 0;
    }

    const neu = addFranchise({
      seasons: behalten,
      genres,
      status: gewaehlt,
      watchedThrough: durch,
      currentEpisode: gewaehlt === 'watching' ? folge : undefined,
    });

    // Der Store leitet den ECHTEN Status ab (eine unveröffentlichte nächste
    // Staffel macht aus „geschaut" ein „Fortsetzung folgt"). Gemeldet wird
    // deshalb, was herausgekommen ist — nicht, was angeklickt wurde.
    if (neu) push(t('addedToast', { s: t(STATUS_THEME[neu.status].labelKey) }));
    onDone();
  };

  const waehle = (gewaehlt: WatchStatus) => {
    if (!fragtNach(gewaehlt, seasons.length)) {
      aufnehmen(gewaehlt, gewaehlt === 'completed' ? seasons.length - 1 : 0, 1, null);
      return;
    }
    // Erste anwählbare Staffel vorbelegen — bei „Weiter schauen" muss sie
    // veröffentlicht sein.
    const start =
      gewaehlt === 'watching' ? Math.max(0, seasons.findIndex(isReleased)) : 0;
    setStatus(gewaehlt);
    setIndex(start);
    setEpisode(1);
    setCutoff(null);
  };

  if (status === null) {
    return (
      <Sheet title={t('add')} onClose={onClose}>
        <p className="muted sheet__lead">{t('pickWhere')}</p>
        <StatusPicker current={null} onPick={waehle} />
      </Sheet>
    );
  }

  const istGeschaut = status === 'completed';
  const gewaehlteStaffel = seasons[index];

  return (
    <Sheet
      title={istGeschaut ? t('addHowFar') : t('addWatchingSeasonPrompt')}
      onClose={onClose}
    >
      {istGeschaut && <p className="muted sheet__lead">{t('addCutoffHint')}</p>}

      <ul className="seasonlist" data-st={status}>
        {seasons.map((s, i) => {
          const abgeschnitten = cutoff !== null && i > cutoff;
          const erschienen = isReleased(s);
          // Bei „Weiter schauen" ist eine unveröffentlichte Staffel keine
          // Option: man kann nicht bei etwas sein, das es nicht gibt.
          const waehlbar = abgeschnitten ? false : istGeschaut ? true : erschienen;

          return (
            <li
              key={s.id}
              data-testid="season-row"
              className={`seasonrow${abgeschnitten ? ' is-cut' : ''}${index === i ? ' is-on' : ''}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={index === i}
                disabled={!waehlbar}
                className="seasonrow__pick"
                onClick={() => {
                  setIndex(i);
                  setEpisode(1);
                }}
              >
                <span className="seasonrow__art">
                  {s.coverUrl && <img src={s.coverUrl} alt="" loading="lazy" />}
                </span>
                <span className="seasonrow__body">
                  <span className="seasonrow__t">{t('seasonN', { n: i + 1 })}</span>
                  <span className="seasonrow__s">{s.title}</span>
                </span>
                {!erschienen && (
                  <span className="seasonrow__wait" aria-label={t('statusNotYet')}>
                    <Icon name="clock" size={15} />
                  </span>
                )}
                {index === i && <Icon name="check" size={17} />}
              </button>

              {istGeschaut && (
                <button
                  type="button"
                  className={`seasonrow__cut${cutoff === i ? ' is-on' : ''}`}
                  aria-label={t('addCutoffToggle')}
                  title={t('addCutoffToggle')}
                  aria-pressed={cutoff === i}
                  onClick={() => setCutoff((c) => (c === i ? null : i))}
                >
                  <Icon name="scissors" size={16} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {status === 'watching' && (
        <div className="addstep">
          <span className="muted">{t('addWatchingEpisodePrompt')}</span>
          <Stepper
            value={episode}
            max={gewaehlteStaffel?.episodes ?? null}
            onChange={setEpisode}
            label={t('epShort')}
          />
        </div>
      )}

      <div className="addstep__acts">
        <Button variant="quiet" wide onClick={() => setStatus(null)}>
          {t('addBack')}
        </Button>
        <Button
          variant="primary"
          icon="check"
          wide
          onClick={() => aufnehmen(status, index, episode, cutoff)}
        >
          {t('addConfirm')}
        </Button>
      </div>
    </Sheet>
  );
}
