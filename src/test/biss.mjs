/**
 * BISS-NACHWEIS
 * =============
 * Charakterisierungstests werden gegen Code geschrieben, der schon läuft —
 * sie sind sofort grün. Grün ohne je rot gewesen zu sein beweist nichts:
 * der Test könnte am Ziel vorbeimessen und würde es nie verraten.
 *
 * Dieses Skript verbiegt den Produktionscode absichtlich, Mutation für
 * Mutation, und erwartet, dass die Tests jedes Mal ROT werden. Bleibt eine
 * Mutation unbemerkt, ist an dieser Stelle eine Lücke im Netz — das Skript
 * endet dann mit Fehlercode und nennt sie beim Namen.
 *
 * Aufruf:  node src/test/biss.mjs <testdatei> [weitere...]
 *
 * Die mutierten Dateien werden aus einem Schnappschuss zurückgeschrieben,
 * der VOR dem ersten Eingriff gezogen wurde — auch wenn das Skript abbricht.
 *
 * Früher stand hier `git checkout --`. Das stellt aber nicht den Stand von
 * vorher her, sondern den zuletzt eingecheckten, und hat zweimal eine
 * fertige, noch nicht committete Fehlerbehebung in `store/library.ts`
 * weggeworfen. Siehe `dateiSchutz.mjs`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { schnappschuss } from './dateiSchutz.mjs';

const MUTATIONEN = [
  {
    // Der Wettlauf-Schutz selbst. Er ist unsichtbar und tritt nur auf einem
    // frischen Gerät in Erscheinung — ohne Mutationsprobe wüsste niemand,
    // ob der Test ihn wirklich festhält.
    name: 'hydrate überschreibt die bereits geladene Cloud-Bibliothek wieder',
    datei: 'src/store/library.ts',
    von: '    if (get().remoteApplied) {',
    nach: '    if (false) {',
  },
  {
    name: 'resetLocal vergisst die Cloud-Marke — der Cache bleibt tot',
    datei: 'src/store/library.ts',
    von: "set({ entries: {}, completedOrder: [], hydrated: false, remoteApplied: false });",
    nach: "set({ entries: {}, completedOrder: [], hydrated: false });",
  },
  {
    name: 'watchedEpisodes zählt eine Staffel zu viel',
    datei: 'src/store/library.ts',
    von: 'for (let i = 0; i < e.seasonIndex; i++) sum += e.seasons[i]?.episodes ?? 0;',
    nach: 'for (let i = 0; i <= e.seasonIndex; i++) sum += e.seasons[i]?.episodes ?? 0;',
  },
  {
    name: 'totalEpisodes zählt angekündigte Staffeln mit',
    datei: 'src/store/library.ts',
    von: 'return e.seasons.filter(isReleased).reduce((s, x) => s + (x.episodes ?? 0), 0);',
    nach: 'return e.seasons.reduce((s, x) => s + (x.episodes ?? 0), 0);',
  },
  {
    name: 'isReleased hält laufende Staffeln für unveröffentlicht',
    datei: 'src/store/library.ts',
    von: "return s.airStatus === 'FINISHED' || s.airStatus === 'RELEASING';",
    nach: "return s.airStatus === 'FINISHED';",
  },
  {
    name: 'meanDuration fällt auf 0 statt 24 Minuten zurück',
    datei: 'src/store/library.ts',
    von: 'return known.length ? known.reduce((a, b) => a + b, 0) / known.length : 24;',
    nach: 'return known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;',
  },
  {
    // Kein '\n' im Suchtext: die Quelldateien haben CRLF-Zeilenenden, ein
    // eingebautes '\n' fände nie etwas und meldete still „Fundstelle veraltet".
    name: 'releaseLabel rechnet ohne feste Zeitzone',
    datei: 'src/store/library.ts',
    von: "timeZone: 'UTC',",
    nach: '',
  },
  {
    // Nicht `> 0` → `>= 0`: das wäre ein GLEICHWERTIGER Mutant, weil
    // `seasons[-1]` in JavaScript ebenfalls undefined ergibt. Ein solcher
    // Mutant kann gar nicht gefangen werden und würde nur eine Lücke
    // vortäuschen, die keine ist.
    name: 'lastWatchedSeason liefert die aktuelle statt der vorherigen Staffel',
    datei: 'src/store/library.ts',
    von: 'return e.seasonIndex > 0 ? e.seasons[e.seasonIndex - 1] : undefined;',
    nach: 'return e.seasonIndex > 0 ? e.seasons[e.seasonIndex] : undefined;',
  },
  {
    name: 'entriesByStatus sortiert verkehrt herum',
    datei: 'src/store/library.ts',
    von: 'out[k].sort((a, b) => b.updatedAt - a.updatedAt);',
    nach: 'out[k].sort((a, b) => a.updatedAt - b.updatedAt);',
  },
  {
    name: 'entryCover verliert den Rückfall auf die erste Staffel',
    datei: 'src/store/library.ts',
    von: 'return currentSeason(e)?.coverUrl ?? e.seasons[0]?.coverUrl ?? null;',
    nach: 'return currentSeason(e)?.coverUrl ?? null;',
  },
  {
    name: 'deriveStatus erkennt eine fertig geschaute Staffel nicht mehr',
    datei: 'src/store/library.ts',
    von: 'idx === last && cur && isReleased(cur) && cur.episodes !== null && progress >= cur.episodes;',
    nach: 'idx === last && cur && isReleased(cur) && cur.episodes !== null && progress > cur.episodes;',
  },
  {
    name: 'deriveStatus schickt eine angekündigte Staffel nicht nach „Fortsetzung folgt"',
    datei: 'src/store/library.ts',
    von: '  if (cur && !isReleased(cur)) {',
    nach: '  if (false && cur && !isReleased(cur)) {',
  },
  {
    name: 'setProgress verliert die Umstufung von Watchlist auf „Schaue ich"',
    datei: 'src/store/library.ts',
    von: "    if (clamped > 0 && (cur.status === 'planned' || cur.status === 'nextup')) {",
    nach: "    if (false && clamped > 0 && (cur.status === 'planned' || cur.status === 'nextup')) {",
  },
  {
    name: 'setProgress deckelt den Fortschritt nicht mehr auf die Folgenzahl',
    datei: 'src/store/library.ts',
    von: 'const clamped = Math.max(0, Math.min(Math.floor(progress), max));',
    nach: 'const clamped = Math.floor(progress);',
  },
  {
    // Sichtbar wird das nur, wenn es MEHRERE unveröffentlichte Staffeln gibt:
    // bei genau einer klemmt der Zweig `through >= seasons.length` das
    // Ergebnis ohnehin auf denselben Wert, und der Mutant wäre gleichwertig.
    name: 'addFranchise ignoriert das Abschneiden auf veröffentlichte Staffeln',
    datei: 'src/store/library.ts',
    von: "const through = status === 'completed' ? releasedCount : Math.min(watchedThrough, releasedCount);",
    nach: "const through = status === 'completed' ? releasedCount : watchedThrough;",
  },
  {
    name: 'setStatus(completed) landet auf einer unveröffentlichten Staffel',
    datei: 'src/store/library.ts',
    von: 'const releasedIdx = cur.seasons.reduce((acc, s, i) => (isReleased(s) ? i : acc), 0);',
    nach: 'const releasedIdx = cur.seasons.length - 1;',
  },
  // BEWUSST NICHT AUFGENOMMEN — gleichwertige Mutanten, die keine Lücke
  // anzeigen, sondern nur Lärm machen würden:
  //
  //   setWatchedThrough: `Math.max(0, …)` → `Math.min(…)`
  //     Ein negativer Index kommt trotzdem bei 0 an, weil `deriveStatus`
  //     ihn ein zweites Mal klemmt. Die Absicherung dort ist doppelt
  //     gemoppelt — harmlos, aber nicht durch einen Test beobachtbar.
  //
  //   lastWatchedSeason: `> 0` → `>= 0`
  //     `seasons[-1]` ist in JavaScript ebenfalls undefined.
  {
    name: 'setUsername kürzt den Namen nicht mehr auf 24 Zeichen',
    datei: 'src/store/library.ts',
    von: 'const trimmed = name.trim().slice(0, 24);',
    nach: 'const trimmed = name.trim();',
  },

  // ---- API-Helfer ---------------------------------------------------------
  {
    // Die Grenze ist unsichtbar: zu große Bündel scheitern erst draußen bei
    // AniList, und der Scan verschluckt den Fehler. Genau deshalb muss ein
    // Test daran hängen.
    name: 'fetchRelationSlices bündelt wieder über die Komplexitätsgrenze',
    datei: 'src/api/anilist.ts',
    von: 'const MAX_IDS_PRO_ABFRAGE = 8;',
    nach: 'const MAX_IDS_PRO_ABFRAGE = 12;',
  },
  {
    name: 'fetchRelationSlices teilt gar nicht mehr auf',
    datei: 'src/api/anilist.ts',
    von: 'for (let i = 0; i < ids.length; i += MAX_IDS_PRO_ABFRAGE) {',
    nach: 'for (let i = 0; i < ids.length; i += 9999) {',
  },
  {
    name: 'bestTitle bevorzugt Romaji statt Englisch',
    datei: 'src/api/types.ts',
    von: "return m.title.english || m.title.romaji || 'Unbekannt';",
    nach: "return m.title.romaji || m.title.english || 'Unbekannt';",
  },
  {
    name: 'cover nimmt das kleinere Bild zuerst',
    datei: 'src/api/types.ts',
    von: 'return m.coverImage.extraLarge || m.coverImage.large || null;',
    nach: 'return m.coverImage.large || m.coverImage.extraLarge || null;',
  },
  {
    name: 'seasonLabel verliert den Rückfall auf das nackte Jahr',
    datei: 'src/api/types.ts',
    von: 'if (m.seasonYear) return String(m.seasonYear);',
    nach: '',
  },
  {
    name: 'isMainlineFormat hält Kinofilme nicht mehr für eigene Staffeln',
    datei: 'src/api/anilist.ts',
    von: "return format === 'TV' || format === 'MOVIE' || format === 'ONA';",
    nach: "return format === 'TV' || format === 'ONA';",
  },
  {
    name: 'pickSequel greift auch nach Manga-Verknüpfungen',
    datei: 'src/api/anilist.ts',
    von: "(e) => e.relationType === 'SEQUEL' && e.node.type === 'ANIME',",
    nach: "(e) => e.relationType === 'SEQUEL',",
  },

  // ---- Franchise-Zeitstrahl ----------------------------------------------
  {
    name: 'buildFranchiseSeasons mischt Recap- und Spin-off-Filme mit ein',
    datei: 'src/domain/franchise.ts',
    von: ".filter((x) => x.media.format === 'MOVIE' && x.relation !== 'Zusammenfassung' && x.relation !== 'Spin-off')",
    nach: ".filter((x) => x.media.format === 'MOVIE')",
  },
  {
    name: 'buildFranchiseSeasons sortiert Staffeln ohne Jahr nach vorn',
    datei: 'src/domain/franchise.ts',
    von: 'withOrder.sort((a, b) => (a.c.seasonYear ?? 9999) - (b.c.seasonYear ?? 9999) || a.i - b.i);',
    nach: 'withOrder.sort((a, b) => (a.c.seasonYear ?? 0) - (b.c.seasonYear ?? 0) || a.i - b.i);',
  },
  {
    name: 'buildFranchiseSeasons lässt Duplikate stehen',
    datei: 'src/domain/franchise.ts',
    von: 'const ordered = withOrder.map((w) => w.c).filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));',
    nach: 'const ordered = withOrder.map((w) => w.c);',
  },
  {
    name: 'buildFranchiseSeasons ignoriert die Hauptlinie und nimmt nur den Detailtitel',
    datei: 'src/domain/franchise.ts',
    von: 'const base = main.length > 0 ? [...main, ...movieExtras] : [detail];',
    nach: 'const base = [detail];',
  },
];

const dateien = [...new Set(MUTATIONEN.map((m) => m.datei))];

// Der Schnappschuss wird HIER gezogen, beim Laden des Moduls — also
// garantiert vor dem ersten Eingriff.
const schutz = schnappschuss(dateien);

function zuruecksetzen() {
  schutz.zurueck();
}

/**
 * Vitest direkt über seinen JS-Einstieg starten statt über `npx`. Das spart
 * die Shell — und damit die Warnung, dass Argumente in einer Shell nur
 * aneinandergehängt statt maskiert werden.
 */
