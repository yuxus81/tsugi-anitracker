# Product

## Register

product

## Users

Ein einzelner Anime-Enthusiast (Yunus), abends auf Couch oder am Desktop, Raum abgedunkelt. Er will in Sekunden wissen: Was schaue ich gerade, wo bin ich stehengeblieben, was kommt als Nächstes — und gelegentlich stöbern, was er als Nächstes anfangen könnte. Die App ist ein privates Archiv, kein Social Network.

## Product Purpose

Tsugi (つぎ, „als Nächstes") trackt Anime-Serien und -Filme **pro Franchise** (ein Eintrag über alle Staffeln/Filme/Specials hinweg, mit Zeiger auf Staffel + Episode), nicht pro Staffel. Status: Weiter schauen / Noch zu schauen / Watchlist / Fortsetzung folgt / Geschaut. Dazu persönliche Wertung, Franchise-Zeitstrahl, Airing-Kalender, Statistiken und ein Auto-Scan, der beim App-Start nach neuen/angekündigten Staffeln sucht.

Datenquelle ist AniList GraphQL (ein gebündelter Request pro Ansicht — die strukturelle Antwort auf die Jikan-Überlastungsprobleme von V1), optional überlagert von TMDB für deutsche Titel/Beschreibungen (`VITE_TMDB_KEY`). Persistenz: **Supabase ist die Quelle der Wahrheit** (Login erforderlich, Multi-Device-Sync per Realtime), IndexedDB dient als lokaler Cache fürs sofortige Zeichnen und kurzzeitige Offline-Nutzung. JSON-Export/-Import bleibt als verlustfreier Ausweg.

## Brand Personality

Archivarisch, aber nicht steril. Wie der Katalog einer Film-Gesellschaft, der sein Publikum kennt: Cover-Artwork trägt die Fläche, die UI bleibt dunkel und ruhig — aber jede Status-Welt hat ihre eigene Signalfarbe, damit „was läuft" und „was wartet" ohne Lesen unterscheidbar sind. Drei Worte: kuratiert, wach, verlässlich.

## Anti-references

- **Generische SaaS-Dashboards** (Hero-Metric-Kacheln, identische Card-Grids).
- **Pastell-Kawaii.**
- **Glasmorphismus als Grundton** — dekorative Blur-Flächen wurden im Juli 2026 bewusst wieder komplett entfernt (siehe DESIGN.md).
- **Emojis in der Oberfläche** — auch als Unicode-Symbol, das ein System zur Farb-Emoji-Schrift hochzieht.

## Design Principles

1. **Das Artwork trägt die Emotion** — die UI bleibt zurückgenommen; Fläche und Sättigung kommen aus den Covern.
2. **Farbe ist Statuscode, nicht Dekoration** — jede Kategorie hat eine eigene Signalfarbe, aber immer zusammen mit Label/Zahl, nie Farbe allein.
3. **Der nächste Schritt zuerst** — jede Ansicht beantwortet „was jetzt?" (nächste Episode, nächster Release) vor allem anderen.
4. **Ein Request pro Ansicht** — Datenzugriffe werden gebündelt; die App darf sich nie selbst per Request-Sturm lahmlegen.
5. **Die Bibliothek ist vollständig** — Home darf kürzen und kuratieren, die Bibliothek nie. Was getrackt ist, muss dort auffindbar sein.
6. **Earned familiarity** — Standard-Affordanzen (Tabs, Suche, Listen), keine erfundenen Bedienmuster.

## Accessibility & Inclusion

Kontrast ≥ 4.5:1 für Fließtext auf allen Flächen, Fokus-Ringe sichtbar, vollständige Tastatur-Bedienbarkeit der Kernflüsse, `prefers-reduced-motion` respektiert (Crossfades statt Bewegung), Touch-Ziele ≥ 44 px (Ausnahme: Textlinks im Fließtext/in Überschriften, wie in WCAG 2.5.8 vorgesehen). Deutsch als UI-Sprache.

**Bewusste Abweichung:** Textauswahl ist app-weit deaktiviert (`user-select: none`, Eingabefelder ausgenommen). Das ist eine ausdrückliche Produktentscheidung fürs App-Gefühl und kein Versehen — nicht „reparieren".
