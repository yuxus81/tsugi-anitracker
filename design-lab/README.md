# design-lab — Design-Entwürfe für Tsugi

Wegwerf-Code mit Absicht: Vanilla HTML/CSS/JS, kein Build, kein React, keine Tests.
So entsteht Gestaltungsfreiheit ohne Risiko für die eingefrorene App.
**`anitracker-v2/src` wird von hier aus nicht angefasst.**

## Starten

```bash
npx --yes serve -l 5799 "anitracker-v2/design-lab"
```

Oder über den Eintrag `tsugi-design` in `.claude/launch.json`.
Danach: <http://localhost:5799>

Alles läuft offline — Cover, Banner und Schriften liegen lokal, es gibt keinen
einzigen externen Request.

## Aufbau

```
design-lab/
  index.html          Showroom: Versionen nebeneinander, These + Direktlink,
                      Vorschau-Rahmen Handy/Tablet/Laptop
  MESSPROTOKOLL.md    Was gemessen wurde, mit Prüfanzahl — keine Zusicherungen
  shared/
    media.js          AUTO-GENERIERT aus AniList (101 Titel) — nicht von Hand pflegen
    mock.js           EIN Datensatz für alle Versionen, Modell aus src/store/library.ts
    router.js         Mini-Hash-Router + Bildschirm-Registry
    dom.js            h()-Helfer, Neigung, Zähl-Animation
    reset.css         nur Reset, keine Farben, keine Typo
    audit.js          Messwerkzeug (Trefferprüfung, Überlauf, Kontrast, Neigung)
  assets/covers/      101 Cover · assets/banners/ 88 Banner · assets/fonts/ 85 woff2-Schnitte
  assets/logo.png     Kopie des bestehenden Logos, unverändert
  v5-nativ/           AKTUELLE RUNDE: Überarbeitung der bestehenden App
                      index.html · handy.html · tokens.css · theme.css · icons.js · app.js · UEBERGABE.md
  v1-regal/           tokens.css · theme.css · icons.js · app.js · UEBERGABE.md
  v2-sendeplan/  v3-buehne/  v4-deck/     Vergleichsrichtungen aus Runde 1
  _quelle/            AniList-Rohdaten + die vier Skripte, die assets/ und
                      shared/media.js erzeugt haben (einmalig, brauchen Netz)
```

## Bildschirme je Version

`#/home` · `#/bibliothek` · `#/entdecken` · `#/detail` · `#/statistik` ·
`#/einstellungen` · `#/suche` (Overlay) · `#/bausteine`

**`#/bausteine` ist die wichtigste Seite:** dort steht jeder Knopf in jedem
Zustand nebeneinander — ruhend, gedrückt, aktiv, deaktiviert, ladend — dazu der
komplette Icon-Satz in Originalgröße mit Aktiv/Inaktiv-Paar, Chips, Tabs,
Listenzeilen, Dialog, Hinweis, Leerzustand, Skelett und die Farbleiter.

## V5 „Gerät" — die aktuelle Runde

Keine fünfte Richtung, sondern die **Überarbeitung der bestehenden App**: Farbwelt (aufs
Logo abgestimmt), Namen und Schrift bleiben. Neu sind Rahmen, Knöpfe, Zeichen und das
Verhalten der fünf Kategorien. Details in [v5-nativ/UEBERGABE.md](v5-nativ/UEBERGABE.md).

- Direkt: <http://localhost:5799/v5-nativ/>
- Vier Bildschirme in echter Handy-Breite: <http://localhost:5799/v5-nativ/handy.html>
- Suchen und Hinzufügen, Episode +1/−1, Status wechseln, Wertung und Zufall funktionieren
  wirklich — damit die Bewegungen prüfbar sind. Der Zustand lebt im Speicher, ein
  Neuladen setzt zurück.

## Regeln, die in allen Versionen gelten

- Name „Tsugi" und `logo.png` bleiben unverändert und in jeder Version identisch.
- Kein Glas, kein `backdrop-filter` (Entscheidung vom 21.07.2026).
- Keine Emojis, keine Unicode-Symbole als Oberflächen-Zeichen — jedes Zeichen ist
  ein SVG-Pfad.
- Touchziele ≥ 44 px, sichtbare Fokusringe, `prefers-reduced-motion` respektiert,
  Kontrast WCAG AA.
- 3D-Neigung nur hinter `@media (hover: hover) and (pointer: fine)`, ohne `translateZ`.
- Schriften lokal als `woff2`, kein externer Request.

## Selbst nachmessen

In der Konsole der jeweiligen Version:

```js
const a = await import('/shared/audit.js');
console.log(await a.auditAll(), a.auditContrast(), a.auditTilt());
```

Jede Ausgabe nennt die **Anzahl geprüfter Elemente**. Eine Zahl ohne Prüfanzahl
ist keine Aussage — ein Werkzeug, das zu wenig prüft, meldet auch „alles gut".
