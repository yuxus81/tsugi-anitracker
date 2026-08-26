# Übergabe für Etappe 4 — Tsugi V5-Redesign

> Temporäre Arbeitsdatei, bewusst **nicht** committet. Nach Etappe 4 löschen.
> Stand: 26.08.2026, Commit `65402b9` auf Branch `redesign/v5-nativ`.

---

## Was das Projekt ist

Die App `anitracker-v2` (Tsugi-Anitracker) bekommt das Design **V5 „Gerät"**,
das in `design-lab/v5-nativ/` als Vanilla-Entwurf liegt. Der Entwurf ist die
Quelle für Aussehen und Verhalten; `design-lab/v5-nativ/UEBERGABE.md` erklärt
die Gestaltungsregeln.

**Vier Etappen, drei sind fertig.** Der genehmigte Plan liegt in
`C:\Users\yunus\.claude\plans\lovely-moseying-babbage.md`.

| Etappe | Inhalt | Stand |
|---|---|---|
| 1 | Testnetz (Vitest, Playwright, ESLint) + Biss-Nachweis | ✅ `d62cd94` |
| 2 | Tokens, Icon-Paare, Gerät-Rahmen, Home | ✅ `ecf39a6` |
| 3 | Bibliothek, Entdecken, Detail, Statistik, Einstellungen, Suche, AuthScreen | ✅ `65402b9` |
| 4 | Beweisen und aufräumen | **offen** |

## Arbeitsweise, die Yunus festgelegt hat

- **Test-Driven Development ist die wichtigste Vorgabe.** Erst Test, rot sehen,
  dann implementieren. Zusätzliche Tests danach sind erlaubt.
- Bestandslogik wird über **Charakterisierungstests + Biss-Nachweis**
  abgesichert (Tests gegen bestehenden Code sind sofort grün und beweisen
  nichts — deshalb die Mutationsprobe).
- **Keine Funktion aus dem Original darf wegfallen.**
- Code soll fehlerfrei, lesbar, effizient sein, damit später wenig zu
  debuggen ist.
- Ton: extrem ehrlich, sachlich, kein Motivations-Theater. Befunde in
  Klartext, nach Entscheidungsrelevanz sortiert, und immer ungefragt
  mitbeantworten: „was passiert, wenn ich es lasse?"

---

## Stand jetzt: alles grün

```bash
npm run typecheck && npm run lint && npm test && npm run build
npx playwright test
node src/test/biss.mjs src/store/library.entry.test.ts src/store/library.store.test.ts src/store/library.hydrate.test.ts src/domain/progress.test.ts src/domain/status.test.ts src/api/helpers.test.ts src/components/franchise.test.ts
```

- **405 Tests** in 24 Dateien (Unit / Komponenten / Integration)
- **39 Playwright-Tests** (`rahmen`, `designsystem`, `bibliothek`, `bilder`)
- **Biss-Nachweis 26/26** Mutationen gefangen
- Abdeckung: `src/domain` **100 / 97 / 100 / 100** (Schwelle 95/90/95/95 ✅)

Belegbilder entstehen mit `npx playwright test e2e/bilder.spec.ts` in
`e2e/bilder/` (gitignored), sechs Größen × neun Ansichten.

---

## ⚠️ Zwei Fallen, die schon zugeschnappt sind

### 1. Das Mutationswerkzeug hat unversionierte Arbeit gefressen

`src/test/biss.mjs` stellte die verbogenen Dateien früher mit
`git checkout -- <datei>` wieder her. Das stellt **nicht** den Stand von
vorher her, sondern den zuletzt eingecheckten — und warf damit jede noch
nicht committete Änderung weg. **Zweimal** ist so eine fertige Behebung in
`store/library.ts` spurlos verschwunden, ohne Fehlermeldung.

Behoben: `src/test/dateiSchutz.mjs` zieht einen Schnappschuss vor dem ersten
Eingriff und schreibt daraus zurück. Eigene Tests in `dateiSchutz.test.ts`.

**Lehre für Etappe 4:** Wenn eine Änderung „verschwindet", ist das kein
Gespenst. Nach jedem Werkzeuglauf prüfen, ob sie noch da ist.

### 2. Eine Attrappe, die nicht antwortet was gefragt wurde, ist eine Falle

