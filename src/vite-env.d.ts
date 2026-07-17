/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TMDB API-Key (v3) für das deutsche Titel-Overlay. Optional — ohne Key
   *  bleibt das Overlay inaktiv und die App zeigt Romaji/Englisch. */
  readonly VITE_TMDB_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
