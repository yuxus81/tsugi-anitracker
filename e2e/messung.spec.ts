import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * DAS MESSWERKZEUG.
 *
 * Sieben Größen, sechs Ansichten, drei Fragen, die eine Website beantworten
 * muss, bevor sie jemand in die Hand bekommt:
 *
 *  1. Läuft irgendwo etwas waagerecht über? (Außer dort, wo eine Leiste
 *     absichtlich seitlich scrollt.)
 *  2. Liegt jedes Bedienelement selbst obenauf — oder deckt etwas es zu?
 *     Ein Knopf, der aussieht wie ein Knopf und nicht reagiert, ist
 *     schlimmer als kein Knopf.
 *  3. Ist jedes Bedienelement groß genug für einen Daumen? Ausnahmen gibt es,
 *     aber nur benannte.
 *
 * Dazu die Kontrastprüfung über axe.
 *
 * ZWEI REGELN, aus zwei schon zugeschnappten Fallen:
 *
 * - **Kleine HÖHEN sind Pflicht, nicht Kür.** Ein 1280×720-Laptop ist keine
 *   Randgröße; genau dort klemmen fixe Kopf- und Tab-Leisten den Inhalt ein.
 * - **Der Test meldet, wie viele Elemente er angefasst hat.** Ein Prüfwerkzeug,
 *   das zu wenig prüft, meldet sonst fröhlich „alles gut". Bleibt die Zahl
 *   unter der Untergrenze, fällt der Test — auch wenn er nichts gefunden hat.
 *
 * Gemessen wird komplett IM Browser (ein `page.evaluate` je Ansicht). Ein
 * Locator-Aufruf je Element wären bei 7 × 6 Ansichten Tausende Rundreisen —
 * der Lauf würde so lang, dass ihn niemand mehr fährt.
 */

