/**
 * Winziger DOM-Helfer — kein Framework, absichtlich.
 *
 * h('div.card', { onclick }, ...kinder)  →  HTMLElement
 * Der Tag darf Klassen als Suffix tragen ('button.btn.primary'), weil die
 * Entwürfe fast nur aus Klassen bestehen und das den Code lesbar hält.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
  'svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon',
  'defs', 'linearGradient', 'radialGradient', 'stop', 'ellipse', 'text',
  'clipPath', 'mask', 'filter', 'feGaussianBlur', 'use', 'tspan', 'pattern',
]);

function apply(el, props) {
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class' || k === 'className') {
      el.setAttribute('class', [el.getAttribute('class'), v].filter(Boolean).join(' '));
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k === 'dataset') {
      Object.assign(el.dataset, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v);
    } else if (k === 'html') {
      el.innerHTML = v;
    } else if (k === 'ref' && typeof v === 'function') {
      v(el);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
}

function append(el, kids) {
  for (const kid of kids) {
    if (kid === null || kid === undefined || kid === false || kid === true) continue;
    if (Array.isArray(kid)) { append(el, kid); continue; }
    el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}

export function h(spec, props, ...kids) {
  const [tag, ...classes] = String(spec).split('.');
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag || 'div');
  if (classes.length) el.setAttribute('class', classes.join(' '));

  if (props && (props instanceof Node || Array.isArray(props) || typeof props !== 'object')) {
    append(el, [props, ...kids]);
  } else {
    if (props) apply(el, props);
    append(el, kids);
  }
  return el;
}

/** Fragment, damit Listen ohne Wrapper-Div zurückgegeben werden können. */
export function frag(...kids) {
  const f = document.createDocumentFragment();
  append(f, kids);
  return f;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** Zahl mit deutschem Tausenderpunkt — überall dort, wo gezählt wird. */
export const num = (n) => Number(n).toLocaleString('de-DE');

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Nutzer will keine Bewegung? Dann liefern alle Animationshelfer sofort das Ziel. */
export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Zeiger-Effekte (Neigung, Lichtwanderung) gibt es NUR mit echter Maus.
 * Auf Touch würden sie nie ausgelöst und kosten nur Rechenzeit.
 */
export const finePointer = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Neigung auf Zeigerbewegung. BEWUSST ohne translateZ: die Unschärfe im
 * Avathai-Projekt kam von translateZ + will-change, nicht von der Neigung.
 */
export function tiltOn(el, { max = 7, scale = 1 } = {}) {
  if (!finePointer() || reducedMotion()) return;
  let raf = 0;
  const move = (ev) => {
    const r = el.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width - 0.5;
    const py = (ev.clientY - r.top) / r.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100 + 50).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100 + 50).toFixed(1)}%`);
      el.style.setProperty('--tilt-scale', String(scale));
    });
  };
  const leave = () => {
    if (raf) cancelAnimationFrame(raf);
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--tilt-scale', '1');
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
}

/** Zahl hochzählen — für Stepper und Statistik. Respektiert reduzierte Bewegung. */
export function countTo(el, from, to, ms = 420, fmt = (v) => String(Math.round(v))) {
  // Zielwert SOFORT setzen, erst danach animieren. Sonst hängt der angezeigte
  // Wert daran, dass requestAnimationFrame läuft — in einem nicht sichtbaren
  // Tab tut es das nicht, und die Zahl bliebe für immer stehen.
  el.textContent = fmt(to);
  if (reducedMotion() || from === to) return;
  const t0 = performance.now();
  const step = (t) => {
    const p = clamp((t - t0) / ms, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
