import { useEffect } from 'react';
import { fetchRelationSlices, isMainlineFormat, pickSequel, type RelationSlice } from '@/api/anilist';
import {
  isReleased,
  seasonSnapFrom,
  useLibrary,
  type LibraryEntry,
  type SeasonSnap,
  type WatchStatus,
} from '@/store/library';
import { useToasts } from '@/store/toast';
import { translate, useSettings } from '@/i18n';

/**
 * Der Update-Scan (Konzept aus V1): läuft einmal pro App-Öffnung und prüft die
 * Bibliothek auf Neuigkeiten — allen voran „Fortsetzung folgt“-Einträge.
 *
 *  - Neue Staffel erschienen  → Eintrag wandert zu „Noch zu schauen“ + Toast
 *  - Fortsetzung angekündigt  → Eintrag wandert zu „Fortsetzung folgt“ + Toast
 *  - Air-Status/Folgenzahlen laufender Staffeln werden dabei mit aufgefrischt.
 *
 * Kostenpunkt: dank gebündelter GraphQL-Aliases 1 Request pro ~12 Einträge,
 * nicht 1 Request pro Anime — die App bleibt flott und weit unterm Rate-Limit.
 */

const SCAN_DELAY_MS = 2500;
const CHUNK = 12;
const MAX_SEQUEL_ROUNDS = 3;

/** Erste noch nicht komplett geschaute Staffel (Index), oder seasons.length. */
function firstUnwatched(e: LibraryEntry): number {
  const cur = e.seasons[e.seasonIndex];
  if (cur && isReleased(cur) && cur.episodes !== null && e.progress >= cur.episodes) {
    return e.seasonIndex + 1;
  }
  return e.seasonIndex;
}

async function slicesFor(ids: number[]): Promise<Map<number, RelationSlice>> {
  const out = new Map<number, RelationSlice>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const got = await fetchRelationSlices(ids.slice(i, i + CHUNK));
    got.forEach((v, k) => out.set(k, v));
  }
  return out;
}

async function scanLibrary(): Promise<void> {
  const { entries, applyScan } = useLibrary.getState();
  const rows = Object.values(entries);
  if (rows.length === 0) return;

  // „Fortsetzung folgt“ zuerst — das sind die Einträge, auf die gewartet wird.
  rows.sort((a, b) => {
    const w = (s: WatchStatus) => (s === 'continuation' ? 0 : s === 'completed' ? 1 : 2);
    return w(a.status) - w(b.status);
  });

  // Pro Eintrag interessant: die letzte bekannte Staffel (Sequel-Suche) und
  // alles, was noch läuft oder angekündigt ist (Status-Refresh).
  const wanted = new Set<number>();
  for (const e of rows) {
    const last = e.seasons[e.seasons.length - 1];
    if (last) wanted.add(last.id);
    for (const s of e.seasons) {
      if (s.airStatus === 'RELEASING' || s.airStatus === 'NOT_YET_RELEASED' || s.episodes === null) {
        wanted.add(s.id);
      }
    }
  }

  let slices: Map<number, RelationSlice>;
  try {
    slices = await slicesFor([...wanted]);
  } catch {
    return; // Hintergrund-Scan crasht nie die App.
  }

  const push = useToasts.getState().push;
  const lang = useSettings.getState().lang;

  for (const e of rows) {
    let seasons: SeasonSnap[] = e.seasons.map((s) => {
      const slice = slices.get(s.id);
      if (!slice) return s;
      const fresh = seasonSnapFrom(slice.card);
      return { ...s, ...fresh };
    });

    // Sequel-Kette verlängern: hängt hinten so lange neue Hauptlinien-Staffeln
    // an, wie AniList welche kennt (angekündigte inklusive). AniList verbindet
    // manche echten Staffelübergänge über eine kurze Brücken-OVA/-Special
    // (z. B. Dr. Stone „Stone Wars“ → Special „Ryuusui“ → „New World“) — die
    // wird transparent übersprungen, ohne das Staffel-Budget zu verbrauchen,
    // sonst bricht die Kette genau an dieser Brücke ab.
    try {
      const ensureSlice = async (id: number): Promise<RelationSlice | undefined> => {
        let slice = slices.get(id);
        if (!slice) {
          const extra = await fetchRelationSlices([id]);
          extra.forEach((v, k) => slices.set(k, v));
          slice = slices.get(id);
        }
        return slice;
      };

      for (let round = 0; round < MAX_SEQUEL_ROUNDS; round++) {
        const last = seasons[seasons.length - 1];
        let slice = await ensureSlice(last.id);
        if (!slice) break;

        let sequel = pickSequel(slice);
        let bridgeHops = 0;
        while (sequel && !isMainlineFormat(sequel.format) && bridgeHops < 4) {
          if (seasons.some((s) => s.id === sequel!.id)) {
            sequel = null;
            break;
          }
          const bridgeSlice = await ensureSlice(sequel.id);
          sequel = bridgeSlice ? pickSequel(bridgeSlice) : null;
          bridgeHops += 1;
        }

        if (!sequel || seasons.some((s) => s.id === sequel.id)) break;
        seasons = [...seasons, seasonSnapFrom(sequel)];
      }
    } catch {
      /* Eintrag einzeln fehlschlagen lassen, Scan läuft weiter */
    }

    // Statuswechsel ableiten.
    const idx = firstUnwatched({ ...e, seasons });
    const patch: Partial<LibraryEntry> = { seasons };

    if (idx < seasons.length) {
      const next = seasons[idx];
      if (isReleased(next)) {
        // Neue Staffel ist da → „Noch zu schauen“ (nur aus Warte-Zuständen heraus;
        // wer gerade mittendrin schaut, bleibt bei „Schaue ich“).
        if (e.status === 'completed' || e.status === 'continuation') {
          patch.status = 'nextup';
          patch.seasonIndex = idx;
          patch.progress = 0;
          patch.releaseNote = null;
          push(translate(lang, 'scanNewSeason', { t: next.title }));
        }
      } else {
        // Fortsetzung ist (nur) angekündigt.
        const note = next.seasonYear ? String(next.seasonYear) : null;
        if (e.status === 'completed') {
          patch.status = 'continuation';
          patch.seasonIndex = idx;
          patch.progress = 0;
          patch.releaseNote = note;
          push(translate(lang, 'scanAnnounced', { t: next.title }));
        } else if (e.status === 'continuation' && e.releaseNote !== note) {
          patch.releaseNote = note;
        }
      }
    } else if (e.status === 'continuation') {
      // Die erwartete Fortsetzung ist verschwunden (abgesagt o. ä.) → abgeschlossen.
      patch.status = 'completed';
      patch.releaseNote = null;
    }

    applyScan(e.rootId, patch);
  }
}

// Modul-Guard: überlebt StrictMode-Doppelmounts — ein Scan pro App-Öffnung.
let scanStarted = false;

/** Startet den Bibliotheks-Scan einmalig, kurz nachdem die Bibliothek geladen ist. */
export function useStartupScan() {
  const hydrated = useLibrary((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated || scanStarted) return;
    scanStarted = true;
    window.setTimeout(() => {
      void scanLibrary().catch(() => {
        /* nie die App über einen Hintergrund-Scan crashen */
      });
    }, SCAN_DELAY_MS);
  }, [hydrated]);
}
