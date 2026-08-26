import { test as base, type Page } from '@playwright/test';
import { entryRow, expect, seed } from './fixtures';

/**
 * DIE VIER WEGE, DIE JEMAND WIRKLICH GEHT.
 *
 * Alles andere prüft Bausteine. Hier läuft die App am Stück: von der Suche
 * bis zum Eintrag im Regal, von der letzten Folge bis zum Wechsel der
 * Kategorie, über die Sprachumschaltung und einmal Sicherung raus und wieder
 * herein.
 *
 * ZWEI REGELN, ohne die diese Tests nur so täten:
 *
 * 1. **Keine Standard-Bibliothek.** Die Attrappe füllt sonst 58 Einträge mit
 *    den Ids 1…58 — und genau in diesem Bereich antwortet auch die Suche.
 *    „Titel 31 ist jetzt in der Bibliothek" wäre dort von vornherein grün
 *    gewesen, ohne dass jemand etwas hinzugefügt hätte. Jeder Weg sät seine
 *    eigene, kleine Ausgangslage.
 *
 * 2. **Nach einer Änderung NICHT `page.goto`.** Das lädt die Seite neu, und
 *    beim Neuladen holt die App ihren Stand aus der Cloud — die Attrappe
 *    antwortet dort immer mit der ANFANGS gesäten Liste. Jede gerade
 *    vorgenommene Änderung wäre damit weggewischt und der Test prüfte den
 *    Saatgut-Zustand. Gewechselt wird deshalb über die Tab-Leiste, wie ein
 *    Mensch es täte.
 */

const test = base;

/** Der Startzustand für einen Weg — ohne die 58 Einträge der Attrappe. */
async function mitBibliothek(page: Page, entries: ReturnType<typeof entryRow>[]) {
  await seed(page, { entries });
}

/** Eine Staffel mit `episodes` Folgen, fertig ausgestrahlt. */
function staffel(id: number, episodes = 12) {
  return {
    id,
    title: `Titel ${id}`,
    coverUrl: null,
    format: 'TV',
    episodes,
    season: 'SPRING',
    seasonYear: 2024,
    startDate: { year: 2024, month: 4, day: 1 },
    airStatus: 'FINISHED',
    averageScore: 80,
    duration: 24,
  };
}

/** In der App weiterklicken statt neu laden — siehe Regel 2 oben. */
async function zurBibliothek(page: Page) {
  await page.locator('.tabbar, .rail').first().getByRole('link', { name: /bibliothek/i }).click();
  await expect(page.locator('.panel-body, .empty').first()).toBeVisible();
}

/** Die zuletzt erschienene Meldung — es können mehrere übereinanderliegen. */
function letzteMeldung(page: Page) {
  return page.locator('.toast').last();
}

test.describe('Weg 1: Suchen, aufnehmen, wiederfinden', () => {
  test('ein gesuchter Titel landet in der gewählten Kategorie', async ({ page }) => {
    // Leere Bibliothek: was am Ende drinsteht, kann nur aus diesem Weg kommen.
    await mitBibliothek(page, []);
    await page.goto('/');
    await expect(page.locator('.app')).toBeVisible();

    // Die Suche ist der einzige Weg hinein — und muss mit der Tastatur gehen.
    await page.keyboard.press('/');
    const feld = page.getByPlaceholder(/suchen/i);
    await expect(feld).toBeFocused();
    await feld.fill('titel');

    // Die Attrappe antwortet auf jede Suche mit den Ids 31, 32, 33.
    const treffer = page.locator('.palhit').first();
    await treffer.waitFor({ state: 'visible', timeout: 10_000 });
    await treffer.click();

    // Detailseite des Treffers → aufnehmen.
    await expect(page.locator('.det__t')).toBeVisible();
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();

    // „Watchlist" stellt keine Rückfrage — ein Zwischenschritt ohne Frage
    // wäre nur ein Klick.
    await page.getByRole('radio', { name: /watchlist/i }).click();
    await expect(letzteMeldung(page)).toContainText(/hinzugefügt/i);

    // Und jetzt liegt er wirklich im Regal, nicht nur in einer Meldung.
    await zurBibliothek(page);
    await page.getByRole('tab', { name: /watchlist/i }).click();
    await expect(page.locator('.panel-body .card')).toHaveCount(1);
    await expect(page.locator('.panel-body')).toContainText('Titel 31');
  });

  test('was schon im Archiv liegt, ist in der Suche als solches markiert', async ({ page }) => {
    await mitBibliothek(page, [entryRow({ root_id: 31, seasons: [staffel(31)] })]);
    await page.goto('/');
    await expect(page.locator('.app')).toBeVisible();

    await page.keyboard.press('/');
    await page.getByPlaceholder(/suchen/i).fill('titel');

    const treffer = page.locator('.palhit').first();
    await treffer.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(treffer.locator('.palhit__mark')).toBeVisible();
  });
});

