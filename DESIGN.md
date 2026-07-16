# Design

## Theme

**„Archiv bei Nacht"** — eine dunkle, achromatische Wand, auf der Cover-Artwork wie beleuchtete Plakate hängt. Ein einziger Jade-Akzent (Fotolabor-Safelight, nicht Anime-Neon). Editoriale Serife für Seitentitel, präzise Sans für alles Funktionale.

## Color (OKLCH, dark-only)

| Token | Wert | Rolle |
|---|---|---|
| `--bg` | `oklch(0.115 0 0)` | Body-Hintergrund (reines Near-Black, Chroma 0) |
| `--surface` | `oklch(0.155 0 0)` | Karten, Panels |
| `--raised` | `oklch(0.20 0 0)` | Hover-Flächen, Inputs, Chips |
| `--line` | `oklch(0.27 0 0)` | Hairline-Borders |
| `--ink` | `oklch(0.93 0 0)` | Primärtext |
| `--ink-dim` | `oklch(0.70 0 0)` | Sekundärtext (≥4.5:1 auf bg & surface) |
| `--ink-faint` | `oklch(0.55 0 0)` | Meta/Disabled (nur große/fette Anwendung) |
| `--jade` | `oklch(0.72 0.17 155)` | Akzent: Aktionen, Selektion, Fortschritt |
| `--jade-deep` | `oklch(0.46 0.11 155)` | Akzent-Flächen (gefüllte Buttons, Track-Füllung) |
| `--jade-tint` | `oklch(0.72 0.17 155 / 0.12)` | Akzent-Hintergrund-Tint |
| `--amber` | `oklch(0.78 0.14 80)` | Pausiert / Warnung |
| `--rose` | `oklch(0.68 0.16 15)` | Abgebrochen / Fehler |
| `--blue` | `oklch(0.72 0.12 250)` | Geplant / Info |

Statusfarben erscheinen nur als kleine Punkte/Labels, nie als Flächen. Farbstrategie: Restrained — Akzentanteil ≤ 10 %, Emotion kommt aus dem Artwork.

## Typography

- **Display:** Fraunces Variable (opsz-Achse hoch) — nur Seitentitel, Hero, Zahlen auf der Stats-Seite. Nie in Buttons, Labels, Daten.
- **UI/Body:** Inter Variable — alles andere. Fixe rem-Skala, Ratio ~1.2: 12 / 13.5 / 15 (Body) / 18 / 22 / 28 / 40.
- `text-wrap: balance` auf h1–h3.

## Layout

- Desktop: schmale Icon+Label-Sidebar links (72→220 px), Content max 1200 px.
- Mobil (< 768 px): Bottom-Tab-Bar (5 Ziele), Content full-width mit 16 px Gutter.
- Poster-Ratio 2:3, Radius 12 px; Controls Radius 8 px.
- Detailseite: Banner-Artwork mit Verlaufsblende nach `--bg`, Inhalt überlappt den Banner.

## Motion

150–250 ms, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint). Motion nur für Zustand: View-Crossfade, Progress-Füllung, Skeleton-Shimmer, Toast-Slide. Keine Page-Load-Choreografie. `prefers-reduced-motion`: alles wird Crossfade/instant.

## Components

- **PosterCard**: Cover + Titel + Meta-Zeile; Fortschrittsleiste (jade) am unteren Cover-Rand bei getrackten Einträgen.
- **EpisodeStepper**: −/+ mit großer Zahl, optimistisches Update.
- **StatusMenu**: natives Popover-Pattern, ein Wortschatz überall.
- **Timeline** (Franchise): vertikale Leiste mit Knoten (TV/Film/Special typografisch unterschieden), „Du bist hier"-Marker.
- **Skeletons** statt Spinner; Empty-States erklären die nächste Aktion.
