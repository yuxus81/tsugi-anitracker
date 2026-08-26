# Tsugi Design-Lab — Übergabe

Vier vollständige, anklickbare Design-Entwürfe. Gleiche Daten, gleiche Bildschirme,
unterschieden wird nur das Design. `anitracker-v2` selbst ist unangetastet —
angefasst wurden ausschließlich dieser Ordner und ein Eintrag in `.claude/launch.json`.

## Starten

```bash
npx --yes serve -l 5799 anitracker-v2/design-lab
```

Dann `http://localhost:5799` öffnen. Kein Build, kein `npm install`, kein externer
Request: Schriften (`woff2`), Cover und Banner liegen lokal.

## Was drin ist

| | Idee | Dunkel-Art / Akzent | Bedienelemente | Icons | Schrift |
|---|---|---|---|---|---|
| **V1 „Regal"** | Das Archiv ist eine physische Sammlung | Espresso-Graphit, Messing | Druck = Element fährt runter | Kontur/Füllung-Paare, schwer | Bricolage Grotesque + Archivo |
| **V2 „Sendeplan"** | Anime wird gesendet, Zeit ist die Hauptachse | Tinte-Schwarz, ein Signal-Orange, Live-Rot | 2-px-Rahmen, Druck = Farbumkehr | geometrisch, kantig | Chivo + IBM Plex Sans/Mono |
| **V3 „Bühne"** | Das Artwork trägt alles | Graphit, Akzent **aus dem Cover** | weiche Pillen, viel Luft | Zweigewicht, groß | Instrument Serif + Instrument Sans |
| **V4 „Deck"** | つぎ = als Nächstes, die App ist ein Stapel | `#0d0f18` + Neon als **Kantenlicht** | Leuchtkante, Druck = Lichtblitz | „lit“: gefüllt mit heller Kontur | Space Grotesk + Outfit + JetBrains Mono |

Bildschirme je Version: **Start · Bibliothek · Entdecken · Detail · Statistik ·
Einstellungen · Suche**. Dazu in V1 zusätzlich **Bausteine** (die Seite wurde für
V2–V4 abbestellt).

## Was seit der ersten Runde anders ist

Das kam aus deinem Feedback zu V1 und steckt in V2, V3 und V4:

- **Das Cover ist der Eintrag.** Auf dem Laptop sind Cover jetzt 170–270 px breit
  statt 34–58 px. Die Watchlist ist ein Plakatraster, kein Zeilenverzeichnis.
- **Kein Etikett mit farbigem Balken mehr.** Statusmarken sind winzig: ein Punkt
  bzw. ein Quadrat plus Kürzel. Der ausgefüllte Strich links ist raus.
- **Jeder Status hat eine eigene Bauform**, nicht nur ein anderes Etikett:
  - V2: belegter Sendeplatz (rot, Pegel) · eingelegtes Band (Perforation) ·
    reservierter Programmplatz (gestrichelt, entsättigt, Datumsstempel) ·
    Archivband mit Nummer und Stanzhaken · Warteliste als Plakatraster.
  - V3: auf der Bühne (Schein in Coverfarbe) · hinter dem Vorhang (öffnet sich
    beim Zeigen) · im Dunkeln (Licht aus, Lichtstrahl, Datum) · abgespielt
    (Abspann + Siegel) · Foyer (Plakate).
  - V4: vorn und beleuchtet · geladen (leicht gedreht, „Einschalten“) ·
    verdeckt (Schleier + eingravierter Countdown) · gesiegelt · aufgefächert.
- **Wertung 1–10 ist raus** — überall.
- **Zeiger-Zustände auf PC/Mac**, jeder anders: Lichtwanderung, Abtastzeile,
  laufende Perforation, Aufdecken, Parallaxe im stehenden Rahmen, Vorhang,
  Kantenlicht, Zeilenversatz, Wisch-Streifen. Alles hinter
  `@media (hover: hover) and (pointer: fine)`, ohne `translateZ`.
- **Anime hinzufügen funktioniert wirklich**: Suche über 101 echte Titel,
  Franchise-Zeitstrahl mit Cover-Karten, beim Durchklicken stehen die Angaben
  **dieser Staffel** neben denen des **ganzen Franchise**, dazu Folgen-Stepper und
  das Abschneiden („Schere“) wie im echten `AddPanel`. Der Eintrag landet danach
  wirklich in der Bibliothek und taucht in Start, Bibliothek und Statistik auf.

