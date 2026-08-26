# Design — V5 „Gerät"

> Stand: 26.08.2026. Dieses Dokument beschreibt die App, **wie sie tatsächlich
> gebaut ist**. Die vorige Fassung beschrieb das abgelöste Design (Fraunces,
> Aurora-Nebel, Tailwind-Utility-Klassen, `.press`, Genre-Partikel) — davon ist
> nichts mehr im Code. Wer sich daran orientiert, baut gegen die App.
>
> Der Vanilla-Entwurf, aus dem V5 stammt, liegt in `design-lab/v5-nativ/`.
> **Quelle der Wahrheit für Werte ist `src/styles/tokens.css`**, nicht diese
> Tabelle.

## These

**Die App ist ein Gerät, kein Dokument.**

Eine Website scrollt als Ganzes. Ein Gerät nicht: Kopfleiste, Tab-Leiste und
Seitenschiene gehören zum Gehäuse und bewegen sich nie, darunter läuft der
Inhalt durch. Alles Drückbare hat eine Oberkante aus Licht und fährt beim
Drücken nach unten; alles nur Lesbare bleibt flach. Das ist der Unterschied,
den man ohne Worte spürt.

## Die neun Regeln

1. **Rahmen statt Seite.** Nur `.pane` scrollt (`src/components/AppFrame.tsx`).
   Festgehalten von `e2e/rahmen.spec.ts` — und zwar mit einem Helfer, der
   abbricht, wenn es gar nichts zu scrollen gibt. Ohne den wären die Tests
   grün, sobald der Inhalt auf den Schirm passt.
2. **Icon-Paare.** Kontur = aus, gefüllt = an (`src/components/Icon.tsx`).
3. **Knöpfe mit Oberkante.** Lichtkante oben, Kontaktschatten unten, Feder
   beim Loslassen (`--e-spring`). Steht in `src/styles/controls.css`.
4. **Formwechsel statt nur Farbwechsel.** Ein aktiver Zustand ändert die
   Bauform (Kapsel wächst, Zeichen füllt sich), nicht bloß den Farbton.
5. **Fünf Kategorien, fünf Charaktere.** Jede muss im **Ruhezustand**
   erkennbar sein: Touch-Geräte haben kein Hover, dort ist der Ruhezustand der
   einzige Zustand.
6. **`data-st="…"` setzt die komplette Farbrolle** (`--tone`, `--tone-t`,
   `--tone-bg`, `--tone-on`, `--tone-glow`, siehe `src/styles/status.css`).
   Nichts wird von Hand gefärbt. Die JavaScript-Seite derselben Wahrheit ist
   `STATUS_THEME` in `src/domain/status.ts`; ein Test prüft, dass jeder
   `WatchStatus` dort einen Eintrag hat.
7. **Gold trägt nur die Wertung, Pink nur Gefahr und Löschen.**
8. **Kein `translateZ`, kein `will-change` auf geneigten Flächen** — das war
   die Unschärfe-Ursache im Avathai-Projekt.
9. **Farbe steht nie allein** — immer Name und Zahl daneben.

## Farbe

Die Farbwelt ist auf `logo.png` abgestimmt und bleibt gegenüber dem Vorgänger
unverändert. Neu ist nicht die Farbe, sondern ihre Verwendung: **Farbe bedeutet
immer einen Status, nie Dekoration.**

### Nachtblau-Leiter

| Token | Wert | Rolle |
|---|---|---|
| `--void` | `#06070d` | Bezel außerhalb der App-Fläche (nur Desktop) |
| `--bg` | `#0d0f18` | Grundfarbe; zugleich `theme-color` |
| `--s1` | `#141827` | Inhaltsfläche: Sektionen, Listen, Platte |
| `--s2` | `#1b2032` | Erhaben: Karten, Bedienelemente |
| `--s2h` | `#232941` | Oberkante von `--s2` (Licht kommt von oben) |
| `--s3` | `#262e48` | Gedrückt / schwebend |
| `--s4` | `#333d5e` | Starker Rand, deaktivierte Füllung |
| `--ink` / `--ink-2` / `--ink-3` | `#f1f3f9` / `#a8b3cb` / `#8a95af` | Tinte; `--ink-3` liegt bei 4,9:1 auf `--bg` (AA) |

