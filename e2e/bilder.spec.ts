import { expect, test, warteAufBibliothek } from './fixtures';

/**
 * Belegbilder für die Zwischenabnahme. Kein Prüftest — der Lauf schreibt
 * Screenshots nach `e2e/bilder/`, damit die Richtung ohne eigenen
 * Dev-Server begutachtet werden kann.
 *
 * Bewusst KEIN Vergleich gegen hinterlegte Bilder: solange das Design noch
 * in Bewegung ist, wäre jeder Pixelvergleich nur ein Alarm bei jeder
 * gewollten Änderung.
 */

const GROESSEN = [
  { name: 'handy', width: 390, height: 780 },
  { name: 'handy-klein', width: 320, height: 640 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'laptop-flach', width: 1440, height: 720 },
  { name: 'desktop', width: 1920, height: 1080 },
];

for (const g of GROESSEN) {
  test(`Bilder ${g.name}`, async ({ page }) => {
    await page.setViewportSize({ width: g.width, height: g.height });
    await page.goto('/');
    await expect(page.locator('.app')).toBeVisible();
    await warteAufBibliothek(page);
    // Einlaufbewegungen der Karten abwarten, sonst friert das Bild mitten
    // in einer Animation ein.
    await page.waitForTimeout(900);

    await page.screenshot({ path: `e2e/bilder/${g.name}-home.png` });

    // Zweites Panel: „Watchlist" zeigt die Lila-Kategorie mit Fahne.
    await page.getByRole('tab', { name: /watchlist/i }).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `e2e/bilder/${g.name}-watchlist.png` });

    // ---- Etappe 3: die restlichen Bildschirme --------------------------
    for (const [datei, pfad, warteAuf] of [
      ['bibliothek', '#/bibliothek', '.ranklist'],
      ['entdecken', '#/entdecken', '.genrebar'],
      ['statistik', '#/statistik', '.tiles'],
      ['einstellungen', '#/einstellungen', '.group'],
    ] as const) {
      await page.goto(`/${pfad}`);
      await page.locator(warteAuf).first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `e2e/bilder/${g.name}-${datei}.png` });
    }

    // Bibliothek: die anderen beiden Kategorien tragen eigene Bauformen.
    await page.goto('/#/bibliothek');
    await page.locator('.ranklist').first().waitFor({ state: 'visible' });
    await page.getByRole('tab', { name: /fortsetzung folgt/i }).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `e2e/bilder/${g.name}-bibliothek-warten.png` });

    // Detailseite: Zeitstrahl, Fortschritt, Wertung an einem Stück.
    await page.goto('/#/anime/1');
    await page.locator('.det__head').waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `e2e/bilder/${g.name}-detail.png` });

    // Die Suche als Ebene über allem.
    await page.goto('/');
    await warteAufBibliothek(page);
    await page.keyboard.press('/');
    await page.locator('.pal').waitFor({ state: 'visible', timeout: 5_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/bilder/${g.name}-suche.png` });
  });
}