Die AniList-Attrappe in `e2e/fixtures.ts` gab zuerst `{ data: {} }` zurück,
später für jede Id denselben Titel. Folge: Entdecken stürzte ab, und der
Startup-Scan lief endlos im Kreis. **Detail und Entdecken waren im echten
Browser vorher nie geprüft worden** — es fiel erst auf, als ein Screenshot
davon gebraucht wurde. Die Attrappe antwortet jetzt je Alias mit der
angefragten Id; die Kette endet bei 1 → 2 → 3.

---

## Was in Etappe 4 noch zu tun ist

### A. Tote Reste des alten Designs

- **`src/index.css`, Zeilen ~147–447** (`@layer components`): fast alles ist
  altes Design. Noch benutzt wird nur `.view-enter` (in `App.tsx`).
  Tote Klassen: `.press`, `.skeleton`, `.toast-in`, `.unfold`, `.stagger-in`,
  `.scrim-in/out`, `.sheet-in/out`, `.pop-in`, `.panel-in`, `.pulse-play`,
  `.blink-dot`, `.desat-hover`, `.row-hover`, `.genre-particle`,
  `.no-focus-ring`.
  **Vor dem Löschen jede einzeln greppen** — nicht pauschal.
- **`src/components/ErrorBoundary.tsx`** ist noch komplett altes Design und
  benutzt `font-display` — eine Tailwind-Klasse, die es seit Etappe 2 nicht
  mehr gibt (Fraunces ist raus). Muss nach V5 portiert werden.
  Abdeckung dort: **0 %**.

### B. Fehlende Tests

- **`src/lib/scan.ts` hat 0 % Abdeckung.** Der Startup-Scan (neue Staffel
  erschienen / Fortsetzung angekündigt) ist eine echte Funktion ohne einen
  einzigen Test. `src/domain/scan.ts` aus dem Plan wurde **nie
  herausgeschält** — die Entscheidungslogik steckt weiter zwischen Netzcode.
- `store/auth.ts` 23 %, `lib/supabase.ts` 39 % — beides Netzgrenzen,
  bewusst niedrig, aber der Blick lohnt.
- **E2E-Pfade fehlen:** Suche → Hinzufügen → Kategorie → Eintrag taucht auf,
  Episode +1 → Staffel fertig → Eintrag wandert, Sprachwechsel,
  Export/Import.

### C. Messtests (`e2e/messung.spec.ts` — existiert noch nicht)

Aus dem Plan, wörtlich:

- Sieben Breiten **und kleine Höhen** (375×667, 375×812, 768×1024, 1280×720,
  1280×800, 1440×760, 1920×1080). Kleine Höhe ist Pflicht, nicht Kür.
- Kein waagerechtes Scrollen, nirgends.
- `elementFromPoint` über **jedes** Bedienelement: es muss selbst obenauf
  liegen, nichts darf verdeckt sein.
- Touchziele ≥ 44 px, mit **benannter Ausnahmeliste**: Wertungs-Pips 30 px
  breit (44 hoch), Schalter 52×31, kleine Symbolknöpfe 40 px, Hero-Pfeile
  28 px. Steht eine Ausnahme nicht auf der Liste → Test rot.
- Kontrast über `@axe-core/playwright`.
- **Der Test meldet, wie viele Elemente er angefasst hat.** Ein Prüfwerkzeug,
  das zu wenig prüft, meldet sonst fröhlich „alles gut".

Vorlage dafür: `e2e/bibliothek.spec.ts` macht das bereits für die
Auswahlleiste (fünf Breiten, Elementzahl wird ausgegeben).

### D. Dokumentation

`DESIGN.md`, `README.md`, `PRODUCT.md` beschreiben noch das alte Design.

### E. Funktionsliste abhaken

Die Liste „Was nicht wegfallen darf" aus dem Plan Zeile für Zeile gegen die
laufende App prüfen.

---

## Entscheidungen, die getroffen wurden (alle rückholbar)

