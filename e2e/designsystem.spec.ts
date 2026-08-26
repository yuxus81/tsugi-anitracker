import { expect, test, warteAufBibliothek } from './fixtures';

/**
 * DAS DESIGNSYSTEM GEGEN TAILWIND.
 *
 * Die Bausteine aus `src/styles/` und Tailwinds Utilities teilen sich einen
 * Namensraum. Tailwind schreibt seine Utilities NACH unseren Importen — wo
 * ein Name doppelt vorkommt, gewinnt Tailwind, und ein Baustein sieht
 * plötzlich anders aus, ohne dass jemand ihn angefasst hat.
 *
 * Genau das ist mit `.ring` passiert: Tailwinds gleichnamige Utility malte
 * einen blauen Schlagschatten um jeden Fortschrittsring. Dieser Test hält
 * die Stelle fest und deckt die nächste Kollision auf, bevor sie im
 * Screenshot auffällt.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.app')).toBeVisible();
  await warteAufBibliothek(page);
});

test('der Fortschrittsring trägt keinen fremden Schlagschatten', async ({ page }) => {
  const schatten = await page
    .locator('.hero__ring svg.ring')
    .evaluate((el) => getComputedStyle(el).boxShadow);

  expect(schatten).toBe('none');
});

test('das Kartenraster behält seine Spaltenvorgabe', async ({ page }) => {
  // `.grid` heißt bei Tailwind ebenfalls etwas. Hier zählt, dass die
  // Spaltendefinition des Designsystems überlebt.
  const spalten = await page
    .locator('.panel-body .grid')
    .first()
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns);

  expect(spalten).not.toBe('none');
  expect(spalten.split(' ').length).toBeGreaterThan(1);
});

test('die Tokens sind geladen — sonst steht die ganze Farbwelt auf Standardwerten', async ({ page }) => {
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--bg').trim(),
      cy: s.getPropertyValue('--cy').trim(),
      pu: s.getPropertyValue('--pu').trim(),
      sl: s.getPropertyValue('--sl').trim(),
      tap: s.getPropertyValue('--tap').trim(),
      spring: s.getPropertyValue('--e-spring').trim(),
    };
  });

  expect(tokens.bg).toBe('#0d0f18');
  expect(tokens.cy).toBe('#00f5d4');
  expect(tokens.pu).toBe('#8a2be2');
  // `--sl` ist neu gegenüber dem alten Design — es trägt „Fortsetzung folgt".
  expect(tokens.sl).toBe('#64789f');
  expect(tokens.tap).toBe('44px');
  expect(tokens.spring).toBeTruthy();
});

test('jede Kategorie färbt sich wirklich anders', async ({ page }) => {
  const farben = await page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const out: Record<string, string> = {};
    for (const st of ['watching', 'nextup', 'planned', 'continuation', 'completed']) {
      probe.setAttribute('data-st', st);
      out[st] = getComputedStyle(probe).getPropertyValue('--tone').trim();
    }
    probe.remove();
    return out;
  });

  const werte = Object.values(farben);
  expect(werte.every(Boolean), `Kategorie ohne Farbe: ${JSON.stringify(farben)}`).toBe(true);
  expect(new Set(werte).size, `Zwei Kategorien teilen sich eine Farbe: ${JSON.stringify(farben)}`).toBe(5);
});

test('die Schrift ist Inter, Gezähltes läuft auf Mono', async ({ page }) => {
  const ui = await page.locator('.hero__title').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(ui.toLowerCase()).toContain('inter');

  const zahl = await page.locator('.hero__idx').evaluate((el) => getComputedStyle(el).fontVariantNumeric);
  expect(zahl).toContain('tabular-nums');
});
