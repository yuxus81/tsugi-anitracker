import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * DER ZUFALLSROLLER.
 *
 * Er rollt sichtbar durch die Liste und wird dabei langsamer, statt sofort
 * ein Ergebnis hinzuwerfen — die Bewegung IST die Entscheidung. Ein Wurf,
 * der still eine Zahl zieht, fühlt sich an wie ein Fehler.
 *
 * Der Baustein kennt nur Ids, keine Einträge: Home und Bibliothek würfeln
 * aus verschiedenen Listen, und ein Roller, der die Bibliothek selbst liest,
 * wäre an eine davon gebunden.
 */
export interface Roller {
  /** Der gerade hervorgehobene Eintrag — auch am Ende die Entscheidung. */
  highlightId: number | null;
  rolling: boolean;
  roll: () => void;
}

export function useRoller(pool: number[]): Roller {
  const [state, setState] = useState<{ highlightId: number | null; rolling: boolean }>({
    highlightId: null,
    rolling: false,
  });
  const timer = useRef<number | null>(null);
  const laeuft = useRef(false);

  // Die Liste über eine Referenz, damit `roll` stabil bleibt: sonst bekäme
  // jedes Rendern der Seite eine neue Funktion, und jeder Aufrufer, der sie
  // in einer Abhängigkeitsliste führt, liefe unnötig mit.
  const liste = useRef(pool);
  liste.current = pool;

  const stopp = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Beim Verlassen der Seite darf kein Timer stehen bleiben — er riefe
  // `setState` auf einer Komponente, die es nicht mehr gibt.
  useEffect(() => stopp, [stopp]);

  const roll = useCallback(() => {
    const l = liste.current;
    if (l.length === 0 || laeuft.current) return;

    stopp();
    laeuft.current = true;

    const ziel = Math.floor(Math.random() * l.length);
    // Mehrere volle Runden, damit man das Rollen sieht — bei einem einzigen
    // Eintrag wäre das nur ein Zappeln, also genau ein Schritt.
    const runden = l.length > 1 ? 3 : 0;
    const schritte = runden * l.length + ziel + 1;
    let schritt = 0;

    const tick = () => {
      const letzter = schritt === schritte - 1;
      setState({ highlightId: l[schritt % l.length], rolling: !letzter });
      schritt += 1;

      if (letzter) {
        laeuft.current = false;
        timer.current = null;
        return;
      }
      // Quadratisch bremsen: schnell los, spürbar auslaufend.
      const anteil = schritt / schritte;
      timer.current = window.setTimeout(tick, 45 + anteil * anteil * 240);
    };

    tick();
  }, [stopp]);

  return { highlightId: state.highlightId, rolling: state.rolling, roll };
}
