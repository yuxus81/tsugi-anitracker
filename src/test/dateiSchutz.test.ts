import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { schnappschuss } from '@/test/dateiSchutz.mjs';

/**
 * DER SCHUTZ FÜR DEN BISS-NACHWEIS.
 *
 * Das Mutationswerkzeug verbiegt echten Produktionscode und muss ihn danach
 * exakt so zurückgeben, wie er vorher war. Die erste Fassung tat das mit
 * `git checkout --` — und warf damit JEDE nicht eingecheckte Änderung in
 * diesen Dateien weg, nicht nur die eigene Mutation.
 *
 * Das ist kein theoretischer Fehler: genau so ist eine fertige, noch nicht
 * eingecheckte Fehlerbehebung in `store/library.ts` zweimal verschwunden.
 * Der Beweis dafür, dass das Werkzeug harmlos ist, gehört deshalb selbst
 * unter Test.
 */

let ordner: string | null = null;

function scratch(inhalt: string): string {
  ordner = mkdtempSync(join(tmpdir(), 'biss-'));
  const pfad = join(ordner, 'quelle.ts');
  writeFileSync(pfad, inhalt, 'utf8');
  return pfad;
}

afterEach(() => {
  if (ordner) rmSync(ordner, { recursive: true, force: true });
  ordner = null;
});

describe('Schnappschuss', () => {
  test('stellt den Stand von VOR der Mutation wieder her', () => {
    const pfad = scratch('const a = 1;\n');
    const schutz = schnappschuss([pfad]);

    writeFileSync(pfad, 'const a = 999;\n', 'utf8');
    schutz.zurueck();

    expect(readFileSync(pfad, 'utf8')).toBe('const a = 1;\n');
  });

  test('rettet auch Änderungen, die noch NICHT eingecheckt sind', () => {
    // Der eigentliche Punkt. `git checkout --` hätte hier den eingecheckten
    // Stand hergestellt und die Arbeit von Stunden weggeworfen.
    const pfad = scratch('const fix = "noch nicht committet";\n');
    const schutz = schnappschuss([pfad]);

    writeFileSync(pfad, 'const fix = "mutiert";\n', 'utf8');
    schutz.zurueck();

    expect(readFileSync(pfad, 'utf8')).toBe('const fix = "noch nicht committet";\n');
  });

  test('mehrfaches Zurücksetzen ist ungefährlich', () => {
    // Das Werkzeug setzt nach jeder Mutation zurück, am Ende nochmal und
    // zusätzlich beim Beenden des Prozesses.
    const pfad = scratch('const a = 1;\n');
    const schutz = schnappschuss([pfad]);

    writeFileSync(pfad, 'kaputt', 'utf8');
    schutz.zurueck();
    schutz.zurueck();

    expect(readFileSync(pfad, 'utf8')).toBe('const a = 1;\n');
  });

  test('schreibt nur zurück, was sich wirklich geändert hat', () => {
    // Ein Rückschreiben ohne Not stößt Dateibeobachter (Vite, OneDrive) an
    // und macht aus einem harmlosen Lauf eine Kette von Neuübersetzungen.
    const pfad = scratch('const a = 1;\n');
    const schutz = schnappschuss([pfad]);

    const vorher = readFileSync(pfad, 'utf8');
    const geschrieben = schutz.zurueck();

    expect(geschrieben).toEqual([]);
    expect(readFileSync(pfad, 'utf8')).toBe(vorher);
  });

  test('meldet, welche Datei zurückgeschrieben werden musste', () => {
    const pfad = scratch('const a = 1;\n');
    const schutz = schnappschuss([pfad]);

    writeFileSync(pfad, 'mutiert', 'utf8');

    expect(schutz.zurueck()).toEqual([pfad]);
  });

  test('mehrere Dateien werden einzeln geführt', () => {
    ordner = mkdtempSync(join(tmpdir(), 'biss-'));
    const a = join(ordner, 'a.ts');
    const b = join(ordner, 'b.ts');
    writeFileSync(a, 'A', 'utf8');
    writeFileSync(b, 'B', 'utf8');
    const schutz = schnappschuss([a, b]);

    writeFileSync(a, 'mutiert', 'utf8');
    schutz.zurueck();

    expect(readFileSync(a, 'utf8')).toBe('A');
    expect(readFileSync(b, 'utf8')).toBe('B');
  });
});
