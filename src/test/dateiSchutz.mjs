import { readFileSync, writeFileSync } from 'node:fs';

/**
 * SCHUTZ FÜR DEN BISS-NACHWEIS.
 *
 * Das Mutationswerkzeug verbiegt echten Produktionscode und muss ihn danach
 * exakt so zurückgeben, wie er vorher war.
 *
 * Die erste Fassung tat das mit `git checkout -- <datei>`. Das stellt aber
 * nicht den Stand von vorher her, sondern den ZULETZT EINGECHECKTEN — und
 * wirft damit jede noch nicht committete Änderung in diesen Dateien weg.
 * Genau so ist eine fertige Fehlerbehebung in `store/library.ts` zweimal
 * spurlos verschwunden: Änderung gemacht, Biss-Nachweis gefahren, Änderung
 * weg. Ohne Fehlermeldung, weil das Werkzeug ja „nur aufgeräumt" hat.
 *
 * Deshalb: Inhalt vorher merken, Inhalt hinterher zurückschreiben. Git ist
 * daran gar nicht beteiligt.
 */
export function schnappschuss(dateien) {
  const original = new Map();
  for (const datei of dateien) original.set(datei, readFileSync(datei, 'utf8'));

  return {
    /**
     * Schreibt zurück, was sich geändert hat, und meldet welche Dateien das
     * waren. Unveränderte Dateien werden NICHT angefasst — ein Schreibvorgang
     * ohne Not stößt Dateibeobachter (Vite, OneDrive) an und macht aus einem
     * harmlosen Lauf eine Kette von Neuübersetzungen.
     */
    zurueck() {
      const geschrieben = [];
      for (const [datei, inhalt] of original) {
        if (readFileSync(datei, 'utf8') === inhalt) continue;
        writeFileSync(datei, inhalt, 'utf8');
        geschrieben.push(datei);
      }
      return geschrieben;
    },
  };
}
