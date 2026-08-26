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
  });
}
