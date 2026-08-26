/**
 * Typen für `dateiSchutz.mjs`.
 *
 * Das Werkzeug selbst ist bewusst reines JavaScript: `biss.mjs` läuft direkt
 * über Node, ohne Übersetzungsschritt — ein `.ts` müsste dafür erst gebaut
 * werden. Die Typen stehen daneben, damit der Test trotzdem geprüft wird.
 */
export interface Schnappschuss {
  /** Schreibt Geändertes zurück und meldet, welche Dateien das waren. */
  zurueck(): string[];
}

export function schnappschuss(dateien: string[]): Schnappschuss;
