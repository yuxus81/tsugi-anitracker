# V5 „Gerät" — Übergabe

Entwurf, kein Produkt. Vanilla HTML/CSS/JS, kein Build, kein React, keine Tests.
`anitracker-v2/src` wurde nicht angefasst.

Aufrufen: <http://localhost:5799/v5-nativ/> · Handy-Ansichten nebeneinander:
<http://localhost:5799/v5-nativ/handy.html>

---

## Was diese Runde ist — und was nicht

Keine fünfte Richtung. Das ist **die Überarbeitung der bestehenden App**:

- **Farbwelt bleibt.** `#0d0f18` plus Cyan/Purple/Pink ist auf `logo.png` abgestimmt und damit
  erledigt. Aus dem Logo gemessen sind die dominanten Töne `#104060` Tiefblau, `#302060` Indigo,
  `#401060` Violett, `#005060` Petrol und Weiß — genau die Achse, auf der die Leiter in
  `tokens.css` liegt.
- **Namen bleiben.** Home · Entdecken · Bibliothek · Statistik · Einstellungen, und die fünf
  Status: Weiter schauen · Noch zu schauen · Watchlist · Fortsetzung folgt · Geschaut. Nichts
  umbenannt, auch nicht „nur für den Entwurf".
- **Schrift bleibt.** Inter, wie in der echten App. Dazu JetBrains Mono für alles Gezählte.

Neu ist, **wie** das alles benutzt wird.

## Die fünf Hebel gegen den „Website"-Eindruck

1. **Rahmen statt Seite.** Kopfleiste und Tab-Leiste gehören zum Gerät und bewegen sich nie;
   gescrollt wird ausschließlich der Inhaltsbereich (`.pane`). Eine Website scrollt als Ganzes,
   eine App nicht. Ab 900 px wird aus der Tab-Leiste eine Seitenschiene.
2. **Icon-Paare.** Kontur = aus, gefüllt = an, mit kurzem Überschwingen beim Umschalten. Der
   gleichmäßige 1,8-px-Strich über alles war das deutlichste Boilerplate-Zeichen.
3. **Knöpfe mit Oberkante.** Jede drückbare Fläche hat eine Lichtkante oben, einen Kontaktschatten
   unten, fährt beim Drücken nach unten und schwingt beim Loslassen über
   (`--e-spring`). Das ist der Unterschied zwischen „Hover-Farbe" und „Knopf".
4. **Formwechsel statt nur Farbwechsel.** Der Daumen der segmentierten Auswahl gleitet und die
   Kapsel in der Tab-Leiste wächst beim Einrasten.
5. **Fünf Kategorien, fünf Charaktere** — siehe unten.

## Kategorie-Identität

Stand 26.08.2026, zweite Runde — Farben auf Yunus' Ansage geändert: Watchlist wird Lila (vorher
Pink), Geschaut wird Grün (vorher Gold). Gold ist dadurch frei geworden und trägt jetzt nur noch
die Wertung (Sterne-Pips) — unabhängig vom Status. Weil Watchlist Lila übernommen hat, bekam
„Noch zu schauen" eine neue Farbe: Blau, aus der Palette der echten App (`colors.blue`).

| Kategorie | Farbe | Zeichen | Ruhezustand | Bewegung am PC (Maus) |
|---|---|---|---|---|
| Weiter schauen | Cyan `--cy` | gefülltes Play | Fortschrittsbalken auf dem Cover | hebt an, Wiedergabeknopf kommt, Balken pulst |
| Noch zu schauen | Blau `--bl` | Pfeil in Ablage | blaue Marke oben rechts | fährt aus dem Schacht, Streulicht darunter |
| Watchlist | Lila `--pu` | Lesezeichen | Fahne am oberen Rand | Fahne rutscht heraus, Karte neigt sich 1,2° |
| Fortsetzung folgt | Graublau `--sl` | Uhr | Cover nur gedämpft (nicht komplett entsättigt) + Countdown, Zeiger tickt im Sekundentakt | Farbe kommt über 900 ms voll zurück |
| Geschaut | Grün `--gr` | Siegel | Siegel oben rechts, Cover fast unbehandelt (Sichtbarkeit hat Vorrang) | Folie läuft einmal durch, Siegel stempelt |

