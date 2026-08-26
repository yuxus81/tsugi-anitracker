import { isMainlineFormat, pickSequel, type RelationSlice } from '@/api/anilist';
import type { DictKey } from '@/i18n';
import {
  isReleased,
  seasonSnapFrom,
  type LibraryEntry,
  type SeasonSnap,
  type WatchStatus,
} from '@/store/library';

/**
 * Die Entscheidungen des Startup-Scans — ohne Netz, ohne Store, ohne Uhr.
 *
 * Der Scan verschiebt Einträge zwischen Kategorien, setzt Fortschritt zurück
 * und meldet das dem Nutzer. Das passiert im Hintergrund, ohne dass jemand
 * hinsieht — also darf keine dieser Regeln in Netzcode versteckt liegen, wo
 * sie nur über einen echten Server prüfbar wäre. `src/lib/scan.ts` hält
 * seitdem nur noch die Leitung: holen, hier fragen, ins Regal legen.
 */

/** Wie viele neue Staffeln ein einzelner Scan höchstens anhängt. */
export const MAX_SEQUEL_ROUNDS = 3;

/**
 * Wie viele Brücken-Knoten am Stück übersprungen werden dürfen.
 *
 * AniList verbindet manche echten Staffelübergänge über eine kurze
 * Brücken-OVA oder ein Special (Dr. Stone: „Stone Wars“ → Special „Ryuusui“
 * → „New World“). Ohne das Überspringen bräche die Kette genau dort ab. Die
 * Obergrenze verhindert, dass sich der Scan durch einen Special-Sumpf gräbt.
 */
export const MAX_BRIDGE_HOPS = 4;

/** Nachschlagen eines Verknüpfungs-Ausschnitts; die Herkunft ist hier egal. */
export type SliceLookup = (id: number) => Promise<RelationSlice | undefined>;

export interface ScanToast {
  key: Extract<DictKey, 'scanNewSeason' | 'scanAnnounced'>;
  title: string;
}

export interface ScanDecision {
  patch: Partial<LibraryEntry>;
  /** Was dem Nutzer gemeldet wird — oder nichts. Das Anzeigen ist Sache des Aufrufers. */
  toast: ScanToast | null;
}

/**
 * Index der ersten noch nicht komplett geschauten Staffel, oder
 * `seasons.length`, wenn alles durch ist.
 *
 * Weiter gerückt wird nur bei erschienener Staffel MIT bekannter Folgenzahl:
 * bei `episodes === null` wäre jeder Fortschritt „genug“, und eine noch nicht
 * ausgestrahlte Staffel gilt nie als geschaut, egal was im Fortschritt steht.
 */
export function firstUnwatched(e: LibraryEntry): number {
  const cur = e.seasons[e.seasonIndex];
  if (cur && isReleased(cur) && cur.episodes !== null && e.progress >= cur.episodes) {
    return e.seasonIndex + 1;
  }
  return e.seasonIndex;
}

/**
 * Reihenfolge des Scans: „Fortsetzung folgt“ zuerst — das sind die Einträge,
 * auf die tatsächlich gewartet wird. Reißt die Verbindung mittendrin ab, sind
 * wenigstens die beantwortet.
 */
export function scanOrder(rows: LibraryEntry[]): LibraryEntry[] {
  const gewicht = (s: WatchStatus) => (s === 'continuation' ? 0 : s === 'completed' ? 1 : 2);
  return [...rows].sort((a, b) => gewicht(a.status) - gewicht(b.status));
}

/**
 * Welche Ids der Scan frisch braucht.
 *
 * Zwei Gründe, eine Staffel anzufragen: an der LETZTEN hängt eine mögliche
 * Fortsetzung, und alles, was noch läuft, angekündigt ist oder keine
 * Folgenzahl hat, kann sich seit dem letzten Öffnen geändert haben. Fertige
 * Staffeln aus der Mitte ändern sich nicht mehr — die kosten nur Abfragen.
 */
export function idsToRefresh(rows: LibraryEntry[]): number[] {
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
  return [...wanted];
}

/**
 * Staffeln mit den frisch geholten Karten überschreiben. Was nicht geliefert
 * wurde, bleibt wie es war — ein Abgleich ohne Antwort darf nichts löschen.
 */
