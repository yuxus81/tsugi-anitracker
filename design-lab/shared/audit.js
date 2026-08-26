/**
 * Messwerkzeug — nicht Teil der Entwürfe, sondern der Beweis.
 *
 * Grundsatz: Ein Prüfwerkzeug, das zu wenig prüft, meldet auch „alles gut".
 * Deshalb zählt jeder Lauf mit, WIE VIELE Bedienelemente er angefasst hat.
 * Eine Zahl ohne Prüfanzahl ist keine Aussage.
 *
 * Aufruf in der Konsole der jeweiligen Version:
 *   const a = await import('/shared/audit.js'); await a.auditAll();
 */

const SEL_CTRL = 'button, a[href], input, select, textarea, [role="switch"], [role="tab"], [tabindex]:not([tabindex="-1"])';

const name = (el) => {
  const cls = String(el.className?.baseVal ?? el.className ?? '').trim().split(/\s+/).slice(0, 2).join('.');
  return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
};

/**
 * Liegt das Element in einem eigenen, seitlich scrollbaren Kasten (Poster-Reihe,
 * Chip-Leiste)? Dann darf es rausragen.
 *
 * WICHTIG: body und html zählen NICHT als solcher Kasten. Sie tragen fast immer
 * ein `overflow-x: hidden|clip` als Notbremse — zählte man sie mit, wäre jedes
 * Element „in einem Scroller" und die Überlaufprüfung meldete für immer null
 * Fehler. Genau so war es hier: die Prüfung war blind, bis das auffiel.
 */
function inScroller(el) {
  let p = el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    const o = getComputedStyle(p);
    if (o.overflowX === 'auto' || o.overflowX === 'scroll') return true;
    p = p.parentElement;
  }
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Prüft EINEN Bildschirm in der aktuellen Fenstergröße.
 * Scrollt die Seite in Schritten durch, damit auch Bedienelemente unterhalb
 * des Falzes wirklich per elementFromPoint getroffen werden — sonst prüft man
 * nur den ersten Bildschirm und meldet trotzdem „alles gut".
 */
