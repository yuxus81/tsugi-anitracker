# Product

## Register

product

## Users

Ein einzelner Anime-Enthusiast (Yunus), abends auf Couch oder am Desktop, Raum abgedunkelt. Er will in Sekunden wissen: Was schaue ich gerade, wo bin ich stehengeblieben, was kommt als Nächstes — und gelegentlich stöbern, was er als Nächstes anfangen könnte. Die App ist ein privates Archiv, kein Social Network.

## Product Purpose

Tsugi (つぎ, „als Nächstes") trackt Anime-Serien und -Filme: Fortschritt pro Episode, Status (Schaue ich / Geplant / Abgeschlossen / Pausiert / Abgebrochen), persönliche Wertung, Franchise-Zeitstrahl über Staffeln/Filme/Specials hinweg, Airing-Kalender, Statistiken. Datenquelle ist ausschließlich AniList GraphQL (ein gebündelter Request pro Ansicht — die strukturelle Antwort auf die Jikan-Überlastungsprobleme von V1). Persistenz ist local-first (IndexedDB) mit JSON-Export/-Import; kein Account, keine Anmeldung, sofort nutzbar.

## Brand Personality

Archivarisch, ruhig, präzise. Wie der Katalog einer Film-Gesellschaft: Das Cover-Artwork ist der Star, die UI ist die dunkle Wand, auf der es hängt. Drei Worte: kuratiert, gelassen, verlässlich.

## Anti-references

- **AniTracker V1** (Neon-Pink/Lila, Partikel-Effekte, verspielte Popups) — V2 muss sich sichtbar davon absetzen.
- **Anime-Neon-Reflex**: dunkles Lila/Pink mit Glow ist der Kategorie-Default; verboten.
- **Pastell-Kawaii** als Gegenreflex ebenso.
- Generische SaaS-Dashboards (Hero-Metric-Kacheln, identische Card-Grids).

## Design Principles

1. **Das Artwork trägt die Emotion** — die UI bleibt achromatisch; Farbe kommt aus Covern und einem einzigen Jade-Akzent.
2. **Der nächste Schritt zuerst** — jede Ansicht beantwortet „was jetzt?" (nächste Episode, nächster Release) vor allem anderen.
3. **Ein Request pro Ansicht** — Datenzugriffe werden gebündelt; die App darf sich nie selbst per Request-Sturm lahmlegen.
4. **Local-first, verlustfrei** — alles funktioniert offline nach dem ersten Laden; Nutzerdaten verlassen das Gerät nur als bewusster Export.
5. **Earned familiarity** — Standard-Affordanzen (Tabs, Suche, Listen), keine erfundenen Bedienmuster.

## Accessibility & Inclusion

Kontrast ≥ 4.5:1 für Fließtext auf allen Flächen, Fokus-Ringe sichtbar, vollständige Tastatur-Bedienbarkeit der Kernflüsse, `prefers-reduced-motion` respektiert (Crossfades statt Bewegung). Deutsch als UI-Sprache.