const VITEST_BIN = fileURLToPath(import.meta.resolve('vitest/vitest.mjs'));

function testeMit(pfade) {
  try {
    execFileSync(process.execPath, [VITEST_BIN, 'run', ...pfade], { stdio: 'pipe' });
    return 'gruen';
  } catch {
    return 'rot';
  }
}

const testPfade = process.argv.slice(2);
if (testPfade.length === 0) {
  console.error('Aufruf: node src/test/biss.mjs <testdatei> [weitere...]');
  process.exit(2);
}

const entwischt = [];
const protokoll = [];

process.on('exit', zuruecksetzen);
process.on('SIGINT', () => process.exit(130));

try {
  // Ausgangslage: ohne Mutation MÜSSEN die Tests grün sein, sonst misst der
  // ganze Lauf nur ein kaputtes Arbeitsverzeichnis.
  process.stdout.write('Ausgangslage (unverändert) ... ');
  if (testeMit(testPfade) !== 'gruen') {
    console.error('ROT. Erst die Tests grün bekommen, dann den Biss-Nachweis fahren.');
    process.exit(2);
  }
  console.log('grün ✓\n');

  for (const m of MUTATIONEN) {
    const quelle = readFileSync(m.datei, 'utf8');
    if (!quelle.includes(m.von)) {
      console.error(`✗ ÜBERHOLT: „${m.name}" — Fundstelle existiert nicht mehr in ${m.datei}`);
      entwischt.push(`${m.name} (Fundstelle veraltet)`);
      continue;
    }
    writeFileSync(m.datei, quelle.replace(m.von, m.nach), 'utf8');

    const ergebnis = testeMit(testPfade);
    zuruecksetzen();

    const gebissen = ergebnis === 'rot';
    protokoll.push({ name: m.name, gebissen });
    console.log(`${gebissen ? '✓ gebissen ' : '✗ ENTWISCHT'}  ${m.name}`);
    if (!gebissen) entwischt.push(m.name);
  }
} finally {
  zuruecksetzen();
}

console.log(`\n${protokoll.filter((p) => p.gebissen).length}/${MUTATIONEN.length} Mutationen gefangen.`);

if (entwischt.length > 0) {
  console.error('\nLücken im Netz — diese Mutationen blieben unbemerkt:');
  for (const n of entwischt) console.error(`  · ${n}`);
  process.exit(1);
}
console.log('Keine Lücke: jede Mutation wurde von mindestens einem Test gefangen.');
