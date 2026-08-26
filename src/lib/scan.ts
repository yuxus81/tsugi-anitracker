import { useEffect } from 'react';
import { fetchRelationSlices, type RelationSlice } from '@/api/anilist';
import {
  decideScan,
  extendSequelChain,
  idsToRefresh,
  refreshedSeasons,
  scanOrder,
} from '@/domain/scan';
import { useLibrary } from '@/store/library';
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
 * Hier steht nur noch die Leitung: holen, `@/domain/scan` fragen, ins Regal
 * legen. Jede Entscheidung darüber, WAS sich ändert, hängt dort an einem Test.
 *
 * Kostenpunkt: dank gebündelter GraphQL-Aliases 1 Request pro 8 Einträge,
 * nicht 1 Request pro Anime — die App bleibt flott und weit unterm Rate-Limit.
 * Die Bündelgröße bestimmt `fetchRelationSlices` selbst; sie hängt an
 * AniLists Komplexitätsgrenze und geht niemanden hier etwas an.
 */

const SCAN_DELAY_MS = 2500;

async function scanLibrary(): Promise<void> {
  const { entries, applyScan } = useLibrary.getState();
  const rows = scanOrder(Object.values(entries));
  if (rows.length === 0) return;

  let slices: Map<number, RelationSlice>;
  try {
    slices = await fetchRelationSlices(idsToRefresh(rows));
  } catch {
    return; // Hintergrund-Scan crasht nie die App.
  }

  // Nachladen einzelner Ids, die der Sammelabruf nicht kannte — die Kette
  // wächst über bereits Angefragtes hinaus. Der Zwischenspeicher gilt für den
  // ganzen Lauf, damit sich Franchises den Nachschlag teilen.
  const ensureSlice = async (id: number): Promise<RelationSlice | undefined> => {
    let slice = slices.get(id);
    if (!slice) {
      const extra = await fetchRelationSlices([id]);
      extra.forEach((v, k) => slices.set(k, v));
      slice = slices.get(id);
    }
    return slice;
  };

  const push = useToasts.getState().push;
  const lang = useSettings.getState().lang;

  for (const e of rows) {
    const seasons = await extendSequelChain(refreshedSeasons(e, slices), ensureSlice);
    const { patch, toast } = decideScan(e, seasons);
    if (toast) push(translate(lang, toast.key, { t: toast.title }));
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
