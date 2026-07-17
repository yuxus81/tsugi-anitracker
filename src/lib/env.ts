/**
 * Zentraler, typisierter Zugriff auf Build-Zeit-Umgebungsvariablen. Schlägt in
 * der Entwicklung sofort fehl, wenn ein Pflichtwert fehlt (siehe V1: gleiches
 * Prinzip, damit ein vergessener Key nicht erst als kryptischer Runtime-Fehler
 * beim ersten Supabase-Call auffällt).
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    const msg = `[env] Fehlende Pflicht-Umgebungsvariable: ${name}`;
    if (import.meta.env.DEV) throw new Error(msg);
    console.error(msg);
    return '';
  }
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
} as const;