export async function auditScreen(hash) {
  if (hash) { location.hash = hash.startsWith('#') ? hash : `#/${hash}`; await sleep(320); }
  const de = document.documentElement;
  const vw = de.clientWidth;
  // innerHeight statt clientHeight: Letzteres liefert im Quirks-Mode die
  // Dokumenthöhe und macht damit jede Trefferprüfung wertlos.
  const vh = Math.min(window.innerHeight, de.clientHeight || window.innerHeight);
  if (document.compatMode !== 'CSS1Compat') {
    console.warn('AUDIT: Seite läuft im Quirks-Mode — <!doctype html> fehlt.');
  }

  /* 1. Waagerechter Überlauf — außerhalb echter Scroller ist er immer ein Fehler. */
  const bleed = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if ((r.right > vw + 0.5 || r.left < -0.5) && !inScroller(el)) bleed.push(name(el));
  }

  /* 2. Jedes Bedienelement anfassen — in Etappen durch die ganze Seite. */
  const bar = [...document.querySelectorAll('.tabbar, .dock, .bar-bottom, [data-bottombar]')]
    .find((b) => getComputedStyle(b).display !== 'none' && getComputedStyle(b).visibility !== 'hidden');

  const seen = new Set();
  let checked = 0, hit = 0, inert = 0, unreachable = 0;
  const miss = [], small = [], covered = [];
  const startY = window.scrollY;

  /** Ein Element bewerten — setzt voraus, dass es gerade im Fenster liegt. */
  const test = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    // Randgenau ist noch drin — die Tab-Leiste sitzt exakt auf der Unterkante.
    if (r.top < 0 || r.bottom > vh) return false;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < 1 || cx > vw - 1 || cy < 1 || cy > vh - 1) return false;
    seen.add(el);

    // Unsichtbar (z. B. zugeklapptes Akkordeon): nicht anfassbar UND nicht
    // im Tabulator — also weder Treffer noch Fehler, sondern nicht vorhanden.
    if (getComputedStyle(el).visibility !== 'visible') { inert++; return true; }

    // Absichtlich taube Zustände (deaktiviert, ladend) dürfen keinen Treffer
    // liefern — sie werden getrennt gezählt, statt als Fehler zu erscheinen.
    if (el.disabled || el.getAttribute('aria-disabled') === 'true' ||
        el.classList.contains('is-loading') || getComputedStyle(el).pointerEvents === 'none') {
      inert++;
      return true;
    }
    checked++;

    const top = document.elementFromPoint(cx, cy);
    const ok = top && (el === top || el.contains(top) || top.closest?.(SEL_CTRL) === el);
    if (ok) hit++; else miss.push(`${name(el)} @${Math.round(cx)},${Math.round(cy)} → ${top ? name(top) : 'nichts'}`);

    // Touchziel: 44 px. Reine Textlinks im Fließtext sind ausgenommen —
    // sie sind Text, kein Bedienelement mit eigener Fläche.
    const isTextLink = el.tagName === 'A' && (el.classList.contains('small') || el.classList.contains('link'));
    if (!isTextLink && (r.height < 43.5 || r.width < 43.5) && !el.closest('.rating')) {
      small.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    // Unter der Tab-Leiste verschwunden?
    const barTop = bar ? bar.getBoundingClientRect().top : Infinity;
    if (bar && r.top > barTop - 1 && !bar.contains(el)) covered.push(name(el));
    return true;
  };

  /*
   * JEDES Bedienelement wird einzeln in die Fenstermitte gescrollt und dann
   * geprüft. Der frühere Etappen-Durchgang war zweimal falsch: er verpasste
   * alles, was auf einer Etappengrenze lag (bei 700 px Höhe die Hälfte), und
   * er meldete Elemente als „verdeckt", die nur GERADE hinter der Tab-Leiste
   * vorbeiscrollten. Die richtige Frage ist nicht „liegt es irgendwann unter
   * der Leiste", sondern „kommt der Nutzer da ran".
   */
  let present = 0;
  for (const el of document.querySelectorAll(SEL_CTRL)) {
    const r0 = el.getBoundingClientRect();
    if (r0.width <= 0 || r0.height <= 0) continue;   // ausgeblendet (z. B. Seitenschiene auf dem Handy)
    // Die Sprungmarke liegt absichtlich außerhalb des Bildes und wird erst
    // beim Fokus sichtbar — kein Fall für die Trefferprüfung.
    if (el.classList.contains('skip')) { inert++; present++; continue; }
    present++;
    const fixed = getComputedStyle(el).position === 'fixed' ||
      !!el.closest('.tabbar, .topbar, .rail, .scrim, .toast');
    if (!fixed) {
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      await sleep(28);
    }
    if (!test(el)) unreachable++;
  }

  window.scrollTo(0, startY);

  return {
    screen: (hash || location.hash).replace(/^#\/?/, '') || 'home',
    size: `${vw}×${vh}`,
    scrollW: de.scrollWidth,
    horizontalScroll: de.scrollWidth > vw + 0.5,
    bleedCount: bleed.length,
    bleed: [...new Set(bleed)].slice(0, 6),
    controlsTotal: present,
    controlsChecked: checked,
    controlsHit: hit,
    controlsInert: inert,
    controlsUnreachable: unreachable,
    missCount: miss.length,
    miss: miss.slice(0, 6),
    tooSmallCount: small.length,
    tooSmall: [...new Set(small)].slice(0, 8),
    underBarCount: covered.length,
    underBar: [...new Set(covered)].slice(0, 5),
  };
}

export const SCREENS = ['home', 'bibliothek', 'entdecken', 'detail', 'statistik', 'einstellungen', 'bausteine'];

export async function auditAll(screens = SCREENS) {
  const rows = [];
  for (const s of screens) rows.push(await auditScreen(s));
  const sum = rows.reduce((a, r) => ({
    total: a.total + r.controlsTotal,
    checked: a.checked + r.controlsChecked,
    hit: a.hit + r.controlsHit,
    inert: a.inert + r.controlsInert,
    unreachable: a.unreachable + r.controlsUnreachable,
    miss: a.miss + r.missCount,
    bleed: a.bleed + r.bleedCount,
    small: a.small + r.tooSmallCount,
    under: a.under + r.underBarCount,
  }), { total: 0, checked: 0, hit: 0, inert: 0, unreachable: 0, miss: 0, bleed: 0, small: 0, under: 0 });
  return { size: rows[0]?.size, rows, sum };
}