test.describe('Weg 2: die letzte Folge', () => {
  test('Episode +1 auf der letzten Folge schiebt den Eintrag nach „Geschaut"', async ({ page }) => {
    // Eine einzige Staffel, elf von zwölf Folgen — ein Druck fehlt.
    await mitBibliothek(page, [
      entryRow({ root_id: 71, status: 'watching', progress: 11, seasons: [staffel(71)] }),
    ]);
    await page.goto('/#/anime/71');
    await expect(page.locator('.det__t')).toBeVisible();

    const weiter = page.locator('.det__prog').getByRole('button', { name: /weiter/i });
    await expect(page.locator('.det__prog .stepper__val')).toHaveText('11');
    await weiter.click();
    await expect(page.locator('.det__prog .stepper__val')).toHaveText('12');

    // Der Knopf sperrt sich selbst: über die letzte Folge hinaus gibt es
    // nichts zu zählen.
    await expect(weiter).toBeDisabled();

    // Der Store leitet den Status ab — die Kategorie wechselt von allein.
    await zurBibliothek(page);
    await page.getByRole('tab', { name: /geschaut/i }).click();
    await expect(page.getByTestId('rank-row').first()).toContainText('Titel 71');
  });

  test('eine Folge zurück holt den Eintrag wieder heraus', async ({ page }) => {
    await mitBibliothek(page, [
      entryRow({ root_id: 72, status: 'completed', progress: 12, seasons: [staffel(72)] }),
    ]);
    await page.goto('/#/anime/72');
    await expect(page.locator('.det__t')).toBeVisible();

    await page.locator('.det__prog').getByRole('button', { name: /zurück/i }).click();
    await expect(page.locator('.det__prog .stepper__val')).toHaveText('11');

    await zurBibliothek(page);
    // Ausdrücklich AUF dem Geschaut-Reiter nachsehen: ohne den Klick landete
    // der Test auf irgendeinem leeren Reiter und zählte dort ebenfalls null —
    // grün, ohne etwas bewiesen zu haben.
    await page.getByRole('tab', { name: /geschaut/i }).click();
    // Der Eintrag steht wieder unter „Weiter schauen", und das zeigt die
    // Bibliothek bewusst gar nicht.
    await expect(page.getByTestId('rank-row')).toHaveCount(0);
    await expect(page.locator('.panel-body')).toContainText(/nichts/i);
  });
});

test.describe('Weg 3: die Sprache umstellen', () => {
  test('der Wechsel färbt die ganze App und überlebt einen Neustart', async ({ page }) => {
    await mitBibliothek(page, [entryRow({ root_id: 81, seasons: [staffel(81)] })]);
    await page.goto('/#/einstellungen');
    await expect(page.locator('.group').first()).toBeVisible();

    const leiste = page.locator('.tabbar, .rail').first();
    await expect(leiste).toContainText('Bibliothek');

    await page.locator('.langbar').getByRole('tab', { name: /englisch|english/i }).click();

    await expect(leiste).toContainText('Library');
    // `lang` am Wurzelelement ist kein Beiwerk: daran hängt die Silbentrennung
    // und was ein Vorleseprogramm für eine Sprache spricht.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.reload();
    await expect(page.locator('.tabbar, .rail').first()).toContainText('Library');
  });
});

test.describe('Weg 4: Sicherung raus und wieder herein', () => {
  test('was exportiert wurde, kommt nach dem Leeren vollständig zurück', async ({ page }) => {
    await mitBibliothek(page, [
      entryRow({ root_id: 91, status: 'watching', progress: 3, seasons: [staffel(91)] }),
      entryRow({ root_id: 92, status: 'completed', progress: 12, seasons: [staffel(92)] }),
    ]);
    await page.goto('/#/einstellungen');
    await expect(page.locator('.group').first()).toBeVisible();

    // ---- Export: die Datei wirklich abholen, nicht nur den Klick zählen.
    const [datei] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /exportieren/i }).click(),
    ]);
    const pfad = await datei.path();
    expect(pfad, 'Der Export hat keine Datei geliefert').toBeTruthy();
    expect(datei.suggestedFilename()).toMatch(/^tsugi-backup-\d{4}-\d{2}-\d{2}\.json$/);

    // ---- Leeren: die Bibliothek ist danach wirklich leer.
    await page.getByRole('button', { name: /archiv leeren/i }).click();
    await page.getByRole('button', { name: /ja, alles löschen/i }).click();

    await zurBibliothek(page);
    await expect(page.getByTestId('rank-row')).toHaveCount(0);

    // ---- Import: dieselbe Datei zurück in dieselbe App.
    await page.locator('.tabbar, .rail').first().getByRole('link', { name: /einstellungen/i }).click();
    await expect(page.locator('.group').first()).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(pfad!);
    await expect(letzteMeldung(page)).toContainText(/2 Einträge importiert/i);

    await zurBibliothek(page);
    await page.getByRole('tab', { name: /geschaut/i }).click();
    await expect(page.getByTestId('rank-row').first()).toContainText('Titel 92');
  });

  test('eine fremde JSON-Datei wird abgewiesen, statt die Bibliothek zu vergiften', async ({
    page,
  }) => {
    await mitBibliothek(page, [
      entryRow({ root_id: 93, status: 'completed', progress: 12, seasons: [staffel(93)] }),
    ]);
    await page.goto('/#/einstellungen');
    await expect(page.locator('.group').first()).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'fremd.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ app: 'etwas-anderes', entries: [] })),
    });
    await expect(letzteMeldung(page)).toContainText(/nicht|fehler|ungültig/i);

    // Und der Bestand steht noch.
    await zurBibliothek(page);
    await expect(page.getByTestId('rank-row')).toHaveCount(1);
  });
});
