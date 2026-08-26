import { beforeEach, describe, expect, test } from 'vitest';
import { useLibrary } from '@/store/library';
import { dbPut } from '@/lib/db';
import { entry, resetIds, season } from '@/test/factories';

/**
 * WETTLAUF ZWISCHEN CACHE UND CLOUD.
 *
 * Beim Start laufen zwei Dinge gleichzeitig los: `hydrate()` liest den
 * lokalen IndexedDB-Cache (damit sofort etwas auf dem Schirm steht) und
 * `syncFromRemote()` holt die Wahrheit aus Supabase.
 *
 * Auf einem neuen Gerät ist der Cache leer und das Anlegen der Datenbank
 * langsam — die Cloud-Antwort kannschon vorher da sein. Wenn `hydrate()` danach
 * stur alles überschreibt, wischt der leere Cache die gerade geladene
 * Bibliothek wieder weg: Der Nutzer sieht ein leeres Archiv, obwohl der
 * Abgleich erfolgreich war. Erst ein Neuladen bringt sie zurück.
 */

beforeEach(() => {
  resetIds();
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: false, remoteApplied: false });
});

describe('hydrate gegen syncFromRemote', () => {
  test('der leere lokale Cache löscht keine bereits geladene Bibliothek', async () => {
    // Die Cloud war schneller: die Einträge stehen schon.
    const geladen = entry({ rootId: 1, seasons: [season({ id: 1, title: 'Aus der Cloud' })] });
    useLibrary.setState({ entries: { 1: geladen } });
    useLibrary.getState().markRemoteApplied();

    // Jetzt trudelt der (leere) Cache-Lesevorgang ein.
    await useLibrary.getState().hydrate();

    expect(Object.keys(useLibrary.getState().entries)).toHaveLength(1);
  });

  test('meldet trotzdem, dass der Cache gelesen wurde', async () => {
    useLibrary.getState().markRemoteApplied();

    await useLibrary.getState().hydrate();

    expect(useLibrary.getState().hydrated).toBe(true);
  });

  test('ohne Cloud-Antwort füllt der Cache die Bibliothek wie bisher', async () => {
    await dbPut(entry({ rootId: 7, seasons: [season({ id: 7, title: 'Aus dem Cache' })] }));

    await useLibrary.getState().hydrate();

    expect(useLibrary.getState().entries[7]).toBeDefined();
  });

  test('nach einem Abmelden greift der Cache wieder', async () => {
    // `resetLocal()` löscht den Zustand; danach darf ein späterer
    // Cache-Lesevorgang wieder greifen, sonst bliebe die App leer.
    useLibrary.getState().markRemoteApplied();
    useLibrary.getState().resetLocal();
    await dbPut(entry({ rootId: 9, seasons: [season({ id: 9, title: 'Wieder da' })] }));

    await useLibrary.getState().hydrate();

    expect(useLibrary.getState().entries[9]).toBeDefined();
  });
});
