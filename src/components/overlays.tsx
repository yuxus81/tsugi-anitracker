import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { Button, IconButton } from '@/components/kit';
import { STATUS_THEME } from '@/domain/status';
import { useT, type DictKey } from '@/i18n';
import { STATUS_ORDER, type WatchStatus } from '@/store/library';

/**
 * DIE EBENEN ÜBER DER SEITE.
 *
 * Auf dem Handy fährt das Blatt von unten herein — die Geste, die native
 * Apps benutzen. Ab 700 px wird daraus ein zentriertes Fenster; beides steckt
 * in `src/styles/overlays.css`, hier steht nur das Verhalten.
 *
 * Scrim und Blatt sind GESCHWISTER, keine Verschachtelung: ein Klick ins
 * Blatt erreicht die Fläche daneben dadurch gar nicht erst, und es braucht
 * kein `stopPropagation`, das später jemand versehentlich entfernt.
 */

/** Solange eine Ebene offen ist, scrollt der Inhalt dahinter nicht mit. */
function useScrollLock(): void {
  useEffect(() => {
    const wurzel = document.documentElement;
    // Zähler statt Schalter: liegt eine Bestätigung über einem Blatt, würde
    // das obere beim Schließen sonst die Sperre des unteren mit aufheben.
    const vorher = Number(wurzel.dataset.sheetOpen ?? '0');
    wurzel.dataset.sheetOpen = String(vorher + 1);
    return () => {
      const jetzt = Number(wurzel.dataset.sheetOpen ?? '1') - 1;
      if (jetzt > 0) wurzel.dataset.sheetOpen = String(jetzt);
      else delete wurzel.dataset.sheetOpen;
    };
  }, []);
}

/**
 * Escape schließt — und zwar IMMER, nicht nur solange der Fokus in der Ebene
 * steht. Ein Horcher am Element allein ist eine Falle: verliert der Fokus die
 * Ebene (Klick daneben, ein Bild ohne Tabindex), hört die Fluchttaste
 * plötzlich auf zu funktionieren, und man sitzt fest.
 */
export function useEscape(onEscape: () => void): void {
  // Über eine Referenz, damit ein bei jedem Rendern neu gebautes `onClose`
  // nicht den Horcher ab- und wieder anmeldet.
  const jetzt = useRef(onEscape);
  jetzt.current = onEscape;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') jetzt.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** `alertdialog` für Bestätigungen — die verlangen eine Entscheidung. */
  alert?: boolean;
}

export function Sheet({ title, onClose, children, alert = false }: SheetProps) {
  const t = useT();
  const blatt = useRef<HTMLDivElement>(null);

  useScrollLock();
  useEscape(onClose);

  useEffect(() => {
    // Ohne das bleibt der Fokus auf dem Knopf, der das Blatt geöffnet hat —
    // wer mit der Tastatur arbeitet, tabbt dann hinter der Ebene weiter.
    blatt.current?.querySelector<HTMLElement>('button, a, input, [tabindex]')?.focus();
  }, []);

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div
        ref={blatt}
        className="sheet"
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={title}
      >
        <span className="sheet__grip" aria-hidden />
        <div className="sheet__head">
          <h2 className="sheet__t">{title}</h2>
          <IconButton name="x" label={t('sheetClose')} size="sm" bare onClick={onClose} />
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();

  return (
    <Sheet title={title} onClose={onCancel} alert>
      {message && <p className="sub confirm__msg">{message}</p>}
      <div className="confirm__acts">
        <Button variant="quiet" wide onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button variant="danger" icon="trash" wide onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

/**
 * Die Statuswahl — dieselbe Liste beim Hinzufügen und beim Verschieben.
 *
 * Jede Zeile erklärt ihre Kategorie in einem Satz. Ohne das musste man aus
 * fünf Namen erraten, was der Unterschied zwischen „Noch zu schauen" und
 * „Fortsetzung folgt" ist — die Farbe allein sagt es nicht.
 */
const HINT_KEY: Record<WatchStatus, DictKey> = {
  watching: 'hintWatching',
  nextup: 'hintNextup',
  planned: 'hintPlanned',
  continuation: 'hintContinuation',
  completed: 'hintCompleted',
};

export function StatusPicker({
  current,
  onPick,
}: {
  current: WatchStatus | null;
  onPick: (status: WatchStatus) => void;
}) {
  const t = useT();

  return (
    <div role="radiogroup" aria-label={t('changeStatus')}>
      {STATUS_ORDER.map((s) => {
        const gewaehlt = s === current;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={gewaehlt}
            data-st={s}
            className={`pickrow${gewaehlt ? ' is-on' : ''}`}
            onClick={() => onPick(s)}
          >
            <span className="pickrow__ico" aria-hidden>
              <Icon name={STATUS_THEME[s].icon} size={19} filled />
            </span>
            <span className="pickrow__body">
              <span className="pickrow__t">{t(STATUS_THEME[s].labelKey)}</span>
              <span className="pickrow__s">{t(HINT_KEY[s])}</span>
            </span>
            {gewaehlt && <Icon name="check" size={18} />}
          </button>
        );
      })}
    </div>
  );
}
