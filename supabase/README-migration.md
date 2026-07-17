# Supabase-Setup für Tsugi (Multi-Device-Login)

Diese Schritte führst **du** selbst im Supabase-Dashboard aus.

Projekt: `https://anyvdbweojvaztyiacwb.supabase.co` (dasselbe wie deine alte
AniTracker-App — Tsugi bekommt eigene, komplett getrennte Tabellen mit dem
Präfix `tsugi_`, die alte `animes`-Tabelle wird nicht angerührt).

---

## 1. Migration ausführen (SQL Editor)

Öffne **SQL Editor** im Supabase-Dashboard, füge den kompletten Inhalt von
`migrations/0001_tsugi_schema.sql` ein und klicke „Run“.

Das legt an:
- `tsugi_entries` — ein Datensatz pro Bibliothekseintrag (Franchise), mit
  Row Level Security (jeder sieht nur seine eigenen Zeilen).
- `tsugi_settings` — kleine Pro-Nutzer-Einstellungen (aktuell nur die
  Drag-&-Drop-Reihenfolge bei „Abgeschlossen“), ebenfalls mit RLS.
- Beide Tabellen werden der Realtime-Publikation hinzugefügt, damit
  Änderungen live zwischen deinen Geräten ankommen.

Rein additiv, nichts Bestehendes wird verändert — kein Backup nötig.

---

## 2. Auth-URLs eintragen (wichtig für Passwort-Reset)

**Authentication → URL Configuration**:

- **Site URL**: `https://yuxus81.github.io/tsugi-anitracker/`
- **Redirect URLs**: dieselbe URL zusätzlich eintragen (falls das Feld
  getrennt ist)

Ohne das landet der Link aus der „Passwort vergessen“-E-Mail auf der
falschen Seite.

---

## 3. E-Mail-Bestätigung (optional, deine Entscheidung)

**Authentication → Providers → Email**: „Confirm email“ ist standardmäßig an
— nach dem Registrieren muss ein Bestätigungslink per Mail geklickt werden,
bevor man sich einloggen kann. Für ein Ein-Personen-Projekt kannst du das
ausschalten, dann kommst du direkt nach dem Signup rein.

---

## 4. Verifikation

```sql
-- Tabellen existieren und sind leer:
select count(*) from public.tsugi_entries;
select count(*) from public.tsugi_settings;

-- RLS ist aktiv:
select relname, relrowsecurity from pg_class
where relname in ('tsugi_entries', 'tsugi_settings');
-- erwartet: relrowsecurity = true bei beiden
```

---

## Spaltenüberblick

| Spalte (`tsugi_entries`) | Typ | Bedeutung |
|---|---|---|
| `user_id` | uuid, default `auth.uid()` | Besitzer (RLS) |
| `root_id` | bigint | AniList-ID der ersten Staffel — Primärschlüssel zusammen mit `user_id` |
| `status` | text | watching / planned / nextup / continuation / completed / paused |
| `seasons` | jsonb | Hauptlinien-Staffeln (denormalisierte Snapshots) |
| `season_index`, `progress` | integer | Zeiger, bis wohin geschaut wurde |
| `rating` | integer, nullable | persönliche Bewertung 1–10 |
| `genres` | text[] | für die Statistik-Seite |
| `added_at`, `updated_at`, `last_scan_at` | bigint (ms-Timestamp) | |
| `release_note` | text, nullable | z. B. Jahr bei angekündigter Fortsetzung |