| Entscheidung | Warum | Wann |
|---|---|---|
| **Genre-Bühne entfernt** (bildschirmfüllendes Farbbad + Partikel hinter Entdecken) | Gehörte zur alten Bildsprache; hinter einem Gerät liegt kein Wetter. Genre-Färbung macht jetzt die Chip-Leiste. | Etappe 3 |
| **Simulcast behalten** | Yunus' ausdrückliche Entscheidung, gegen den Entwurf. Liegt auf Home in Graublau `--sl`. | Etappe 2 |
| **`stWatching` heißt überall „Weiter schauen"** | Vorher zwei Namen für dieselbe Kategorie. | Etappe 2 |
| **Fraunces raus, JetBrains Mono rein** | V5 nutzt Inter durchgehend, Mono für Gezähltes. | Etappe 2 |
| **Community-Wertung bleibt auf der Katalog-Karte** (Entwurf hatte sie nicht) | Gold = Wertung, und „Bestbewertet" ohne sichtbares Kriterium ist sinnlos. | Etappe 3 |
| **Keine Inhaltsangabe auf der Entdecken-Bühne** | `description` steckt nur in der Detail-Abfrage — 90 Synopsen für eine Zeile laden oder eine zweite Abfrage schicken. Genres tragen die Fläche genauso. | Etappe 3 |
| **Tailwind `ring*` abgeschaltet** | Namenskollision mit `.ring` des Designsystems (blaue Kiste um jeden Fortschrittsring). | Etappe 2 |

---

## Fehler, die unterwegs gefunden und behoben wurden

**Echte Produktionsfehler (waren vorher schon da):**

1. **Wettlauf beim Start.** `hydrate()` (IndexedDB) und `syncFromRemote()`
   (Cloud) laufen gleichzeitig. Kam die Cloud zuerst, überschrieb der leere
   Cache die geladene Bibliothek → leeres Archiv auf neuem Gerät bis zum
   Neuladen. Gelöst über `remoteApplied`. **Dieser Fix war in Etappe 2
   fälschlich als erledigt gemeldet worden** — er lag nie im Produktionscode.
2. **Tailwind-Namenskollision `.ring`.**
3. **`--knock` stanzte in der falschen Farbe** (Würfelaugen zu dunkel).
4. **Leere Kategorie unerreichbar** — Bibliothek schnappte beim Antippen zurück.
5. **Escape schloss die Suche nur bei Fokus darin.**
6. **„1 Staffeln" / „1 Episoden"** in der Rangliste.
7. **Wertung trug Kategoriefarbe statt Gold** — las sich wie ein Status.
8. **Status-Marke lief unter die Wertungs-Marke** auf Katalog-Karten.
9. **Sprachumschalter setzte `data-st="de"`** — eine Farbrolle, die es nicht gibt.

**Fehler in den eigenen Messwerkzeugen (die gefährlicheren):**

- Rahmen-Tests waren beim ersten Anlauf **wertlos**: zu wenig Testdaten, die
  Seite passte auf den Schirm, `scrollTop` blieb 0, die Leisten standen
  trivialerweise still. Sieben grüne Tests, die nichts gemessen haben.
  `scrollePane()` bricht jetzt ab, wenn es nichts zu scrollen gibt.
- Der Biss-Nachweis fraß unversionierte Arbeit (siehe oben).
- Die AniList-Attrappe (siehe oben).

**Ein Beinahe-Fehler:** Auf dem Handy-Screenshot fehlten die Zähler auf den
Kategorie-Tabs. Sah nach Bug aus — gemessen war es eine bewusste Entscheidung
aus Etappe 2: unter 480 px weichen die Zähler, unter 420 px die Zeichen,
**der Name weicht nie**. Steht in `src/styles/responsive.css` und wird jetzt
von `e2e/bibliothek.spec.ts` über fünf Breiten festgehalten.
**Lehre: erst messen, dann „reparieren".**

---

## Aufbau des Codes

