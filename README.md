# Tsugi (つぎ) — dein Anime-Archiv

**AniTracker Version 2, à la Claude.** Ein persönliches Anime-Archiv im Stil einer
Film-Gesellschaft: dunkle Wand, leuchtendes Artwork, ein Jade-Akzent, editoriale
Serifen-Typografie. Bewusst das Gegenteil des Neon-Looks von V1.

## Was sie kann

- **Heute**: Weiterschauen-Liste mit Episoden-Stepper direkt in der Karte, plus
  Simulcast-Kalender („Ep. 3 · Mi., 14:30") für alles Laufende im Archiv.
- **Entdecken**: Trending, aktuelle Season, nächste Season, All-Time-Top, Filme,
  acht Genre-Welten — die komplette Standardansicht ist **ein einziger** API-Request.
- **Detailseite**: Banner, Beschreibung, Trailer, Community-Wertung, Studio —
  und der **Franchise-Zeitstrahl**: die Hauptlinie (Staffeln + Filme) chronologisch
  mit „Du bist hier"-Marker, Specials/OVAs/Side Stories sauber getrennt darunter.
- **Bibliothek**: fünf Status (Schaue ich / Geplant / Abgeschlossen / Pausiert /
  Abgebrochen), Fortschritt, persönliche 1–10-Wertung. Letzte Episode gesehen →
  automatisch „Abgeschlossen".
- **Statistik**: Titel, Episoden, Sehzeit, Ø-Wertung, Status-/Genre-/Jahres-
  Verteilung — komplett offline berechnet.
- **Suche**: Command-Palette (`/` oder `Strg/Cmd+K`) von überall.
- **Backup**: JSON-Export/-Import in den Einstellungen.

## Architektur-Entscheidungen (und warum)

- **AniList GraphQL statt Jikan.** V1 litt an Jikans Rate-Limits und 504-Ausfällen.
  GraphQL erlaubt, eine ganze Ansicht in einem Request zu bündeln (Aliases) — die
  App kann sich nicht mehr selbst per Request-Sturm lahmlegen.
- **Local-first statt Login.** Das Archiv liegt in IndexedDB im Browser. Kein
  Account, keine Wartezeit, funktioniert offline. Gerätewechsel per JSON-Backup.
- **Hauptlinien-Filter im Franchise-Walker.** Nur TV/Film/ONA-Fortsetzungen zählen
  als „nächste Staffel" — Specials können nie wieder als Staffel durchgehen.

## Entwickeln

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Produktions-Build nach dist/ (inkl. Typecheck)
```

Deploy: `dist/` ist dank `base: './'` + Hash-Routing auf jedem statischen Host
lauffähig (GitHub Pages ohne Extra-Konfiguration).

---

Design-Grundlagen in [PRODUCT.md](PRODUCT.md) und [DESIGN.md](DESIGN.md).
Erdacht, entworfen und gebaut von Claude (Fable 5) im Juli 2026.
