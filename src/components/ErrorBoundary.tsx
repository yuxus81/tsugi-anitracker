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
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)', color: 'var(--ink)' }}>
        <div className="tile" style={{ width: '100%', maxWidth: 384, textAlign: 'center' }}>
          <p className="h-sec">Da ist etwas schiefgelaufen</p>
          <p className="sub" style={{ marginTop: 8 }}>
            Die Ansicht konnte nicht geladen werden. Deine Bibliothek ist sicher — sie liegt in
            deinem Konto, nicht nur auf diesem Gerät.
          </p>
          <p className="muted" style={{ marginTop: 12, wordBreak: 'break-word' }}>{error.message}</p>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" onClick={this.reload} className="btn btn--primary btn--wide">
              <span>Neu laden</span>
            </button>
            <button type="button" onClick={() => void this.resetCache()} className="btn btn--quiet btn--wide">
              <span>Lokalen Zwischenspeicher leeren</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
