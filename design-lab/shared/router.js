/**
 * Mini-Hash-Router + Bildschirm-Registry.
 *
 * Jede Version registriert ihre acht Bildschirme mit `defineScreens({...})`
 * und startet mit `startRouter({ mount, onChange })`. Der Router kennt keine
 * Version — er hält nur fest, welcher Schlüssel gerade dran ist, und ruft die
 * Zeichenfunktion. Übergänge (Ein-/Ausblenden) macht die Version selbst, weil
 * jede eine andere Bewegungssprache hat.
 */

const registry = new Map();
let currentKey = null;
let mountEl = null;
let onChange = null;
let fallback = 'home';

export function defineScreens(map) {
  for (const [key, fn] of Object.entries(map)) registry.set(key, fn);
}

export function screenKeys() {
  return [...registry.keys()];
}

export const currentScreen = () => currentKey;

function parse() {
  const raw = location.hash.replace(/^#\/?/, '').trim();
  const [key, ...rest] = raw.split('/');
  return { key: registry.has(key) ? key : fallback, params: rest };
}

function render() {
  const { key, params } = parse();
  const changed = key !== currentKey;
  currentKey = key;
  const fn = registry.get(key);
  if (!fn || !mountEl) return;

  const node = fn(params);
  mountEl.replaceChildren(node);
  // Bildschirmwechsel startet immer oben — sonst erbt der neue Bildschirm die
  // Scrollposition des alten und wirkt wie ein halb geladener Ausschnitt.
  if (changed) {
    const scroller = mountEl.closest('[data-scroll]') || mountEl;
    scroller.scrollTop = 0;
    if (scroller === document.documentElement || scroller === document.body) window.scrollTo(0, 0);
  }
  onChange?.(key, params);
}

export function startRouter(opts) {
  mountEl = opts.mount;
  onChange = opts.onChange ?? null;
  fallback = opts.fallback ?? 'home';
  window.addEventListener('hashchange', render);
  render();
}

export function go(key, ...params) {
  location.hash = `#/${[key, ...params].join('/')}`;
}

/** Neu zeichnen, ohne die Route zu wechseln (nach Zustandsänderung). */
export function refresh() {
  render();
}