```
src/
  domain/          rein, ohne Netz, ohne Browser — 100 % abgedeckt
    entry.ts?      (existiert NICHT — Logik liegt weiter in store/library.ts)
    progress.ts    seasonPct, seasonNo, seasonProgressLabel, countdownParts
    status.ts      STATUS_THEME: Farbe, Icon, Bauform je Status — EINE Quelle
    franchise.ts   buildFranchiseSeasons (lag früher in AddPanel.tsx)
  store/
    library.ts     849+ Zeilen: Domänenlogik + Persistenz + Meldungen
    auth.ts, titles.ts, toast.ts
  components/
    AppFrame.tsx   der Gerät-Rahmen (Kopfleiste, Tab-Leiste, Schiene, .pane)
    kit.tsx        Button, IconButton, Segmented, Ring, Bar, Stepper, Pips,
                   Tag, SectionHead, EmptyState
    overlays.tsx   Sheet, ConfirmDialog, StatusPicker, useEscape
    AddSheet.tsx   Aufnahme-Weg: Kategorie → „wie weit?" inkl. SCHERE
    EntryCard.tsx  eigene Karte, fünf Charaktere
    MediaTile.tsx  Katalog-Karte, einheitliche Bewegung, kein Spoiler
    SearchOverlay.tsx, AuthScreen.tsx, Icon.tsx, iconPaths.ts
    ErrorBoundary.tsx  ← noch ALTES DESIGN
  styles/          tokens, base, chrome, controls, status, cards, layout,
                   pages, overlays, app, responsive
  lib/
    scan.ts        ← 0 % Abdeckung
    useRoller.ts   Zufallsroller, von Home und Bibliothek geteilt
    db.ts, env.ts, supabase.ts
  test/
    biss.mjs       Mutationsprobe, 26 Mutationen
    dateiSchutz.mjs  Schnappschuss-Schutz dafür
    factories.ts   Testdaten-Werkstatt
e2e/
  fixtures.ts      gefälscht nur an den AUSSENGRENZEN (Speicher + HTTP)
  rahmen.spec.ts, designsystem.spec.ts, bibliothek.spec.ts, bilder.spec.ts
```

### Gelöscht in Etappe 3 (altes Design)

`AddPanel.tsx`, `PosterCard.tsx`, `TrackControls.tsx`, `ui.tsx`,
`icons.tsx`, `useMediaQuery.ts` (+ Test).

---

## Gestaltungsregeln, die beim Weiterbauen gelten

1. **Rahmen statt Seite.** Nur `.pane` scrollt. Kopf- und Tab-Leiste gehören
   zum Gerät und bewegen sich nie.
2. **Icon-Paare.** Kontur = aus, gefüllt = an.
3. **Knöpfe mit Oberkante.** Lichtkante oben, Kontaktschatten unten, Feder
   beim Loslassen (`--e-spring`).
4. **Formwechsel statt nur Farbwechsel.**
5. **Fünf Kategorien, fünf Charaktere** — jede muss im **Ruhezustand**
   erkennbar sein. Touch-Geräte haben kein Hover; dort ist der Ruhezustand
   der einzige Zustand.
6. `data-st="..."` setzt die komplette Farbrolle (`--tone`, `--tone-t`,
   `--tone-bg`, `--tone-on`, `--tone-glow`). Nichts von Hand färben.
7. **Gold trägt nur die Wertung**, Pink nur Gefahr/Löschen.
8. **Kein `translateZ`, kein `will-change`** auf geneigten Flächen (das war
   die Unschärfe-Ursache im Avathai-Projekt).
9. Farbe steht nie allein — immer Name und Zahl daneben.

## Fallen der Umgebung

- **Windows/CRLF:** Suchstrings in `biss.mjs` dürfen kein `\n` enthalten.
- **PowerShell:** nie `Get-Content`/`Set-Content` auf Quelldateien — das
  zerschießt Umlaute. Das `Edit`-Werkzeug nehmen.
- **Kein Python** auf dem Rechner.
- `tsc -b` läuft mit `noEmit` ins Leere → `tsc --noEmit` benutzen.
- Zeitzone im Test ist absichtlich feindlich: `TZ=America/Los_Angeles`
  in `vitest.config.ts`.
- Playwright braucht `npx playwright install chromium-headless-shell`.

---

## Nächster Schritt

Etappe 4 beginnen, in dieser Reihenfolge:

1. `src/domain/scan.ts` herausschälen + Tests (die größte echte Lücke).
2. `ErrorBoundary.tsx` nach V5 portieren.
3. `e2e/messung.spec.ts` bauen (Breiten, Höhen, `elementFromPoint`,
   Touchziele mit Ausnahmeliste, axe, Elementzahl melden).
4. E2E-Pfade fürs Hinzufügen/Fortschritt/Sprache/Sicherung.
5. Tote CSS-Klassen aus `index.css` entfernen (jede einzeln prüfen).
6. `DESIGN.md` / `README.md` / `PRODUCT.md` nachziehen.
7. Funktionsliste Punkt für Punkt abhaken.

**`main` deployt automatisch auf GitHub Pages.** Merge erst auf Yunus'
ausdrückliche Ansage. Bisher wurde nichts gepusht und nichts deployt.