### Fünf Bedeutungen, sonst nichts

| Token | Wert | Bedeutung |
|---|---|---|
| `--cy` | `#00f5d4` | Weiter schauen — läuft |
| `--bl` | `#3a86ff` | Noch zu schauen — geladen, bereit |
| `--pu` | `#8a2be2` | Watchlist — vorgemerkt |
| `--sl` | `#64789f` | Fortsetzung folgt — graublau wartend |
| `--gr` | `#2ecc71` | Geschaut — abgelegt, versiegelt |
| `--go` | `#ffcf4d` | **Wertung**, unabhängig vom Status |
| `--pk` | `#ff2d6f` | **Gefahr/Löschen**, kein Status mehr |

Jede Statusfarbe hat eine schrifttaugliche Aufhellung (`--cy-t` …) und eine
sehr dunkle Fläche (`--cy-bg` …), damit die Farbe Signal bleibt und nicht
Anstrich wird.

## Typografie

- **Inter Variable** durchgehend (`--font-ui`).
- **JetBrains Mono** (`--font-num`) für alles Gezählte: Folgen, Prozente,
  Jahre, der technische Grund auf dem Absturzbildschirm.
- Fraunces ist **raus** (Etappe 2). Eine Tailwind-Klasse `font-display` gibt es
  nicht mehr — sie färbte zuletzt nur noch nichts.
- Eingabefelder unter 768 px zwingend 16 px, sonst zoomt iOS beim Fokus hinein
  und nicht zuverlässig wieder heraus (`src/styles/base.css`). Genau deshalb
  braucht `index.html` **kein** `user-scalable=no` — das wäre ein
  Barrierefreiheits-Verstoß (WCAG 1.4.4).

## Bewegung

Drei Kurven, mehr braucht es nicht:

| Token | Wofür |
|---|---|
| `--e-out` | alles Alltägliche |
| `--e-spring` | das Zurückschnellen nach dem Druck — der Teil, der sich nach Gerät anfühlt |
| `--e-snap` | Formwechsel |

Dauern: `--t-tap` 120 ms · `--t-fast` 180 ms · `--t-mid` 280 ms · `--t-slow`
460 ms. Bewegung nur für Zustand, nie als Schmuck. `prefers-reduced-motion`
setzt jede Transition auf 0,01 ms (`src/index.css`).

## Layout und Rahmen

- Bis 900 px: feste Kopfleiste (`--topbar` 54 px) plus Tab-Leiste unten
  (`--tabbar` 60 px). Ab 900 px ersetzt die Seitenschiene (`--rail` 232 px) die
  Kopfleiste. Beides steht gleichzeitig im Baum, sichtbar ist immer nur eines.
- Inhaltsbreite `--wide` 1120 px, Innenabstand `--pad` 16 px.
- Poster-Verhältnis 2:3, **`aspect-ratio` gehört auf den Container, nie aufs
  `<img>`** — sonst laufen Box und Cover auseinander.
- Seitlich scrollende Leisten (`.shelf`, `.genrebar`) sind die einzigen Stellen,
  an denen etwas über den Rand laufen darf. `e2e/messung.spec.ts` hält das fest.

## Aufbau der Stilblätter

