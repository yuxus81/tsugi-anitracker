# Messprotokoll — Tsugi Design-Entwürfe

Gemessen wird mit `shared/audit.js` direkt in der laufenden Seite, nicht behauptet.
Aufruf in der Konsole der jeweiligen Version:

```js
const a = await import('/shared/audit.js'); console.log(await a.auditAll(), a.auditContrast(), a.auditTilt());
```

**Was gezählt wird — und warum die Prüfanzahl mit dabeisteht:**
Ein Prüfwerkzeug, das zu wenig prüft, meldet auch „alles gut". Deshalb steht in jeder
Zeile, wie viele Bedienelemente wirklich angefasst wurden.

| Spalte | Bedeutung |
|---|---|
| **vorhanden** | Alle sichtbaren Bedienelemente über alle sieben Bildschirme (ausgeblendete zählen nicht mit) |
| **geprüft** | Davon per `elementFromPoint` auf ihrer Mitte tatsächlich angefasst |
| **getroffen** | Davon lieferte der Punkt genau dieses Element zurück |
| **taub** | Absichtlich nicht anfassbar: deaktiviert, ladend, zugeklapptes Akkordeon, Sprungmarke |
| **Überlauf** | Elemente, die seitlich aus dem Bild ragen, ohne in einem eigenen Scroller zu liegen |
| **zu klein** | Trefferfläche unter 44 px |
| **unter Leiste** | Element dauerhaft hinter der Tab-Leiste gefangen |
| **Kontrast** | Textknoten gegen den tatsächlich gerenderten Grund, WCAG AA; bei Verläufen gegen den **schlechtesten** Farbstopp |

Jedes Element wird einzeln in die Fenstermitte gescrollt und erst dann geprüft — sonst
fällt bei niedrigen Fenstern die Hälfte durchs Raster.

---

## V1 „Regal" — Stand 25.08.2026

Sieben Bildschirme je Durchgang: Start · Bibliothek · Entdecken · Detail · Statistik ·
Einstellungen · Bausteine. (Die Suche ist ein Overlay über jedem davon und wird beim
Öffnen mitgeprüft.)

| Fenster | gemessen als | vorhanden | geprüft | getroffen | taub | Überlauf | zu klein | unter Leiste | Kontrast geprüft | Kontrast durchgefallen |
|---|---|---|---|---|---|---|---|---|---|---|
| 375 × 812 | 375 × 812 | 250 | 235 | **235** | 15 | 0 | 0 | 0 | 532 | **0** |
| 390 × 844 | 390 × 844 | 250 | 235 | **235** | 15 | 0 | 0 | 0 | 532 | **0** |
| 390 × 700 (kleine Höhe) | 390 × 700 | 250 | 235 | **235** | 15 | 0 | 0 | 0 | 532 | **0** |
| 768 × 1024 | 753 × 1024 ¹ | 250 | 235 | **235** | 15 | 0 | 0 | 0 | 533 | **0** |
| 1280 × 800 | 1265 × 800 ¹ | 258 | 243 | **243** | 15 | 0 | 0 | 0 | 575 | **0** |
| 1440 × 900 | 1425 × 900 ¹ | 258 | 243 | **243** | 15 | 0 | 0 | 0 | 575 | **0** |

¹ Die Rollleiste frisst 15 px. Deshalb liegt 768 in der Messung bei 753 — also noch
unter der Laptop-Schwelle (1024 px), die Tab-Leiste bleibt dort korrekt unten.

**Zeiger-Effekte:** `auditTilt()` meldet in allen sechs Größen `risky: 0` — keine
`translateZ`-Verschiebung und kein `will-change` auf geneigten Flächen. Genau daran
lag die Unschärfe im Avathai-Projekt; die Neigung selbst war nie das Problem.

### Was die Messung gefunden hat (und was daraufhin geändert wurde)

Alles hier ist ein echter Fehler, den ein Blick auf den Bildschirm nicht gezeigt hätte:

1. **Die Seiten liefen im Quirks-Mode** — `<!doctype html>` fehlte. Nebenwirkung: die
   Messung selbst war wertlos, weil `documentElement.clientHeight` dort die
   Dokumenthöhe liefert statt der Fensterhöhe.