export function refreshedSeasons(e: LibraryEntry, slices: Map<number, RelationSlice>): SeasonSnap[] {
  return e.seasons.map((s) => {
    const slice = slices.get(s.id);
    return slice ? { ...s, ...seasonSnapFrom(slice.card) } : s;
  });
}

/**
 * Hängt hinten so lange neue Hauptlinien-Staffeln an, wie AniList welche
 * kennt (angekündigte inklusive).
 *
 * Brücken-Knoten (Specials/OVAs zwischen zwei echten Staffeln) werden
 * transparent übersprungen und verbrauchen KEIN Staffel-Budget — sonst
 * käme ein Franchise mit Brücke nur halb so weit wie eines ohne.
 *
 * Scheitert das Nachladen, bleibt die bisher gebaute Kette stehen: ein
 * Hintergrund-Scan darf niemandem die Bibliothek verkürzen.
 */
export async function extendSequelChain(
  seasons: SeasonSnap[],
  lookup: SliceLookup,
): Promise<SeasonSnap[]> {
  let chain = seasons;
  try {
    for (let round = 0; round < MAX_SEQUEL_ROUNDS; round++) {
      const last = chain[chain.length - 1];
      if (!last) break;

      const slice = await lookup(last.id);
      if (!slice) break;

      let sequel = pickSequel(slice);
      let bridgeHops = 0;
      while (sequel && !isMainlineFormat(sequel.format) && bridgeHops < MAX_BRIDGE_HOPS) {
        // Eine Brücke, die zurück in die eigene Kette zeigt, ist keine.
        if (chain.some((s) => s.id === sequel!.id)) {
          sequel = null;
          break;
        }
        const bridgeSlice = await lookup(sequel.id);
        sequel = bridgeSlice ? pickSequel(bridgeSlice) : null;
        bridgeHops += 1;
      }

      // Nach ausgeschöpften Sprüngen kann hier immer noch ein Brücken-Knoten
      // stehen — der gehört nicht in die Staffelliste.
      if (!sequel || !isMainlineFormat(sequel.format)) break;
      if (chain.some((s) => s.id === sequel.id)) break;
      chain = [...chain, seasonSnapFrom(sequel)];
    }
  } catch {
    /* Eintrag einzeln fehlschlagen lassen, der Scan läuft weiter */
  }
  return chain;
}

/**
 * Was der Scan an einem Eintrag ändert — und was er dazu meldet.
 *
 * Die Regeln:
 *  - Neue Staffel ist erschienen → „Noch zu schauen“, aber NUR aus einem
 *    Warte-Zustand heraus. Wer gerade mittendrin schaut, wird nicht
 *    herausgerissen und behält seinen Fortschritt.
 *  - Fortsetzung ist nur angekündigt → „Fortsetzung folgt“ mit Jahresvermerk.
 *    Steht der Eintrag schon dort, wird still nur der Termin nachgezogen —
 *    dieselbe Meldung zweimal ist Lärm.
 *  - Die erwartete Fortsetzung ist verschwunden (abgesagt) → abgeschlossen.
 */
export function decideScan(e: LibraryEntry, seasons: SeasonSnap[]): ScanDecision {
  const idx = firstUnwatched({ ...e, seasons });
  const patch: Partial<LibraryEntry> = { seasons };
  let toast: ScanToast | null = null;

  if (idx < seasons.length) {
    const next = seasons[idx];
    if (isReleased(next)) {
      if (e.status === 'completed' || e.status === 'continuation') {
        patch.status = 'nextup';
        patch.seasonIndex = idx;
        patch.progress = 0;
        patch.releaseNote = null;
        toast = { key: 'scanNewSeason', title: next.title };
      }
    } else {
      const note = next.seasonYear ? String(next.seasonYear) : null;
      if (e.status === 'completed') {
        patch.status = 'continuation';
        patch.seasonIndex = idx;
        patch.progress = 0;
        patch.releaseNote = note;
        toast = { key: 'scanAnnounced', title: next.title };
      } else if (e.status === 'continuation' && e.releaseNote !== note) {
        patch.releaseNote = note;
      }
    }
  } else if (e.status === 'continuation') {
    patch.status = 'completed';
    patch.releaseNote = null;
  }

  return { patch, toast };
}