## Aufbau

```
design-lab/
  index.html            Showroom mit Vorschau-Rahmen + Direktlinks
  shared/
    media.js            101 echte AniList-Datensätze (auto-generiert)
    mock.js             EIN Datensatz für alle vier Versionen + Logik
    router.js           Mini-Hash-Router
    dom.js              h()-Helfer, Neigung, Zähler
    reset.css           nur Reset, keine Farben
  assets/covers|banners|fonts|logo.png
  pruefung/
    messung.js          Messskript (zählt geprüfte Elemente mit)
    lauf.html           Messlauf über alle Versionen/Größen/Bildschirme
  v1-regal/ v2-sendeplan/ v3-buehne/ v4-deck/
      index.html · tokens.css · theme.css · app.js · icons.js
```

Die Entwürfe sind **Wegwerf-Code**: Vanilla, kein React, keine Tests. Der Gewinner
wird in der Code-Phase sauber nachgebaut — Vorlage sind dann `tokens.css` und die
Bausteine-Seite.

## Token-Zuordnung nach Tailwind

Jede `tokens.css` trägt die Zuordnung im Kopfkommentar. Kurzfassung:

### Gemeinsames Muster

| CSS-Variable | Tailwind |
|---|---|
| `--bg` | `theme.colors.bg` |
| `--surface` / `--card` / `--panel` | `theme.colors.surface` |
| `--raised` / `--card-2` / `--panel-2` | `theme.colors.raised` |
| `--ink` / `--ink-2` / `--ink-3` | `colors.ink` / `ink-dim` / `ink-mute` |
| `--line` | `colors.line` (Rahmenfarbe) |
| `--r-1 … --r-4` | `borderRadius.ctl / card / panel / sheet` |
| `--tap` | Mindesthöhe für alle Bedienelemente (44 px) |
| `--t-fast/mid/slow`, `--e-*` | `transitionDuration` / `transitionTimingFunction` |

### Je Version

- **V1:** `--brass-100…900` → `accent-hi / accent / accent-lo`, `--ox-500` → `danger`,
  `--jade-500` → `ok`, `--sh-1…3` → `boxShadow.rise1…3`.
- **V2:** `--sig-500` → `accent`, `--live` → `live`, `--cue` → `ok`, `--hold` → `muted`,
  `--bw` (2 px) → feste Rahmenstärke, `--grid*` → `colors.line`. Mono-Ziffern sind
  Pflicht: `fontFamily.mono` überall, wo gezählt wird.
- **V3:** `--c` bleibt **CSS-Variable** und gehört NICHT in die Theme-Datei — sie
  wechselt pro Titel (`bg-[color:var(--c)]`). `--c-soft/-glow/-text/-ink` sind
  daraus abgeleitet; `--c-text` ist die aufgehellte Fassung für Schrift.
- **V4:** `--cy/--pu/--pk` → `accent / purple / pink`, `--cy-text/--pu-text/--pk-text`
  für Schrift (die reinen Neonwerte reichen als Textfarbe nicht),
  `--edge-cy/pu/pk/off` → `boxShadow.edge*` (Kantenlicht statt Flächenglühen).

## Was bewusst nicht drin ist

- **Kein Glas, kein `backdrop-filter`** — deine Entscheidung vom 21.07.2026.
- **Keine Emojis, keine Unicode-Symbole** als Oberflächen-Zeichen; jedes Zeichen ist
  ein SVG-Pfad. Einzige Ausnahme: das Kana つぎ, das in jeder Version genau **einmal**
  als Strukturzeichen steht (V1 Gravur am Regalrücken, V2 Sendekennung neben der Uhr,
  V3 Signatur unter dem Namen, V4 über der nächsten Karte). Es kommt aus der
  Systemschrift, weil die geladenen Latin-Subsets kein Kana enthalten.
- **Kein `translateZ`, kein `will-change`** auf geneigten Flächen — genau daran hing
  die Unschärfe im Avathai-Projekt.
- **Keine Bewertung 1–10** mehr.