2. **Die Überlaufprüfung war blind.** `body { overflow-x: hidden }` machte formal jedes
   Element zu einem Kind eines Scrollers — damit meldete die Prüfung für immer null
   Überläufe. Erst nach der Korrektur kamen die echten Funde ans Licht.
3. **Die Kopfzeile klebte nicht.** Ursache war dasselbe `overflow-x: hidden` auf `body`:
   es macht `body` zum Scroll-Container und zerlegt jedes `position: sticky` darin.
   Jetzt `overflow-x: clip` auf `html` — schneidet ab, ohne einen Scroller zu erzeugen.
   Zweite Ursache: die Kopfzeile lag in einem Wrapper-Div, das ihr Bezugskasten war
   (`display: contents` behebt das).
4. **Die Bibliothek war auf einem 390-px-Handy 448 px breit.** Eine `1fr`-Rasterspalte
   darf über den Container hinauswachsen, wenn ein Kind eine große Mindestbreite hat
   (hier der Fünffach-Umschalter). Behoben mit `minmax(0, 1fr)` und `min-width: 0`.
5. **Der Greifpunkt der Rangliste war auf dem Handy unerreichbar** — er lag durch
   denselben Überlauf außerhalb des Bildes und wurde von `overflow: hidden` der Liste
   verschluckt.
6. **Die Ellipse bei langen Titeln hat nie funktioniert:** `overflow` greift an einem
   inline-Element nicht. `.row__t` / `.row__s` brauchen `display: block`.
7. **Eine lange E-Mail-Adresse schob die Einstellungen 10 px breiter** — Flex-Kinder
   haben `min-width: auto` und schrumpfen nicht unter ihren Inhalt.
8. **Der Hauptknopf lag bei 3,56:1** statt AA. Gemessen gegen den *dunkelsten*
   Verlaufsstopp (Messing-700), nicht gegen die schmeichelhafte Mitte. Der Verlauf
   endet jetzt bei Messing-500.
9. **Das zugeklappte Franchise-Akkordeon blieb per Tabulator erreichbar** und fing
   Klicks ab. `visibility: hidden` nach dem Zuklappen.
10. **Touchziele unter 44 px:** kleine Icon-Knöpfe (36), Umschalter-Segmente (38),
    Chips (34), Schalter (32). Alle auf 44 gebracht — sichtbar bleiben sie kleiner,
    die Trefferfläche liegt außen herum.

### Was die Messung NICHT beweist

- **Kein Screenshot.** Die Browser-Vorschau dieser Sitzung zeichnet nicht, deshalb
  gibt es Zahlen und DOM-Messungen, aber keine Bilder. Wie es *aussieht*, muss im
  eigenen Browser beurteilt werden — dafür ist der Showroom da.
- **Kein echtes Gerät.** Gemessen wurde in einem emulierten Fenster. Ein iPhone hat
  zusätzlich eine ausfahrende Adressleiste; deshalb steht überall `100dvh` statt
  `100vh` und die Tab-Leiste rechnet mit `env(safe-area-inset-bottom)`.
- **Kein Urteil über die Gestaltung.** Die Messung sagt „nichts ist kaputt", nicht
  „es ist gut".

---

## V5 „Gerät" — Stand 26.08.2026

Sieben Bildschirme je Durchgang: Home · Bibliothek · Entdecken · Detail · Statistik ·
Einstellungen · Bausteine. (Suche ist ein Overlay und wird beim Öffnen mitgeprüft.)

| Fenster | vorhanden | geprüft | getroffen | taub | Überlauf | zu klein | unter Leiste |
|---|---|---|---|---|---|---|---|
| 375 × 812 | 243 | 231 | **231** | 12 | 0 | 30 ¹ | 0 |
| 390 × 844 | 243 | 231 | **231** | 12 | 0 | 30 ¹ | 0 |
| 390 × 700 (kleine Höhe) | 243 | 231 | **231** | 12 | 0 | 30 ¹ | 0 |
| 768 × 1024 | 243 | 241 | **241** | 2 | 0 | 20 ¹ | 0 |
| 1280 × 800 | 252 | 250 | **250** | 2 | 0 | 20 ¹ | 0 |
| 1440 × 900 | 252 | 250 | **250** | 2 | 0 | 20 ¹ | 0 |

