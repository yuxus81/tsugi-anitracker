# V1 „Regal" — Übergabe in die Code-Phase

Damit beim späteren echten Umbau in React nichts neu erfunden werden muss.
Der Entwurf selbst ist Wegwerf-Code — **das hier nicht.**

## These

Dein Archiv ist eine physische Sammlung. Cover sind Objekte mit Dicke,
Bedienelemente sind Hardware aus Messing auf Espresso-Graphit.

Vier Bauregeln, an denen die Version hängt:

1. Jedes anfassbare Element hat eine **Lichtkante oben** und eine dunkle unten.
   Das allein macht den Unterschied zwischen „Fläche" und „Objekt".
2. **Druck heißt: das Element fährt runter**, sein Schatten fällt zusammen.
   Hover ist Zusatz, nicht Sprache — auf dem Handy gibt es ihn nicht.
3. **Aktiv/Inaktiv über die Icon-Form** (Kontur ↔ gefüllt), nicht nur über Farbe.
4. Roter Faden ist der **Regalrücken**: eine geriffelte Messingleiste, die
   Abschnitte, Karten und die Seitenschiene zusammenhält.

## Farbleiter → Tailwind

Zwei durchgestufte Leitern plus eine sehr kurze Status-Leiter. Bewusst keine
„drei zufälligen Töne", sondern gestufte Kontrastabstände.

| CSS-Variable | Wert | Tailwind-Schlüssel | Benutzt für |
|---|---|---|---|
| `--void` | `#080605` | `colors.void` | Nur Ränder und Rahmen |
| `--bg` | `#14100c` | `colors.bg` | Seitengrund |
| `--surface` | `#1c1611` | `colors.surface` | Karte, Panel, Liste |
| `--raised` | `#262019` | `colors.raised` | Gehobenes Element, Eingabefeld |
| `--raised-2` | `#33291f` | `colors['raised-2']` | Gedrückt/aktiv, Chip-Grund |
| `--raised-3` | `#43362a` | `colors['raised-3']` | Trennung in gehobenen Flächen |
| `--ink` | `#f6efe4` | `colors.ink` | Titel, Zahlen |
| `--ink-2` | `#cbbcab` | `colors['ink-dim']` | Fließtext, zweite Zeile |
| `--ink-3` | `#9b8b7c` | `colors['ink-mute']` | Beschriftungen, Einheiten |
| `--brass-100` | `#fbeec6` | `colors.accent[100]` | Oberer Verlaufsstopp |
| `--brass-300` | `#edcd85` | `colors.accent[300]` | Akzenttext auf Dunkel |
| `--brass-500` | `#cda14a` | `colors.accent[500]` | Primärfläche, Ring, Balken |
| `--brass-700` | `#8f6a25` | `colors.accent[700]` | Rand, Rille im Regalrücken |
| `--brass-900` | `#4b3712` | `colors.accent[900]` | Schattenkante, Schalterbahn |
| `--ox-500` | `#b04a42` | `colors.danger` | Fortsetzung folgt, Gefahrenzone |
| `--ox-300` | `#e08a80` | `colors['danger-hi']` | Gefahr-Text auf Dunkel |
| `--jade-500` | `#4f9a76` | `colors.ok` | „Noch zu schauen", Erfolg |
| `--jade-300` | `#8ed0ac` | `colors['ok-hi']` | Erfolgstext auf Dunkel |
| `--line` | `rgba(246,239,228,.10)` | `colors.line` | Normale Trennlinie |
| `--line-2` | `rgba(246,239,228,.18)` | `colors['line-2']` | Kante eines Objekts |
| `--edge-top` | `rgba(255,243,224,.13)` | — (in Schatten eingebaut) | Die Lichtkante oben |

**Nicht verhandelbar:** Auf einer Messingfläche ist der Text `#241a06`. Gegen den
dunkelsten Verlaufsstopp gemessen war `#20180a` auf `brass-700` bei 3,56:1 — durchgefallen.
Deshalb endet der Verlauf bei `brass-500`, nicht bei `brass-700`.

## Maße, Radien, Bewegung

| CSS-Variable | Wert | Tailwind-Schlüssel |
|---|---|---|
| `--r-1` | `6px` | `borderRadius.sm` |
| `--r-2` | `10px` | `borderRadius.DEFAULT` |
| `--r-3` | `14px` | `borderRadius.card` |
| `--r-4` | `20px` | `borderRadius.panel` |
| `--r-pill` | `999px` | `borderRadius.full` |
| `--tap` | `44px` | `spacing.tap` — **Mindesthöhe jedes Bedienelements** |
| `--rail` | `240px` | `spacing.rail` — Seitenschiene ab 1024 px |
| `--tabbar` | `62px` | `spacing.tabbar` |
| `--sh-1` | Lichtkante + 2/4 px | `boxShadow.rise1` |
| `--sh-2` | Lichtkante + 4/12 px | `boxShadow.rise2` |
| `--sh-3` | Lichtkante + 8/26 px | `boxShadow.rise3` |
| `--sh-in` | innen liegend | `boxShadow.pressed` |
| `--e-out` | `cubic-bezier(.2,.8,.3,1)` | `transitionTimingFunction.out` |
| `--e-spring` | `cubic-bezier(.22,1.2,.36,1)` | `transitionTimingFunction.spring` |
| `--t-fast` / `--t-mid` / `--t-slow` | 120 / 220 / 380 ms | `transitionDuration.*` |

Schrift: **Bricolage Grotesque** (`fontFamily.display`) für Titel,
**Archivo** (`fontFamily.sans`) für alles Bedienbare. Tabellarische Ziffern
(`.tnum`) überall dort, wo gezählt wird — sonst springt die Zahl beim Hochzählen.

## Fallen, die beim Nachbau wieder zuschnappen

- `overflow-x: hidden` auf `body` zerlegt jedes `position: sticky` darin. `overflow-x: clip`
  auf `html` nehmen.
- Eine `1fr`-Rasterspalte wächst über den Container hinaus. Immer `minmax(0, 1fr)`.
- Flex-Kinder schrumpfen nicht unter ihren Inhalt: `min-width: 0` gehört dazu,
  sonst schiebt eine lange E-Mail-Adresse die Seite breiter.
- `text-overflow: ellipsis` wirkt nur an einem Element mit `display: block`.
- Zugeklapptes Akkordeon braucht `visibility: hidden` — sonst bleibt sein Inhalt
  per Tabulator erreichbar und fängt Klicks ab.
- „Klein" heißt kleinerer Schriftgrad, nicht kleinere Trefferfläche. Die Höhe
  bleibt auf `--tap`; kleiner wirkt der Knopf über Innenabstand oder eine
  gezeichnete Innenscheibe (`::before`).
- Neigung ja, `translateZ` nein. Die Unschärfe im Avathai-Projekt kam von
  `translateZ` + `will-change`, nicht von der Neigung.

## Was aus dem echten Modell übernommen ist

`shared/mock.js` bildet `src/store/library.ts` 1:1 ab: ein Eintrag pro **Franchise**
mit `seasons[]`, `seasonIndex` und `progress`. Alle abgeleiteten Werte
(`watchedEpisodes`, `totalEpisodes`, `seasonPct`, `releaseLabel`) sind dieselben
Funktionen wie in der App — die Entwürfe zeigen deshalb keine Fantasiezahlen,
sondern das, was die App auch rechnen würde.
