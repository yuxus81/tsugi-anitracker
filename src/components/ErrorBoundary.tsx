import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/kit';
import { translate, useSettings } from '@/i18n';

/**
 * DIE LETZTE GRENZE.
 *
 * Fängt Render-Fehler ab, damit ein einzelner kaputter Datensatz nicht die
 * ganze App weiß werden lässt. Ohne diese Grenze reißt React bei jedem
 * geworfenen Fehler den kompletten Baum ab — auf dem Handy ohne Konsole ist
 * das eine Sackgasse, aus der auch ein Neustart nicht herausführt, solange der
 * auslösende Eintrag im Speicher liegt.
 *
 * Sie trägt dieselbe Platte wie das Tor (`.gate`): wer hier landet, hat kein
 * funktionierendes Gerät in der Hand, also gibt es auch keinen Rahmen, keine
 * Kopf- und keine Tab-Leiste. Nur die Platte, der Grund und zwei Auswege.
 *
 * Bewusst eine Klassenkomponente: `componentDidCatch`/`getDerivedStateFromError`
 * haben bis heute kein Hook-Äquivalent. Die Sprache kommt deshalb über
 * `useSettings.getState()` statt über `useT()` — ein Hook geht hier nicht, und
 * live umschalten kann man ohnehin nichts mehr, wenn die App gerade steht.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tsugi: Render-Fehler abgefangen', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  /**
   * Letzter Ausweg, wenn ein Eintrag im lokalen Cache den Absturz auslöst:
   * nur den Cache leeren, NICHT die Cloud. Beim nächsten Start lädt die App
   * frisch aus Supabase — die Bibliothek ist also nicht verloren.
   */
  private resetCache = () => {
    try {
      indexedDB.deleteDatabase('tsugi');
    } catch {
      /* ignorieren — dann bleibt nur das Neuladen */
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const t = (key: 'errTitle' | 'errHint' | 'errReload' | 'errClearCache') =>
      translate(useSettings.getState().lang, key);

    return (
      <div className="gate">
        <div className="gate__plate" role="alert">
          <div className="gate__head">
            {/* Pink trägt in V5 ausschließlich Gefahr — hier ist sie am Platz. */}
            <span className="errb__seal" aria-hidden>
              <Icon name="info" size={24} filled />
            </span>
            <h1 className="gate__title">{t('errTitle')}</h1>
            <p className="sub gate__tagline">{t('errHint')}</p>
            <p className="errb__reason">{error.message}</p>
          </div>
          <div className="errb__ways">
            <Button onClick={this.reload} variant="primary" icon="refresh" wide>
              {t('errReload')}
            </Button>
            <Button onClick={this.resetCache} variant="quiet" wide>
              {t('errClearCache')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