Kontrast: **152 Textknoten** je Durchgang geprüft, **1 Meldung** — und die ist ein
Messfehler des Werkzeugs, siehe Punkt 5 unten.
`auditTilt()`: `risky: 0` in allen sechs Größen — kein `translateZ`, kein `will-change`
auf geneigten Flächen.

¹ Die „zu klein"-Zahl ist hier bewusst nicht null. Sie besteht aus genau vier Bauteilen,
alle mit Begründung in `v5-nativ/UEBERGABE.md`: Wertungs-Pips (30 × 44 — zehn Stufen
können auf 375 px nicht 44 px breit sein), Schalter (52 × 31, sitzt in einer 56-px-Zeile,
die selbst der Knopf ist), kleine Symbolknöpfe (40) und die kleine Knopfvariante (40).
Alles andere liegt auf oder über 44 px.

### Was die Messung gefunden hat (und was daraufhin geändert wurde)

1. **Der Wiedergabeknopf auf „Weiter schauen"-Karten war auf dem Handy unsichtbar,
   aber klickbar.** Er lag mit `opacity: 0` über der unteren Ecke des Covers — ein Tipp
   dorthin hätte die nächste Episode abgehakt statt die Detailseite zu öffnen. Jetzt
   `pointer-events: none`, freigeschaltet erst in der Zeiger-Ebene.
2. **Die Statistik zeigte keine einzige Balkenfüllung.** `.bar__fill` war ein
   `<span>` ohne `display: block` — als Inline-Element ignoriert es jede Höhe. Auf dem
   Bildschirm sah man nur die graue Schiene und hätte es für Absicht halten können.
3. **Der Daumen der Auswahlleiste saß über die volle Breite.** Er wurde per
   `requestAnimationFrame` gemessen — und rAF läuft in einer nicht gezeichneten Vorschau
   nie. Jetzt rein gerechnet: gleich breite Segmente, `width: calc((100% - 8px) / n)`,
   `transform: translateX(calc(var(--i) * 100%))`. Sitzt ohne Messung sofort richtig.
4. **Der Purpur-Knopf lag bei 4,39:1** statt 4,5:1 — gemessen gegen den dunkelsten
   Verlaufsstopp. Schriftfarbe auf Fast-Schwarz gezogen: jetzt 4,8:1.
5. **Ein Fehlalarm, der stehen bleibt:** Die aktive Beschriftung der Auswahlleiste wird
   mit 1,07:1 gemeldet. Das Werkzeug sieht den gleitenden Daumen nicht, weil er ein
   Geschwister-Element ist, und misst gegen die dunkle Schiene dahinter. Gegen die
   tatsächliche Fläche gemessen: **11,75:1 bis 12,97:1** (nachgerechnet über die
   Verlaufsstopps des Daumens, dessen Rechteck die Beschriftung vollständig enthält).
6. **Farbfelder auf der Bausteine-Seite** hatten von Hand gewählte Schriftfarben —
   Weiß auf `--ink-3` ergab 2,7:1. Die Schriftfarbe wird jetzt aus der Leuchtdichte
   gerechnet.
7. **Auf dem Handy brach die Fortschrittszeile der Detailseite in vier Zeilen um**,
   weil der Stepper daneben stand. Jetzt Raster: Ring + Text oben, Stepper darunter über
   die volle Breite; ab 620 px wieder nebeneinander.
8. **Löschen lag als Symbolknopf in der Aktionsreihe** und rutschte auf dem Handy allein
   in eine zweite Zeile. Jetzt steht es unten auf der Detailseite als eigene Zeile — wie
   in nativen Apps.

### Was die Messung NICHT beweist

- **Kein echtes Gerät.** Emuliertes Fenster; ein iPhone hat zusätzlich eine ausfahrende
  Adressleiste. Deshalb `100dvh` und `env(safe-area-inset-bottom)`.
