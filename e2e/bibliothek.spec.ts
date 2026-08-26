import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * DIE BIBLIOTHEK IM ECHTEN BROWSER.
 *
 * jsdom hat kein Layout — es kann nicht sagen, ob eine Beschriftung aus
 * ihrer Fläche ragt oder ob eine Zahl abgeschnitten wird. Nur hier lässt
 * sich das messen.
 *
 * Die Auswahlleiste gibt auf schmalen Geräten bewusst etwas auf, und zwar
 * in dieser Reihenfolge: erst die Zähler (< 480 px), dann die Zeichen
 * (< 420 px). Was NIE weichen darf, ist der Name — an ihm erkennt man die
 * Kategorie. Genau diese Rangfolge halten die Tests hier fest, damit sie
 * nicht beim nächsten Umbau still umkippt.
 */

async function zurBibliothek(page: Page) {
  await page.goto('/#/bibliothek');
  await page.locator('.ranklist').first().waitFor({ state: 'visible', timeout: 10_000 });
}

const GROESSEN = [
  { name: 'handy klein', width: 320, height: 640, zaehler: false, zeichen: false },
  { name: 'handy', width: 390, height: 780, zaehler: false, zeichen: false },
  { name: 'phablet', width: 460, height: 900, zaehler: false, zeichen: true },
  { name: 'tablet', width: 768, height: 1024, zaehler: true, zeichen: true },
  { name: 'laptop', width: 1280, height: 800, zaehler: true, zeichen: true },
];

for (const g of GROESSEN) {
  test(`auf ${g.name} bleibt jede Beschriftung IN ihrer Fläche`, async ({ page }) => {
    await page.setViewportSize({ width: g.width, height: g.height });
    await zurBibliothek(page);

    const tabs = page.getByRole('tab');
    expect(await tabs.count(), 'Es müssen drei Kategorien zu sehen sein').toBe(3);

    let geprueft = 0;
    for (let i = 0; i < 3; i++) {
      const tab = tabs.nth(i);
      const aussen = (await tab.boundingBox())!;
      const kinder = tab.locator(':scope > *');

      for (let k = 0; k < (await kinder.count()); k++) {
        const box = await kinder.nth(k).boundingBox();
        // Kein Kasten = per CSS ausgeblendet. Das ist eine Entscheidung,
        // kein Fehler — sie wird weiter unten eigens geprüft.
        if (!box || box.width === 0) continue;
        geprueft += 1;
        const name = (await tab.innerText()).replace(/\n/g, ' ');
        expect(box.x + box.width, `„${name}": Teil ${k} ragt rechts heraus`).toBeLessThanOrEqual(
          aussen.x + aussen.width + 1,
        );
        expect(box.x, `„${name}": Teil ${k} ragt links heraus`).toBeGreaterThanOrEqual(
          aussen.x - 1,
        );
      }
    }

    // Ein Messwerkzeug, das nichts angefasst hat, meldet auch „alles gut".
    // Drei Namen sind das Minimum, das auf JEDER Größe stehen bleiben muss.
    expect(geprueft, 'Zu wenig gemessen — der Test würde nichts beweisen').toBeGreaterThanOrEqual(3);
    console.log(`  ${g.name} (${g.width}px): ${geprueft} sichtbare Teile in den Tabs geprüft`);
  });

  test(`auf ${g.name} bleibt der Kategorie-NAME in jedem Fall lesbar`, async ({ page }) => {
    await page.setViewportSize({ width: g.width, height: g.height });
    await zurBibliothek(page);

    for (const name of [/geschaut/i, /fortsetzung folgt/i, /watchlist/i]) {
      const beschriftung = page.getByRole('tab', { name }).locator('span').first();
      const box = await beschriftung.boundingBox();
      expect(box?.width ?? 0, `Der Name ${name} ist auf ${g.width} px verschwunden`).toBeGreaterThan(
        20,
      );
    }
  });

  test(`auf ${g.name} stimmt die Rangfolge dessen, was weichen darf`, async ({ page }) => {
    await page.setViewportSize({ width: g.width, height: g.height });
    await zurBibliothek(page);

    const geschaut = page.getByRole('tab', { name: /geschaut/i });

    const zaehlerBreit = (await geschaut.locator('.seg__count').boundingBox())?.width ?? 0;
    expect(zaehlerBreit > 0, `Zähler auf ${g.width} px`).toBe(g.zaehler);

    const zeichenBreit = (await geschaut.locator('svg').first().boundingBox())?.width ?? 0;
    expect(zeichenBreit > 0, `Zeichen auf ${g.width} px`).toBe(g.zeichen);
  });
}

test('eine leere Kategorie zeigt gar keine Zahl — eine 0 wäre nur Rauschen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await zurBibliothek(page);

  await expect(
    page.getByRole('tab', { name: /fortsetzung folgt/i }).locator('.seg__count'),
  ).toHaveCount(0);
});

test('die Rangliste zählt durch und der Greifpunkt ist erreichbar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await zurBibliothek(page);

  const zeilen = page.getByTestId('rank-row');
  expect(await zeilen.count()).toBeGreaterThan(2);

  await expect(zeilen.first().getByRole('button')).toBeVisible();
  await expect(zeilen.first().getByTestId('rank')).toHaveText('1');
});
