import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * "Angemeldet bleiben"-Unterstützung (gleiches Prinzip wie in der alten App):
 * Ist die Checkbox aktiv, bleibt die Session in localStorage (übersteht einen
 * Neustart). Ist sie es nicht, landet sie in sessionStorage (weg, sobald der
 * Tab/Browser schließt). Ein einzelnes Flag entscheidet, wohin neu geschrieben
 * wird; beim Lesen wird transparent über beide Speicher hinweg gesucht.
 */
const PERSIST_KEY = 'tsugi.persist';

export function setSessionPersistence(persist: boolean): void {
  try {
    localStorage.setItem(PERSIST_KEY, persist ? '1' : '0');
  } catch {
    /* Speicher evtl. nicht verfügbar (privater Modus) — dann eben nicht persistiert */
  }
}

function usePersistent(): boolean {
  try {
    return localStorage.getItem(PERSIST_KEY) !== '0';
  } catch {
    return true;
  }
}

const hybridStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (usePersistent()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: hybridStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
