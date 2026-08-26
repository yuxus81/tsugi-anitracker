import { expect, scrollePane, test, warteAufBibliothek } from './fixtures';

/**
 * DER RAHMEN-BEWEIS.
 *
 * Kernthese des V5-Designs: die App ist ein Gerät, kein Dokument. Kopfleiste
 * und Tab-Leiste bewegen sich nie, gescrollt wird nur der Inhaltsbereich.
 *
 * Genau das kann jsdom nicht prüfen — es hat kein Layout und kennt kein
 * Scrollen. Deshalb steht dieser Beweis hier und nicht bei den
 * Komponententests.
 *
 * Gescrollt wird ausschließlich über `scrollePane()`: der Helfer bricht ab,
 * wenn es gar nichts zu scrollen gibt. Ohne ihn wären diese Tests grün,
 * sobald der Inhalt auf den Schirm passt — die Leisten stünden dann
 * trivialerweise still, und der Test hätte nichts gemessen. Genau so ist er
 * beim ersten Anlauf durchgerutscht.
 */

const HANDY = { width: 390, height: 780 };
const LAPTOP = { width: 1280, height: 800 };

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.app')).toBeVisible();
});

test('die Kopfleiste bleibt beim Scrollen an derselben Stelle', async ({ page }) => {
  // Ausdrücklich in Handy-Breite: ab 900 px ersetzt die Seitenschiene die
  // Kopfleiste ganz, dort gäbe es nichts zu messen.
  await page.setViewportSize(HANDY);
  await warteAufBibliothek(page);

  const topbar = page.locator('.topbar');
  await expect(topbar).toBeVisible();
  const vorher = await topbar.boundingBox();

  await scrollePane(page, 400);

  const nachher = await topbar.boundingBox();
  expect(nachher!.y).toBeCloseTo(vorher!.y, 0);
});

test('auch die Tab-Leiste unten bleibt beim Scrollen stehen', async ({ page }) => {
  await page.setViewportSize(HANDY);
  await warteAufBibliothek(page);

  const tabbar = page.locator('.tabbar');
  const vorher = await tabbar.boundingBox();

  await scrollePane(page, 400);

  const nachher = await tabbar.boundingBox();
  expect(nachher!.y).toBeCloseTo(vorher!.y, 0);
});

test('am Laptop bleibt die Seitenschiene stehen', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await warteAufBibliothek(page);

  const rail = page.locator('.rail');
  const vorher = await rail.boundingBox();

  await scrollePane(page, 400);

  const nachher = await rail.boundingBox();
  expect(nachher!.y).toBeCloseTo(vorher!.y, 0);
});

test('der Seitenkörper scrollt gar nicht — nur der Inhaltsbereich', async ({ page }) => {
  await page.setViewportSize(HANDY);
  await warteAufBibliothek(page);

  await scrollePane(page, 400);

  const koerper = await page.evaluate(() => ({
    fenster: window.scrollY,
    dokument: document.documentElement.scrollTop,
    body: document.body.scrollTop,
  }));

  expect(koerper.fenster).toBe(0);
  expect(koerper.dokument).toBe(0);
  expect(koerper.body).toBe(0);
});

test('es gibt nirgends waagerechtes Scrollen', async ({ page }) => {
  for (const breite of [320, 375, 390, 768, 900, 1280, 1920]) {
    await page.setViewportSize({ width: breite, height: 800 });
    await page.waitForTimeout(180);

    const ueberlauf = await page.evaluate(() => ({
      dokument: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pane: (() => {
        const el = document.querySelector('.pane');
        return el ? el.scrollWidth - el.clientWidth : 0;
      })(),
    }));

    expect(ueberlauf.dokument, `Seite läuft bei ${breite} px seitlich über`).toBeLessThanOrEqual(1);
    expect(ueberlauf.pane, `Inhaltsbereich läuft bei ${breite} px seitlich über`).toBeLessThanOrEqual(1);
  }
});

test('auch bei niedriger Fensterhöhe bleibt alles bedienbar', async ({ page }) => {
  // Kleine HÖHE ist Pflicht, nicht Kür: Laptops mit 1280×720 und geöffneter
  // Entwicklerkonsole landen schnell unter 700 px nutzbarer Höhe.
  for (const hoehe of [640, 700, 760, 900]) {
    await page.setViewportSize({ width: 1280, height: hoehe });
    await page.waitForTimeout(180);

    await expect(page.locator('.rail'), `Seitenschiene fehlt bei ${hoehe} px Höhe`).toBeVisible();

    const ueberlauf = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(ueberlauf, `seitlicher Überlauf bei ${hoehe} px Höhe`).toBeLessThanOrEqual(1);
  }
});

test('unter 900 px führt die Tab-Leiste, darüber die Seitenschiene', async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 800 });
  await page.waitForTimeout(180);
  await expect(page.locator('.tabbar')).toBeVisible();
  await expect(page.locator('.rail')).toBeHidden();

  await page.setViewportSize(LAPTOP);
  await page.waitForTimeout(180);
  await expect(page.locator('.rail')).toBeVisible();
  await expect(page.locator('.tabbar')).toBeHidden();
});

test('die Kopfleiste bekommt erst beim Scrollen ihre Kante', async ({ page }) => {
  await page.setViewportSize(HANDY);
  await warteAufBibliothek(page);

  const topbar = page.locator('.topbar');
  await expect(topbar).not.toHaveClass(/is-scrolled/);

  await scrollePane(page, 400);

  await expect(topbar).toHaveClass(/is-scrolled/);
});

test('die Kante verschwindet wieder, wenn man nach oben zurückkehrt', async ({ page }) => {
  await page.setViewportSize(HANDY);
  await warteAufBibliothek(page);
  const topbar = page.locator('.topbar');

  await scrollePane(page, 400);
  await expect(topbar).toHaveClass(/is-scrolled/);

  await page.locator('.pane').evaluate((el) => {
    el.scrollTop = 0;
  });

  await expect(topbar).not.toHaveClass(/is-scrolled/);
});

test('ein Bildschirmwechsel startet wieder oben', async ({ page }) => {
  await page.setViewportSize(HANDY);
  await warteAufBibliothek(page);

  await scrollePane(page, 400);
  // HashRouter: die Adresse steht hinter der Raute, nicht davor.
  await page.locator('.tabbar a[href="#/bibliothek"]').click();
  await page.waitForTimeout(300);

  expect(await page.locator('.pane').evaluate((el) => el.scrollTop)).toBe(0);
});

test('der Rahmen trägt auf jedem Bildschirm eine Farbrolle', async ({ page }) => {
  for (const pfad of ['/', '/#/entdecken', '/#/bibliothek', '/#/statistik', '/#/einstellungen']) {
    await page.goto(pfad);
    await expect(page.locator('.app')).toBeVisible();

    const st = await page.locator('.app').getAttribute('data-st');
    expect(st, `${pfad} ohne Farbrolle`).toBeTruthy();
  }
});