Dieselbe Farbe trägt zusätzlich: den Daumen der Auswahlleiste, die Seitenschiene, den Schimmer
am oberen Bildschirmrand, die Abschnitts-Fahne, die Balken in der Statistik und die Meldung.
Deshalb sieht man ohne Überschrift, in welcher Kategorie man ist.

**„Fortsetzung folgt" ist absichtlich nicht mehr komplett ausgegraut** (`grayscale(.4)
brightness(.8)` statt `.82`/`.62`): Touch-Geräte haben kein Hover, das die Farbe zurückholt — dort
ist der Ruhezustand der EINZIGE Zustand, den man je sieht. Ein Cover, das für immer grau bliebe,
wäre auf dem Handy ein Fehler, kein Stilmittel.

**Watchlist und Fortsetzung folgt stehen ab 900 px etwas größer** (`.grid--roomy`,
`minmax(148px,1fr)` statt `128px`) — auf Home (Watchlist-Panel) und in der Bibliothek (beide
Tabs). Eine Stufe, nicht mehr.

**Geschaut in der Bibliothek** ist weiterhin eine Rangliste (kein Poster-Raster, bewusst andere
Bauform als die übrigen Kategorien), aber mit deutlich größerem Cover (66×99 statt 42×59) — vorher
kaum zu erkennen.

Zeiger-Effekte liegen komplett hinter `@media (hover: hover) and (pointer: fine)` und benutzen
**kein** `translateZ` (das war die Unschärfe-Ursache im Avathai-Projekt, nicht die Neigung).

## Was echt funktioniert

Der Zustand lebt im Speicher — Neuladen setzt zurück. Das ist Absicht.

- **Suchen und hinzufügen** (`/` oder Lupe): tippen, Titel wählen, Kategorie wählen. Die App
  springt dorthin, wo der Eintrag jetzt liegt, und die Karte fliegt in der Bewegung ihrer
  Kategorie ein.
- **Episode +1 / −1**: Ring, Balken und Zahl laufen mit. Staffel zu Ende → der Eintrag wandert
  selbstständig nach „Noch zu schauen" bzw. „Geschaut".
- **Zwischen laufenden Serien wechseln**: Pfeile neben „Weiter schauen" auf Home blättern durch
  alle Einträge in „Weiter schauen" (nur sichtbar, wenn mehr als einer läuft).
- **Status wechseln**, **Wertung 1–10**, **Eintrag entfernen**, **Zufallsroller**,
  Panels, Tabs, Detailseite, Genre-Filter, Sprachumschalter, Meldungen.
- Nicht angeschlossen: echte Daten, Login, Sortieren per Greifpunkt, Sicherung.

## Entdecken: kein Spoiler, eine Bewegung

Zwei Korrekturen dieser Runde, beide auf `mediaCard()` (die Katalog-Karte in Entdecken, Suche,
Empfehlungen) beschränkt — `card()` (Home/Bibliothek, die eigenen Listen) ist unverändert:

- **Keine „Fortsetzung folgt"-Marke im Katalog.** Ein Titel wie „Frieren" unter „Bestbewertet"
  zeigte vorher offen, dass eine Fortsetzung angekündigt ist — ein Spoiler für einen Titel, um den
  es an der Stelle nicht geht. Die Info steht weiterhin im Franchise-Zeitstrahl der Detailseite,
  nur nicht mehr ungefragt auf der Karte.
- **Eine Bewegung für alle Karten** (`.card--uniform`): im Katalog hebt jede Karte beim Hovern
  gleich an, unabhängig vom Status. Die unterschiedlichen Bewegungen (Schacht, Fahne, Goldfolie …)
  sind den eigenen Listen vorbehalten — im Katalog wirkten sie unruhig, weil man dort viele Karten
  mit unterschiedlichem Status nebeneinander sieht.

## Entfernt

- **„Als Nächstes im Simulcast"** ist von Home runter — kam zu selten vor, um einen eigenen
  Abschnitt zu rechtfertigen. `.plan`/`.planrow` (CSS) und `countdownNode()` (JS) mit entfernt,
  beides hing nur daran.

## Dateien

```
v5-nativ/
  index.html    Einstieg
  handy.html    vier Bildschirme in echter Handy-Breite nebeneinander
  tokens.css    Farbleiter, Radien, Bewegungskurven — die Übergabe an Tailwind
  theme.css     Bausteine: Rahmen, Knöpfe, Karten, Kategorien, Ebenen
  icons.js      Zeichensatz als Paare (Kontur/gefüllt), alles SVG-Pfade
  app.js        Zustand + sieben Bildschirme