/* ---- Kontrast: WCAG AA gegen die tatsächlich gerenderten Farben ---------- */

function lum(rgb) {
  const f = rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
const parse = (c) => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

/** Alle deckenden Farbstopps eines Verlaufs — durchsichtige Schleier zählen nicht. */
function gradientStops(str) {
  const out = [];
  const re = /rgba?\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(str))) {
    const p = m[1].split(',').map((s) => parseFloat(s));
    const a = p.length > 3 ? p[3] : 1;
    if (a >= 0.5 && p.length >= 3) out.push([p[0], p[1], p[2]]);
  }
  return out;
}

/**
 * Mögliche Hintergründe hinter einem Text. Bei einem Verlauf sind das ALLE
 * deckenden Stopps — bewertet wird später der schlechteste. Ein fast
 * durchsichtiger Schleier (wie die Holzmaserung auf body) wird übersprungen,
 * sonst wäre jede Messung „nicht bestimmbar" und damit wertlos.
 * Bilder (Cover, Banner) bleiben ehrlich unbestimmbar.
 */
function bgCandidates(el) {
  let p = el;
  while (p && p !== document.documentElement) {
    const cs = getComputedStyle(p);
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') {
      if (/url\(/.test(bi)) return null;         // echtes Bild: nicht messbar
      const s = gradientStops(bi);
      if (s.length) return s;                     // deckender Verlauf
    }
    const c = cs.backgroundColor;
    const v = parse(c);
    const alpha = /rgba/.test(c) ? parseFloat(c.split(',')[3]) : 1;
    if (v.length === 3 && alpha > 0.85) return [v];
    p = p.parentElement;
  }
  const b = parse(getComputedStyle(document.body).backgroundColor);
  return b.length === 3 ? [b] : null;
}

export function auditContrast(min = 4.5) {
  const bad = [];
  const unmeasured = [];
  let checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    // Deaktivierte Bedienelemente sind von der Kontrastregel ausgenommen (WCAG 1.4.3).
    if (el.closest('[disabled], [aria-disabled="true"]')) continue;
    // Durchsichtiger Text (z. B. ladender Knopf) ist kein Kontrastfall.
    if (/rgba/.test(cs.color) && parseFloat(cs.color.split(',')[3]) < 0.1) continue;
    const fg = parse(cs.color);
    const bgs = bgCandidates(el);
    if (!bgs || fg.length < 3) {
      unmeasured.push(`${name(el)} „${el.textContent.trim().slice(0, 22)}"`);
      continue;
    }
    checked++;
    const l1 = lum(fg);
    // Bewertet wird der SCHLECHTESTE Stopp — nicht der schmeichelhafteste.
    const ratio = Math.min(...bgs.map((bg) => {
      const l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }));
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : min;
    if (ratio < need) {
      bad.push(`${name(el)} ${ratio.toFixed(2)}:1 (nötig ${need}) „${el.textContent.trim().slice(0, 24)}"`);
    }
  }
  return {
    checked,
    failCount: bad.length,
    fails: bad.slice(0, 12),
    unmeasuredCount: unmeasured.length,
    unmeasured: [...new Set(unmeasured)].slice(0, 10),
  };
}

/** Bleiben die geneigten Flächen scharf? (Avathai-Falle: translateZ + will-change) */
export function auditTilt() {
  const found = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (/translateZ|translate3d\([^)]*[^0]px\)/.test(cs.transform)) found.push(`${name(el)} transform:${cs.transform.slice(0, 40)}`);
    if (cs.willChange && cs.willChange !== 'auto') found.push(`${name(el)} will-change:${cs.willChange}`);
  }
  return { risky: found.length, items: found.slice(0, 8) };
}
