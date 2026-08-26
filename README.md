# Tsugi-Anitracker (つぎ) — dein Anime-Archiv

**AniTracker Version 2**, seit August 2026 im Design **V5 „Gerät"**: Kopfleiste,
Tab-Leiste und Seitenschiene gehören zum Gehäuse und bewegen sich nie, darunter
läuft der Inhalt durch. Farbe bedeutet immer einen Status, nie Dekoration.
Gestaltungsregeln in [DESIGN.md](DESIGN.md), Produktrahmen in
[PRODUCT.md](PRODUCT.md).

## Was sie kann

- **Home** — „Weiter schauen" mit Pfeilen zum Durchblättern aller laufenden
  Serien, dazu die übrigen Kategorien und der Abschnitt *Als Nächstes im
  Simulcast* für alles Laufende im Archiv.
- **Franchise-Tracking** — EIN Bibliothekseintrag pro Franchise, nicht pro
  Staffel. Der Eintrag kennt die ganze Hauptlinie und einen Zeiger, bis wohin
  geschaut wurde. Letzte Folge einer Staffel → automatisch weiter zur nächsten.
- **Fünf Kategorien**: Weiter schauen · Noch zu schauen · Watchlist ·
  Fortsetzung folgt · Geschaut. Der Status wird **abgeleitet**, nicht von Hand
  gepflegt (`deriveStatus`).
- **Update-Scan bei jedem App-Start** — prüft die Bibliothek (allen voran
  „Fortsetzung folgt") in gebündelten Abfragen auf neue Staffeln. Erschienen →
  „Noch zu schauen" plus Meldung; nur angekündigt → „Fortsetzung folgt".
  Entscheidungslogik in `src/domain/scan.ts`, Netz in `src/lib/scan.ts`.
- **Aufnahme-Weg** — Kategorie wählen, dann „wie weit?" inklusive **Schere**:
  Staffeln abschneiden, die man nie sehen will. Ohne den Schnitt gälte so ein
  Franchise nie als fertig.
- **Bibliothek** — Geschaut (mit Rangliste und Greifpunkt zum Umsortieren),
  Fortsetzung folgt, Watchlist.
- **Detailseite** — Franchise-Zeitstrahl mit Geschaut-Häkchen, Fortschritt,
  Wertung 1–10.
- **Entdecken · Statistik · Suche** — Suche über `/` oder `⌘K`/`Strg+K`.
- **Konto & Sicherung** — Login, Registrierung, Passwort zurücksetzen und
  ändern; Supabase-Sync über Geräte hinweg, IndexedDB als Cache;
  JSON-Export/-Import, Archiv leeren, Profilname mit Änderungssperre.
- **Sprache** Deutsch/Englisch umschaltbar. Titel kommen von AniList als
  internationale Titel, optional von TMDB auf Deutsch überlagert.

## Architektur-Entscheidungen (und warum)

- **AniList GraphQL statt Jikan.** GraphQL bündelt eine ganze Ansicht in eine
  Abfrage — die App kann sich nicht mehr selbst per Anfragensturm lahmlegen.
  Die Bündelgröße steckt in `fetchRelationSlices` und nicht in den Aufrufern:
  AniList lehnt alles über 500 Komplexitätspunkten mit HTTP 400 ab, und eine
  Regel, die jeder Aufrufer selbst einhalten muss, hält irgendwann einer nicht
  ein.
- **Supabase ist die Quelle der Wahrheit**, IndexedDB der Cache fürs sofortige
  Zeichnen. Beide laufen beim Start gleichzeitig los; `remoteApplied` verhindert,
  dass der leere Cache eine bereits geladene Cloud-Bibliothek überschreibt.
- **Hauptlinien-Filter im Franchise-Läufer.** Nur TV/Film/ONA-Fortsetzungen
  zählen als nächste Staffel. Eine Brücken-OVA zwischen zwei echten Staffeln
  wird übersprungen, ohne selbst in der Liste zu landen.
- **`src/domain/` ist rein** — keine Netzzugriffe, kein Browser, kein Store.
  Dort liegen die Regeln, die sonst zwischen Netzcode versteckt wären.

## Entwickeln

```bash
npm install
npm run dev        # Dev-Server
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # Vitest (Unit, Komponenten, Integration)
npm run coverage   # dieselben Tests mit Abdeckungsbericht
npm run build      # Produktions-Build nach dist/ (inkl. Typecheck)
npm run verify     # typecheck + lint + test + build in einem Rutsch
```

Echter Browser (Playwright, braucht einmalig
`npx playwright install chromium-headless-shell`):

```bash
npx playwright test
```

`e2e/messung.spec.ts` prüft acht Größen — **mit kleinen Höhen** — auf
waagerechten Überlauf, verdeckte Bedienelemente, Touchziele mit benannter
Ausnahmeliste und Kontrast (axe), und meldet dabei, wie viele Elemente es
angefasst hat.

### Biss-Nachweis

Charakterisierungstests gegen bestehenden Code sind sofort grün und beweisen
damit nichts. `src/test/biss.mjs` verbiegt den Produktionscode Mutation für
Mutation und erwartet, dass die Tests jedes Mal rot werden:

```bash
node src/test/biss.mjs src/store/library.entry.test.ts src/domain/scan.test.ts
```

Die verbogenen Dateien werden aus einem Schnappschuss zurückgeschrieben, der
vor dem ersten Eingriff gezogen wurde (`src/test/dateiSchutz.mjs`) — ein
`git checkout --` an dieser Stelle hat zweimal nicht committete Arbeit
weggeworfen.

Deploy: `dist/` läuft dank `base: './'` und Hash-Routing auf jedem statischen
Host; `main` deployt automatisch auf GitHub Pages.

---

Erdacht, entworfen und gebaut von Claude ab Juli 2026. Hybrid-Umbau nach Yunus'
Rückmeldung am 16.07.2026, V5-Redesign im August 2026.