```

## Zuordnung nach Tailwind (für die spätere Code-Phase)

| CSS-Variable | Tailwind |
|---|---|
| `--bg` | `colors.bg` (`#0d0f18`, unverändert) |
| `--s1` `--s2` `--s3` `--s4` | `colors.surface` / `colors.raised` / neu / neu |
| `--ink` `--ink-2` `--ink-3` | `colors.ink` / `ink-dim` / `ink-muted` |
| `--cy` `--bl` `--pu` `--gr` | `colors.accent` / `blue` / `purple` / `green` |
| `--go` | `colors.gold` — nur noch Wertung (Sterne-Pips), kein Status mehr |
| `--pk` | nur noch Gefahr/Löschen, kein Status mehr |
| `--sl` | **neu** — „wartend", trägt „Fortsetzung folgt" |
| `--lip` `--sh-1…3` | `boxShadow.*` (Lichtkante + gestufte Tiefe) |
| `--r-1…5` | `borderRadius.ctl/card/pill/sheet` |
| `--e-out` `--e-spring` `--e-snap` | `transitionTimingFunction` |

Neu gegenüber der aktuellen `tailwind.config.js`: die Stufen `--s3/--s4`, die Farbe `--sl`,
die Feder-Kurve und `--knock` (die Farbe, in der gefüllte Zeichen ihre Innenzeichnung ausstanzen —
auf farbigen Flächen muss sie die Fläche treffen, sonst klebt ein dunkler Fleck im Symbol).

## Bekannte Grenzen

- **Wertungs-Pips sind 30 px breit** (44 px hoch). Zehn Stufen nebeneinander können auf 375 px
  nicht 44 px breit sein — das wären 440 px. Die Höhe trägt den Daumen, und daneben liegt immer
  der Nachbarwert, nie Leerraum.
- **Schalter (52 × 31) und kleine Symbolknöpfe (40 px)** liegen unter 44 px, sitzen aber jeweils
  in einer Zeile, die selbst der Knopf ist.
- **Die Pfeile neben „Weiter schauen" sind bewusst 28 px**, nicht 44. Sie sind ein Zusatzregler wie
  ein Karussell-Pfeil, keine primäre Aktion — bei zwei 40-px-Zielen direkt neben dem Kategorie-
  Namen brach die Zeile auf dem Handy um.
- Der Kontrast-Prüfer meldet die **aktive** Beschriftung der Auswahlleiste mit 1,07:1. Das ist
  ein Messfehler des Werkzeugs: es sieht den Daumen nicht, weil der ein Geschwister-Element ist.
  Gemessen gegen die tatsächliche Fläche (weiß auf Lila `#9e3fec`, schwarz auf Graublau) sind es
  **4,8–12,97:1** — für Lila galt hier die Ausnahme: Schrift hell statt dunkel, weil Schwarz auf
  dem gesättigten `--pu` selbst nur 3,5:1 erreicht.