```
src/styles/
  tokens.css      Werte — die einzige Quelle
  base.css        Grundlagen, Auswahl, iOS-Feldgröße
  chrome.css      Kopfleiste, Tab-Leiste, Seitenschiene
  controls.css    Knöpfe, Schalter, Stepper, Pips, Ring
  status.css      data-st → --tone*
  cards.css       Eintrags- und Katalogkarten
  layout.css      Bühne, Regale, Rangliste, Hero
  pages.css       Detail, Statistik, Einstellungen, Tor, letzte Grenze
  overlays.css    Blatt, Dialog, Meldung, Befehlspalette
  app.css         Zusammensetzung
  responsive.css  was auf welcher Breite weicht
src/index.css     nur noch Grundgerüst + `.view-enter`
```

## Bauteile

- **`kit.tsx`** — Button, IconButton, Segmented, Ring, Bar, Stepper, Pips, Tag,
  SectionHead, EmptyState.
- **`overlays.tsx`** — Sheet, ConfirmDialog, StatusPicker, `useEscape`. Der
  Dialog rendert per Portal, sperrt den Hintergrund-Scroll und bringt
  Außenklick und Escape selbst mit; Aufrufer dürfen **keinen** eigenen
  Außenklick-Handler darüberlegen.
- **`EntryCard.tsx`** — die eigene Karte, fünf Charaktere.
- **`MediaTile.tsx`** — die Katalog-Karte: einheitliche Bewegung, kein Spoiler.
- **`AddSheet.tsx`** — Aufnahme-Weg: Kategorie → „wie weit?" inklusive Schere.
- **`ErrorBoundary.tsx`** — die letzte Grenze, auf derselben Platte wie das Tor.
- **Keine Emojis** in der Oberfläche, auch keine Unicode-Symbole, die iOS zur
  Farb-Emoji-Schrift hochziehen. Dekorative Formen sind SVG-Pfade
  (`src/components/iconPaths.ts`).

## Was bewusst nicht (mehr) da ist

| Weg | Warum |
|---|---|
| Glasflächen (`backdrop-filter`) | Wirkten vernebelt statt modern; seit `535da1c` verbindlich raus. |
| Aurora-Farbnebel hinter der App | Hinter einem Gerät liegt kein Wetter. |
| Genre-Bühne mit Partikeln auf Entdecken | Dieselbe Begründung; die Genre-Färbung macht jetzt die Chip-Leiste. |
| Fraunces (Display-Serife) | V5 nutzt Inter durchgehend, Mono für Gezähltes. |
| Tailwind `ring*` | Namenskollision mit `.ring` des Designsystems — es baute eine blaue Kiste um jeden Fortschrittsring. |
| Inhaltsangabe auf der Entdecken-Bühne | `description` steckt nur in der Detail-Abfrage; 90 Synopsen für eine Zeile zu laden lohnt nicht. Genres tragen die Fläche genauso. |

**Bewusst geblieben:** der Home-Abschnitt „Als Nächstes im Simulcast" (gegen
den Entwurf, auf Yunus' Entscheidung) in Graublau `--sl`, und die
Community-Wertung auf der Katalog-Karte — „Bestbewertet" ohne sichtbares
Kriterium wäre sinnlos.

## Gemessen, nicht behauptet

`e2e/messung.spec.ts` prüft auf acht Größen — **mit kleinen Höhen**, nicht nur
schmalen Breiten (320×640, 375×667, 375×812, 768×1024, 1280×720, 1280×800,
1440×760, 1920×1080) über sechs Ansichten:

- kein waagerechtes Scrollen, nichts ragt aus dem Schirm,
- `elementFromPoint` über jedes Bedienelement: es muss selbst obenauf liegen,
- Touchziele ≥ 44 px mit **benannter** Ausnahmeliste (Wertungs-Pips 30×44,
  Schalter 52×31, kleine Symbolknöpfe 40×40, Hero-Pfeile 28×28) — steht eine
  Ausnahme nicht auf der Liste, fällt der Test,
- Kontrast und Barrierefreiheit über `@axe-core/playwright`,
- **die Zahl der angefassten Elemente** (rund 135 je Größe). Ein Prüfwerkzeug,
  das zu wenig prüft, meldet sonst fröhlich „alles gut".
