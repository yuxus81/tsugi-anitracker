-- =====================================================================
-- 0001_tsugi_schema.sql
-- Eigene, komplett neue Tabellen für Tsugi-Anitracker im selben Supabase-
-- Projekt wie die alte App. Rührt die bestehende `animes`-Tabelle NICHT an —
-- eigener Namensraum (`tsugi_*`), eigenes Datenmodell (Franchise-basiert,
-- siehe src/store/library.ts::LibraryEntry).
-- =====================================================================

-- ---------- tsugi_entries: ein Datensatz pro Bibliothekseintrag (Franchise) ----------
create table if not exists public.tsugi_entries (
  user_id uuid not null default auth.uid(),
  root_id bigint not null,
  status text not null,
  seasons jsonb not null,
  season_index integer not null default 0,
  progress integer not null default 0,
  rating integer,
  notes text not null default '',
  genres text[] not null default '{}',
  added_at bigint not null,
  updated_at bigint not null,
  last_scan_at bigint not null default 0,
  release_note text,
  primary key (user_id, root_id)
);

create index if not exists tsugi_entries_user_idx on public.tsugi_entries (user_id);

alter table public.tsugi_entries enable row level security;

drop policy if exists "tsugi_entries_select_own" on public.tsugi_entries;
create policy "tsugi_entries_select_own" on public.tsugi_entries
  for select using (auth.uid() = user_id);

drop policy if exists "tsugi_entries_insert_own" on public.tsugi_entries;
create policy "tsugi_entries_insert_own" on public.tsugi_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "tsugi_entries_update_own" on public.tsugi_entries;
create policy "tsugi_entries_update_own" on public.tsugi_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tsugi_entries_delete_own" on public.tsugi_entries;
create policy "tsugi_entries_delete_own" on public.tsugi_entries
  for delete using (auth.uid() = user_id);

-- ---------- tsugi_settings: kleine Pro-Nutzer-Einstellungen (aktuell nur die
-- manuelle Drag-&-Drop-Reihenfolge von "Abgeschlossen") ----------
create table if not exists public.tsugi_settings (
  user_id uuid primary key default auth.uid(),
  completed_order bigint[] not null default '{}'
);

alter table public.tsugi_settings enable row level security;

drop policy if exists "tsugi_settings_select_own" on public.tsugi_settings;
create policy "tsugi_settings_select_own" on public.tsugi_settings
  for select using (auth.uid() = user_id);

drop policy if exists "tsugi_settings_insert_own" on public.tsugi_settings;
create policy "tsugi_settings_insert_own" on public.tsugi_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "tsugi_settings_update_own" on public.tsugi_settings;
create policy "tsugi_settings_update_own" on public.tsugi_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tsugi_settings_delete_own" on public.tsugi_settings;
create policy "tsugi_settings_delete_own" on public.tsugi_settings
  for delete using (auth.uid() = user_id);

-- ---------- Realtime: Tsugi braucht Live-Updates zwischen Geräten ----------
-- Fügt die beiden Tabellen der Realtime-Publikation hinzu (idempotent —
-- schlägt ohne Effekt fehl, falls schon drin).
do $$ begin
  alter publication supabase_realtime add table public.tsugi_entries;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.tsugi_settings;
exception when duplicate_object then null; end $$;
