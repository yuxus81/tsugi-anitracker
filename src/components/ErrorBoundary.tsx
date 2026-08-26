import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Fängt Render-Fehler ab, damit ein einzelner kaputter Datensatz nicht die
 * ganze App weiß werden lässt. Ohne diese Grenze reißt React bei jedem
 * geworfenen Fehler den kompletten Baum ab — auf dem Handy ohne Konsole ist
 * das eine Sackgasse, aus der auch ein Neustart nicht herausführt, solange der
 * auslösende Eintrag im Speicher liegt.
 *
 * Bewusst eine Klassenkomponente: `componentDidCatch`/`getDerivedStateFromError`
 * haben bis heute kein Hook-Äquivalent.
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
  private resetCache = async () => {
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

    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center">
          <p className="font-display text-xl font-semibold text-ink">Da ist etwas schiefgelaufen</p>
          <p className="mt-2 text-sm leading-6 text-ink-dim">
            Die Ansicht konnte nicht geladen werden. Deine Bibliothek ist sicher — sie liegt in
            deinem Konto, nicht nur auf diesem Gerät.
          </p>
          <p className="mt-3 break-words text-xs text-ink-faint">{error.message}</p>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={this.reload}
              className="press min-h-[44px] rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg"
            >
              Neu laden
            </button>
            <button
              type="button"
              onClick={() => void this.resetCache()}
              className="press min-h-[44px] rounded-ctl border border-line bg-raised px-4 py-2.5 text-sm font-medium text-ink"
            >
              Lokalen Zwischenspeicher leeren
            </button>
          </div>
        </div>
      </div>
    );
  }
}