- **Kein Urteil über die Gestaltung.** Die Messung sagt „nichts ist kaputt", nicht
  „es ist gut". Screenshots dieser Runde stammen aus einem echten Browserfenster,
  nicht aus der eingebauten Vorschau — die zeichnet in dieser Sitzung nicht.

---

## V5 „Gerät" — Feedback-Runde 2, Stand 26.08.2026

Farben getauscht (Watchlist → Lila, Geschaut → Grün, Noch zu schauen → Blau), Layout-Änderungen
(Reihenfolge Bibliothek/Entdecken, Home-Wechsler, Simulcast raus, größere Geschaut-Cover,
gedämpftes statt ausgegrautes „Fortsetzung folgt", Spoiler-Marke im Katalog raus). Nachgemessen
mit `auditAll()`/`auditContrast()` — diesmal im echten (nicht eingebetteten) Chrome-Tab, weil die
eingebettete Vorschau bei mehr als ~30 zu prüfenden Bedienelementen wegen Hintergrund-Timer-
Drosselung selbst timeout-anfällig wird (kein App-Fehler, ein Werkzeug-Limit dieser Sitzung).

| Fenster | vorhanden | geprüft | getroffen | Überlauf | unter Leiste |
|---|---|---|---|---|---|
| 1920 × 855 (Laptop-Breakpoint aktiv) | 248 | 246 | **246** | 0 | 0 |
| 1920 × 855, nach Reload | 245 | 243 | **243** | 0 | 0 |

Kontrast: **553 Textknoten** über 7 Bildschirme geprüft.

### Was die Messung diesmal gefunden hat

Die Farbtauschen selbst waren die Fehlerquelle — nicht das Layout:

1. **`.tag--solid` („Watchlist" auf Lila) fiel auf 3,43:1.** Schwarzer Text, wie bei den anderen
   Kategorien üblich, versagt auf Lila: Selbst reines Schwarz erreicht auf `--pu` nur 3,52:1 — die
   Farbe ist zugleich sehr hell UND sehr dunkel gesättigt, sodass beide Extreme knapp scheitern.
   Nachgerechnet (nicht geraten): Weiß auf `--pu` (5,96:1) UND auf einer weniger blass
   aufgehellten Randfarbe `--pu-lit` (4,8:1, vorher #c39bff war zu hell für jede Textfarbe).
   `--tone-on` für Watchlist ist jetzt Weiß statt Fast-Schwarz.
2. **`.tag--solid` („Fortsetzung folgt" auf Graublau) fiel auf 4,34:1.** Das gewählte
   Fast-Schwarz-Blau (`#0a0e18`) war einen Hauch zu hell. Reines Schwarz trifft 4,73:1.
3. **Die Farbleiter-Kacheln auf der Bausteine-Seite** wählten ihre Schriftfarbe aus den
   Marken-Tönen (Anthrazit/Off-White) statt aus echtem Schwarz/Weiß — bei `--sl` (#64789f)
   reichte selbst der bessere Marken-Ton nur 4,3:1. Die Rechenfunktion `readableOn()` nimmt jetzt
   reines Schwarz/Weiß.

Alle drei sind jetzt **null**. Die einzigen verbleibenden Meldungen sind der bereits dokumentierte
Werkzeug-Blindspot (aktive Auswahlleisten-Beschriftung gegen den unsichtbaren Geschwister-
Daumen) — unverändert seit Runde 1, weiterhin manuell gegen die echten Verlaufsstopps
nachgerechnet statt dem Werkzeug blind geglaubt.

### Was die Messung NICHT beweist

Wie oben — zusätzlich diesmal: Die eingebettete Vorschau dieser Sitzung drosselt `setTimeout` in
Hintergrund-Tabs so stark, dass `auditScreen()` bei > 30 zu prüfenden Elementen den Werkzeug-eigenen
30-s-Zeitrahmen reißt, obwohl die Seite selbst korrekt rendert (per direkter DOM-Prüfung bestätigt).
Für Bildschirme mit vielen Bedienelementen (Entdecken: 70+) lief die Messung deshalb im echten,
vordergründigen Chrome-Tab — nicht in der eingebetteten Vorschau.
