# Tsugi-Anitracker (つぎ) — dein Anime-Archiv

**AniTracker Version 2.** Die Mischung aus V1 und dem Tsugi-Neubau: V1s Farben
(dunkles Blau, Neon-Cyan, Purple, Pink) und Logo, V1s Franchise-Tracking mit
Auto-Scan — auf Tsugis moderner Basis (AniList GraphQL, local-first, editoriale
Typografie).

## Was sie kann

- **Home**: drei switchbare Farbwelten-Panels — *Weiter schauen* (Neon),
  *Noch zu schauen* (Pink), *Watchlist* (Purple) — plus Simulcast-Kalender
  („Ep. 3 · Mi., 14:30") für alles Laufende im Archiv.
- **Franchise-Tracking (V1-Modell)**: EIN Bibliothekseintrag pro Franchise, nicht
  pro Staffel. Der Eintrag kennt die ganze Hauptlinie und einen Zeiger, bis wohin
  geschaut wurde. Letzte Episode einer Staffel → automatisch weiter zur nächsten.
- **Update-Scan bei jedem App-Start**: prüft die Bibliothek (v. a. „Fortsetzung
  folgt") in einem gebündelten Request auf neue Staffeln. Erschienen → „Noch zu
  schauen" + Toast; nur angekündigt → „Fortsetzung folgt".
- **Hinzufügen-Flow**: Status-Chips oben (wie die Entdecken-Filter), darunter
  klappt der Franchise-Zeitstrahl auf — antippen, bis wohin geschaut wurde.
- **Detailseite**: Franchise-Infobox (Ø-Wertung, Gesamtfolgen, Staffeln, Filme,
  Specials, Laufzeit) über der Staffel-Box; Zeitstrahl mit Geschaut-Häkchen,
  Specials/OVAs sauber getrennt.
- **Bibliothek**: Abgeschlossen · Pausiert · Fortsetzung folgt · Noch zu schauen.
- **Episoden-Eingabe**: −/+ Stepper UND direkt editierbare Zahl.
- **Sprache**: Deutsch/Englisch umschaltbar (Einstellungen). Titel kommen von
  AniList als internationale Titel.
- **Entdecken / Statistik / Suche / Backup**: wie gehabt — ein Request pro
  Ansicht, Offline-Statistik, Command-Palette (`/`), JSON-Export/-Import.

## Architektur-Entscheidungen (und warum)

- **AniList GraphQL statt Jikan.** GraphQL bündelt eine ganze Ansicht (und den
  kompletten Bibliotheks-Scan) in einen Request — die App kann sich nicht mehr
  selbst per Request-Sturm lahmlegen.
- **Local-first statt Login.** Das Archiv liegt in IndexedDB im Browser. Kein
  Account, funktioniert offline. Gerätewechsel per JSON-Backup.
- **Hauptlinien-Filter im Franchise-Walker.** Nur TV/Film/ONA-Fortsetzungen zählen
  als „nächste Staffel" — Specials können nie wieder als Staffel durchgehen.

## Entwickeln

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktions-Build nach dist/ (inkl. Typecheck)
```

Deploy: `dist/` ist dank `base: './'` + Hash-Routing auf jedem statischen Host
lauffähig (GitHub Pages ohne Extra-Konfiguration).

---

Design-Grundlagen in [PRODUCT.md](PRODUCT.md) und [DESIGN.md](DESIGN.md).
Erdacht, entworfen und gebaut von Claude im Juli 2026; Hybrid-Umbau nach
Yunus' Feedback (V1-Farben/-Logo + Franchise-Modell) am 16.07.2026.
