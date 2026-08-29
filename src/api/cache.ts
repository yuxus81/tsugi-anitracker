/**
 * Kleiner, dauerhafter Antwort-Cache (localStorage) für AniList-Antworten.
 *
 * Warum überhaupt: AniList lässt ohne Login nur ~30 Anfragen pro Minute zu.
 * Jede Anfrage, die wir NICHT stellen, ist die einzige Optimierung, die
 * wirklich zählt — react-query hält seinen Cache nur im Arbeitsspeicher und
 * ist nach jedem Reload/Tabwechsel leer. Hier überlebt er den Neustart.
 *
 * Bewusst simpel: JSON in localStorage, feste Obergrenze, ältester Eintrag
 * fliegt zuerst raus. Kein IndexedDB — die Datenmengen sind klein (ein
 * Franchise ≈ 20 KB) und synchroner Zugriff macht den Cache-Hit sofort
 * sichtbar, ohne einen zusätzlichen await-Tick.
 */

const PREFIX = 'tsugi.cache.v1:';
const INDEX_KEY = 'tsugi.cache.v1.index';
const MAX_ENTRIES = 220;

interface Wrapped<T> {
  t: number; // geschrieben am
  e: number; // gültig bis
  v: T;
}

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(keys: string[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(keys));
  } catch {
    /* Speicher voll — der Cache ist optional, nichts zu retten. */
  }
}

function drop(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* egal */
  }
}

export function cacheGet<T>(key: string): T | undefined {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PREFIX + key);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  try {
    const w = JSON.parse(raw) as Wrapped<T>;
    if (w.e < Date.now()) {
      drop(key);
      return undefined;
    }
    return w.v;
  } catch {
    drop(key);
    return undefined;
  }
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  const w: Wrapped<T> = { t: Date.now(), e: Date.now() + ttlMs, v: value };
  let payload: string;
  try {
    payload = JSON.stringify(w);
  } catch {
    return;
  }
  const index = readIndex().filter((k) => k !== key);
  index.push(key);

  // Platz schaffen, bevor geschrieben wird (statt erst am QuotaExceededError
  // zu merken, dass nichts mehr passt).
  while (index.length > MAX_ENTRIES) drop(index.shift()!);

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      localStorage.setItem(PREFIX + key, payload);
      writeIndex(index);
      return;
    } catch {
      // Voll: die ältesten Einträge opfern und erneut versuchen.
      const victim = index.shift();
      if (!victim) return;
      drop(victim);
    }
  }
}

/** Cache-Hit mit Netz-Fallback. `ttlMs` gilt nur für frisch geholte Werte. */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  cacheSet(key, value, ttlMs);
  return value;
}

export const TTL = {
  /** Suchtreffer ändern sich kaum — eine Stunde reicht dicke. */
  search: 60 * 60 * 1000,
  /** Entdecken/Genre: Trending dreht sich langsam, 3 h ist unauffällig. */
  discover: 3 * 60 * 60 * 1000,
  /** Detailseite: Episodenzahl/Score ändern sich wöchentlich, nicht stündlich. */
  detail: 12 * 60 * 60 * 1000,
  /** Beziehungen zwischen Staffeln sind praktisch statisch. */
  relations: 7 * 24 * 60 * 60 * 1000,
  /** Fertig gelaufener Franchise-Zeitstrahl. */
  franchise: 3 * 24 * 60 * 60 * 1000,
} as const;
