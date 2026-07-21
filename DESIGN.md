# Design

> Stand: Juli 2026. Dieses Dokument beschreibt die App, **wie sie tatsächlich
> gebaut ist**. Eine frühere Fassung beschrieb eine achromatische Jade-Variante
> und verbot Neon ausdrücklich — die wurde nie umgesetzt: Am 16.07.2026 fiel
> bewusst die Entscheidung für den **Hybrid mit der V1-Farbwelt** (Yunus'
> Wunsch, inkl. V1-Logo). Wer sich an der alten Fassung orientiert, arbeitet
> gegen diese Entscheidung.

## Theme

**„Archiv bei Nacht"** — eine dunkle, tiefblaue Wand, auf der Cover-Artwork wie
beleuchtete Plakate hängt. Darüber ein sehr langsam driftender Farbnebel
(Aurora, `body::before`) in Neon-Türkis/Blau/Violett, der der Fläche Tiefe gibt,
ohne den Inhalt zu stören. Editoriale Serife für Seitentitel, präzise Sans für
alles Funktionale.

## Color (Hex, dark-only — Quelle: `tailwind.config.js`)

| Token | Wert | Rolle |
|---|---|---|
| `bg` | `#0d0f18` | Body-Hintergrund. Zugleich `theme-color` — färbt die Statusleiste, damit die App randlos wirkt. |
| `surface` | `#16192b` | Karten, Panels, Tab-Bar, Sheets |
| `raised` | `#1e2338` | Hover-Flächen, Inputs, Chips |
| `line` | `#262c47` | Hairline-Borders |
| `ink` | `#f1f3f9` | Primärtext |
| `ink-dim` | `#7e8da6` | Sekundärtext |
| `ink-muted` | `#95a1b8` | Inaktive Navigations-Labels (6,68:1 auf `surface`) |
| `ink-faint` | `#566078` | Meta/Disabled — **nur groß/fett**, reicht für Fließtext nicht |
| `accent` | `#00f5d4` | Akzent: Aktionen, Selektion, Fortschritt, „Weiter schauen" |
| `accent-deep` | `#0b6e63` | Akzent-Flächen |
| `purple` | `#8a2be2` | Watchlist |
| `pink` | `#ff0055` | Noch zu schauen |
| `blue` | `#3a86ff` | Fortsetzung folgt |
| `green` | `#2ecc71` | Abgeschlossen |
| `gold` | `#ffcf4d` | Geschaut-Rangliste, Wertungen |
| `amber` / `rose` | `#f5a524` / `#ff4757` | Warnung / Fehler & Löschen |

**Farbstrategie: Committed, nicht Restrained.** Jede Status-Welt hat ihre eigene
Signalfarbe und darf auf ihren Karten auch Fläche und Glow tragen — das ist der
Kern des Hybrid-Entscheids. Regel dabei: Farbe steht **nie allein**, immer mit
Label und/oder Zahl (Statuspunkte + Text, nicht Punkt allein).

## Oberflächen — kein Glas

Zwischen dem 20. und 21.07.2026 wurde ein iOS-„Liquid Glass"-Look eingeführt
(`backdrop-filter`-Flächen auf Chrome, Sheets, Chips) und nach Praxistest am
Handy **wieder vollständig entfernt** — er wirkte vernebelt statt modern und
traf Apples aktuelle Sprache nicht. Verbindlich seit Commit `535da1c`:

- **Kein `backdrop-filter` / kein `backdrop-blur` irgendwo.** Chrome (Header,
  Tab-Bar), Sheets, Dialoge und Popover sind solide Flächen aus `surface`/`bg`.
- Behalten wurde aus der iOS-Runde, was sich bewährt hat: großzügige Radien
  (card 16 / ctl 12 / pill 22 / sheet 28), das taktile `.press` (`scale .96`
  beim Antippen) und die gleitende Auswahl-Kapsel in der Tab-Bar.

## Typography

- **Display:** Fraunces Variable — nur Seitentitel, Hero, Zahlen auf der
  Stats-Seite. Nie in Buttons, Labels, Daten.
- **UI/Body:** Inter Variable — alles andere. Fixe Skala, Ratio ~1.2.
- `text-wrap: balance` auf h1–h3.
- Eingabefelder auf Mobil zwingend ≥ 16 px, sonst zoomt iOS beim Fokus rein.

## Layout

- Desktop: Icon+Label-Sidebar links (64 → 208 px), Content max 1200 px.
- Mobil (< 768 px): fixe Kopfleiste + schwebende Bottom-Tab-Bar (5 Ziele,
  70 px hoch, 2 px über der Safe-Area), Content full-width mit 16 px Gutter.
- Poster-Ratio 2:3. **`aspect-[2/3]` gehört auf den Container, nie aufs `<img>`** —
  sonst laufen Box und Cover auseinander, sobald das Bild anders lädt als erwartet.
- Detailseite: Banner-Artwork mit Verlaufsblende nach `bg`, Inhalt überlappt.
- Horizontal scrollende Chip-Reihen brauchen vertikales Polster (`py-3`):
  `overflow-x-auto` erzwingt laut Spec auch `overflow-y: auto` und kappt sonst
  den Glow der aktiven Chips.

## Motion

150–250 ms. Zwei Kurven: `cubic-bezier(0.22, 1, 0.36, 1)` fürs Allgemeine,
`cubic-bezier(0.32, 0.72, 0, 1)` für alles Taktile (Press, Tab-Kapsel).
Motion nur für Zustand. Der Seiten-Crossfade animiert **ausschließlich
`opacity`** — ein zusätzliches Transform auf dem ganzen Seitenbaum lässt den
Tab-Wechsel auf schwächeren Handy-GPUs sichtbar haken.
`prefers-reduced-motion`: alles wird Crossfade/instant.

## Components

- **PosterCard**: Cover + Titel + Meta-Zeile; Fortschrittsleiste am unteren
  Cover-Rand bei getrackten Einträgen. Bewusst **ohne** Blur-Effekte — hier
  liegen viele Karten gleichzeitig im Blick, das kostet auf Safari Frames.
- **EpisodeStepper**: −/+ mit direkt editierbarer Zahl, optimistisches Update.
- **ConfirmDialog**: rendert per Portal auf `<body>`, sperrt den
  Hintergrund-Scroll und bleibt während der Abgangs-Animation (160 ms) liegen —
  das fängt den Geister-Klick ab, den Touch-Geräte nachschicken. Er bringt
  Backdrop-Klick und Escape selbst mit; Aufrufer dürfen **keinen** eigenen
  Außenklick-Handler darüberlegen (der schlüge sonst bei jedem Tipp im Dialog zu).
- **ErrorBoundary**: umschließt die ganze App. Bietet „Neu laden" und
  „Lokalen Zwischenspeicher leeren" (löscht nur IndexedDB, nie die Cloud).
- **Skeletons** statt Spinner; Empty-States erklären die nächste Aktion.
- **Keine Emojis** in der Oberfläche — auch keine Unicode-Symbole, die iOS zur
  Farb-Emoji-Schrift hochzieht (♥, ☺ …). Dekorative Formen werden als
  SVG-Pfade gezeichnet (siehe Genre-Partikel in `DiscoverPage`).
