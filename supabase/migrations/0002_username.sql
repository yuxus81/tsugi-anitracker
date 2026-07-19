-- =====================================================================
-- 0002_username.sql
-- Ergänzt tsugi_settings um den Username (Begrüßung auf Home) inkl.
-- Zeitpunkt der letzten Änderung (7-Tage-Sperre in der App). Rein additiv —
-- kein Backup nötig, bestehende Zeilen bekommen einfach NULL in den neuen
-- Spalten und werden beim nächsten Sync/Speichern aufgefüllt.
-- =====================================================================

alter table public.tsugi_settings add column if not exists username text;
alter table public.tsugi_settings add column if not exists username_changed_at bigint;