const GROESSEN = [
  { name: 'Handy klein', width: 375, height: 667 },
  { name: 'Handy', width: 375, height: 812 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop flach', width: 1280, height: 720 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Laptop breit', width: 1440, height: 760 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

const ANSICHTEN = [
  { name: 'Home', pfad: '/', warteAuf: '.card' },
  { name: 'Bibliothek', pfad: '/#/bibliothek', warteAuf: '.ranklist' },
  { name: 'Entdecken', pfad: '/#/entdecken', warteAuf: '.genrebar' },
  { name: 'Statistik', pfad: '/#/statistik', warteAuf: '.tiles' },
  { name: 'Einstellungen', pfad: '/#/einstellungen', warteAuf: '.group' },
  { name: 'Detail', pfad: '/#/anime/1', warteAuf: '.det__t' },
];

/**
 * Die BENANNTE Ausnahmeliste für Touchziele.
 *
 * Jede Zeile ist eine bewusste Entscheidung mit einem Grund. Steht ein zu
 * kleines Element NICHT auf dieser Liste, fällt der Test — das ist der ganze
 * Sinn der Liste. Sie wächst nur mit einer Begründung daneben.
 *
 * REIHENFOLGE ZÄHLT: die erste passende Zeile gewinnt, also steht das
 * Speziellere oben. Der Hero-Pfeil IST ein kleiner Symbolknopf — stünde die
 * allgemeine Zeile zuerst, verlangte der Test von ihm 40 px.
 */
const AUSNAHMEN = [
  {
    name: 'Wertungs-Pip',
    treffer: '.pip',
    minBreite: 30,
    minHoehe: 44,
    // Zehn Stufen nebeneinander bräuchten 440 px Breite — das hat kein
    // Handy. Volle Höhe plus Rasterung: daneben liegt immer der Nachbarwert,
    // nie ein Leerraum.
  },
  {
    name: 'Schalter',
    treffer: '.switch',
    minBreite: 52,
    minHoehe: 31,
    // Der Schieber selbst ist 52×31, die anfassbare ZEILE (.switchrow /
    // .setrow) ist 44+ px hoch — die trägt das Touchziel.
  },
  {
    name: 'Hero-Pfeil',
    treffer: '.hero__switch .iconbtn',
    minBreite: 28,
    minHoehe: 28,
    // Zwei Pfeile im Titelkopf, die nur durchblättern. Verfehlen kostet
    // nichts: daneben liegt der andere Pfeil oder toter Raum.
  },
  {
    name: 'kleiner Symbolknopf',
    treffer: '.iconbtn--sm',
    minBreite: 40,
    minHoehe: 40,
    // 40 px in ruhigen Ecken (Kopfleiste, Blattfuß), nie in einer Reihe
    // dicht nebeneinander.
  },
];

/** Leisten, die absichtlich seitlich scrollen — dort ist Überstand gewollt. */
const SEITLICHE_LEISTEN = '.shelf, .genrebar, .pal__list';

/** Untergrenze je Ansicht: darunter hat das Werkzeug zu wenig angefasst. */
const MINDESTENS_GEPRUEFT: Record<string, number> = {
  Home: 12,
  Bibliothek: 10,
  Entdecken: 10,
  Statistik: 4,
  Einstellungen: 8,
  Detail: 8,
};

interface Fund {
  beschreibung: string;
  breite?: number;
  hoehe?: number;
  regel?: string;
  stattdessen?: string;
}

interface Messwert {
  geprueft: number;
  uebersprungen: number;
  klein: Fund[];
  verdeckt: Fund[];
  ueberstand: Fund[];
  seiteBreiter: number;
}

async function zurAnsicht(page: Page, pfad: string, warteAuf: string) {
  await page.goto(pfad);
  await page.locator(warteAuf).first().waitFor({ state: 'visible', timeout: 15_000 });
  // Einlaufbewegungen abwarten: mitten in einer Transform gemessene Kästen
  // sind verschoben, und `elementFromPoint` trifft dann daneben.
  await page.waitForTimeout(800);
}

async function miss(page: Page): Promise<Messwert> {
  return page.evaluate(
    ({ ausnahmen, leisten }) => {
      const BEDIENBAR =
        'button, a[href], input:not([type="hidden"]), select, textarea, [role="tab"], [role="switch"], [role="button"]';

      function beschreibe(el: Element | null): string {
        if (!el) return '(nichts)';
        const klassen = typeof el.className === 'string' ? el.className.trim().split(/\s+/) : [];
        const text = (el.textContent ?? '').trim().slice(0, 24);
        return `${el.tagName.toLowerCase()}${klassen.length ? '.' + klassen.join('.') : ''}${
          text ? ` „${text}"` : ''
        }`;
      }

      function sichtbar(el: Element): boolean {
        const s = getComputedStyle(el);
        return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
      }

      /**
       * Liegt das Element in einer seitlich scrollenden Leiste?
       *
       * Der Aufstieg endet an der Leiste ODER am Inhaltsbereich — NICHT am
       * `body`. Liefe er bis dorthin durch, wäre irgendwann alles „in einem
       * Scroller" und der Überstands-Test hätte sich selbst abgeschaltet.
       */
      function inLeiste(el: Element): boolean {
        let p: Element | null = el;
        while (p && !p.matches('.pane, body')) {
          if (p.matches(leisten)) return true;
          p = p.parentElement;
        }
        return false;
      }

      const wert = {
        geprueft: 0,
        uebersprungen: 0,
        klein: [] as Array<Record<string, unknown>>,
        verdeckt: [] as Array<Record<string, unknown>>,
        ueberstand: [] as Array<Record<string, unknown>>,
        seiteBreiter: 0,
      };

      // ---- 1. Waagerechter Überlauf ------------------------------------
      const wurzel = document.documentElement;
      wert.seiteBreiter = Math.max(
        wurzel.scrollWidth - wurzel.clientWidth,
        ...[...document.querySelectorAll('.pane')].map((p) => p.scrollWidth - p.clientWidth),
      );

      for (const el of document.querySelectorAll<HTMLElement>('.pane *')) {
        if (!sichtbar(el) || inLeiste(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > window.innerWidth + 1 || r.left < -1) {
          wert.ueberstand.push({
            beschreibung: beschreibe(el),
            breite: Math.round(r.width),
            hoehe: Math.round(r.right - window.innerWidth),
          });
        }
      }

      // ---- 2. + 3. Bedienelemente --------------------------------------
      for (const el of document.querySelectorAll<HTMLElement>(BEDIENBAR)) {
        // `.visually-hidden` ist 1×1 px und geklippt — ein absichtliches
        // Muster für Vorleseprogramme (der Datei-Dialog beim Import hängt
        // daran). Es misst nichts und deckt nichts zu.
        if (!sichtbar(el) || el.matches('.visually-hidden')) {
          wert.uebersprungen += 1;
          continue;
        }
        const kasten = el.getBoundingClientRect();
        if (kasten.width === 0 || kasten.height === 0) {
          wert.uebersprungen += 1;
          continue;
        }

        // Touchziel — Standard 44 px, sonst die benannte Ausnahme.
        const regel = ausnahmen.find((a) => el.matches(a.treffer));
        const minBreite = regel ? regel.minBreite : 44;
        const minHoehe = regel ? regel.minHoehe : 44;
        if (kasten.width + 0.5 < minBreite || kasten.height + 0.5 < minHoehe) {
          wert.klein.push({
            beschreibung: beschreibe(el),
            breite: Math.round(kasten.width),
            hoehe: Math.round(kasten.height),
            regel: regel ? `${regel.name} (${regel.minBreite}×${regel.minHoehe})` : 'Standard 44×44',
          });
        }

        // Obenauf — erst in den sichtbaren Bereich holen, dann NEU messen.
        // `instant`, weil eine weiche Bewegung erst nach dem Messen ankäme.
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        const jetzt = el.getBoundingClientRect();
        const x = jetzt.left + jetzt.width / 2;
        const y = jetzt.top + jetzt.height / 2;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
          wert.uebersprungen += 1;
          continue;
        }
        const oben = document.elementFromPoint(x, y);

        // Zwei Fälle, in denen „liegt nicht obenauf" richtig ist:
        //
        // - Ein gesperrter Knopf nimmt in Chrome keine Zeigerereignisse an,
        //   also meldet `elementFromPoint` seinen Elternteil. Genau so soll
        //   es sein; er ist bewusst tot.
        // - Eine Meldung (`.toast`) legt sich für gut drei Sekunden über den
        //   Blattfuß. Das ist ihr Zweck. Ob sie an der richtigen Stelle
        //   steht, ist eine andere Frage als die hier gestellte.
        const gesperrt = (el as HTMLButtonElement).disabled === true;
        const meldungDrueber = !!oben?.closest('.toast');
        if (gesperrt || meldungDrueber) {
          wert.uebersprungen += 1;
          continue;
        }

        if (!oben || !el.contains(oben)) {
          wert.verdeckt.push({ beschreibung: beschreibe(el), stattdessen: beschreibe(oben) });
        }
        wert.geprueft += 1;
      }

      return wert;
    },
    { ausnahmen: AUSNAHMEN, leisten: SEITLICHE_LEISTEN },
  ) as Promise<Messwert>;
}

function alsListe(funde: Fund[]): string {
  return funde
    .map(
      (f) =>
        `\n  · ${f.beschreibung}` +
        (f.breite !== undefined ? ` — ${f.breite}×${f.hoehe} px, verlangt: ${f.regel ?? '—'}` : '') +
        (f.stattdessen ? ` — obenauf liegt stattdessen: ${f.stattdessen}` : ''),
    )
    .join('');
}

for (const g of GROESSEN) {
  test(`${g.name} (${g.width}×${g.height}) hält alle drei Regeln`, async ({ page }) => {
    await page.setViewportSize({ width: g.width, height: g.height });

    let gesamt = 0;
    for (const a of ANSICHTEN) {
      await zurAnsicht(page, a.pfad, a.warteAuf);
      const m = await miss(page);

      expect(
        m.seiteBreiter,
        `${a.name}: die Seite scrollt ${m.seiteBreiter} px waagerecht`,
      ).toBeLessThanOrEqual(1);

      expect(
        m.ueberstand,
        `${a.name}: ragt aus dem Schirm heraus${alsListe(m.ueberstand)}`,
      ).toEqual([]);

      expect(
        m.verdeckt,
        `${a.name}: verdeckte Bedienelemente${alsListe(m.verdeckt)}`,
      ).toEqual([]);

      expect(m.klein, `${a.name}: zu kleine Touchziele${alsListe(m.klein)}`).toEqual([]);

      // Der Nachweis, dass überhaupt gemessen wurde.
      expect(
        m.geprueft,
        `${a.name}: nur ${m.geprueft} Bedienelemente angefasst — das beweist nichts`,
      ).toBeGreaterThanOrEqual(MINDESTENS_GEPRUEFT[a.name]);

      gesamt += m.geprueft;
      console.log(
        `  ${g.name} · ${a.name}: ${m.geprueft} Bedienelemente geprüft ` +
          `(${m.uebersprungen} ausgeblendet/außerhalb)`,
      );
    }

    console.log(`  ${g.name}: ${gesamt} Bedienelemente über ${ANSICHTEN.length} Ansichten geprüft`);
    expect(gesamt, 'Insgesamt zu wenig gemessen').toBeGreaterThanOrEqual(60);
  });
}

/**
 * Kontrast und Barrierefreiheit über axe — an den beiden Enden der Skala.
 *
 * Nicht auf allen sieben Größen: axe braucht je Lauf mehrere Sekunden, und
 * die Regeln, die hier greifen (Kontrast, Namen, Rollen), hängen nicht an
 * der Breite. Was an der Breite hängt, misst der Test darüber.
 */
for (const g of [GROESSEN[0], GROESSEN[4]]) {
  for (const a of ANSICHTEN) {
    test(`${a.name} auf ${g.name} besteht die axe-Prüfung`, async ({ page }) => {
      await page.setViewportSize({ width: g.width, height: g.height });
      await zurAnsicht(page, a.pfad, a.warteAuf);

      const ergebnis = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const befunde = ergebnis.violations.map(
        (v) => `\n  · [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}×)` +
          v.nodes.map((n) => `\n      ${n.target.join(' ')}`).join(''),
      );

      expect(ergebnis.violations, `axe-Befunde auf ${a.name}${befunde.join('')}`).toEqual([]);
      console.log(`  ${g.name} · ${a.name}: axe geprüft, ${ergebnis.passes.length} Regeln bestanden`);
    });
  }
}
