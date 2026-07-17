/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TMDB API-Key (v3) für das deutsche Titel-Overlay. Optional — ohne Key
   *  bleibt das Overlay inaktiv und die App zeigt Romaji/Englisch. */
  readonly VITE_TMDB_KEY?: string;
  /** Supabase-Projekt-URL. Pflicht — ohne Login/Sync läuft die App nicht. */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anon/publishable Key. Öffentlich, geschützt durch Row Level Security. */
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
