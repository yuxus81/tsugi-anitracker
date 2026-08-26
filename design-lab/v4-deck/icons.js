/**
 * V4 „Deck" — Icon-Satz.
 *
 * Regel dieser Version: „lit" — die Form ist massiv gefüllt UND trägt eine
 * hellere Kontur, so wie ein beleuchteter Knopf aus dunklem Kunststoff mit
 * einer Leuchtkante. Inaktiv ist dieselbe Form nur als Kontur, ohne Licht.
 * Metaphern aus dem Stapel: Karte, Fächer, Siegel, Impuls.
 *
 * Keine Emojis, keine Unicode-Symbole — alles SVG-Pfade.
 */

const NS = 'http://www.w3.org/2000/svg';

const P = {
  /* ---- Navigation ---- */
  /* Start = eine Karte vorn im Stapel. */
  deck: {
    o: '<rect x="7.4" y="4.2" width="12.4" height="16.6" rx="2.6"/><path d="M4.2 7.4v11a2.6 2.6 0 0 0 2.6 2.6"/>',
    f: '<rect x="7.4" y="4.2" width="12.4" height="16.6" rx="2.6"/><path d="M4.2 7.4v11a2.6 2.6 0 0 0 2.6 2.6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  },
  /* Bibliothek = aufgefächerte Karten. */
  fan: {
    o: '<rect x="9.4" y="5.6" width="10.4" height="14" rx="2.2"/><rect x="4.6" y="8" width="4.4" height="11.6" rx="1.8"/>',
    f: '<rect x="9.4" y="5.6" width="10.4" height="14" rx="2.2"/><rect x="4.6" y="8" width="4.4" height="11.6" rx="1.8"/>',
  },
  /* Entdecken = Impuls / Funkwelle. */
  pulse: {
    o: '<circle cx="12" cy="12" r="2.8"/><path d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 7.4a6.5 6.5 0 0 1 0 9.2"/><path d="M4.2 4.2a11 11 0 0 0 0 15.6M19.8 4.2a11 11 0 0 1 0 15.6"/>',
    f: '<circle cx="12" cy="12" r="3.2"/><path d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 7.4a6.5 6.5 0 0 1 0 9.2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M4.2 4.2a11 11 0 0 0 0 15.6M19.8 4.2a11 11 0 0 1 0 15.6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>',
  },
  /* Statistik = Balken mit Leuchtspitze. */
  bars: {
    o: '<rect x="3.6" y="12.4" width="4.2" height="7.6" rx="1.4"/><rect x="9.9" y="7.6" width="4.2" height="12.4" rx="1.4"/><rect x="16.2" y="3.6" width="4.2" height="16.4" rx="1.4"/>',
    f: '<rect x="3.6" y="12.4" width="4.2" height="7.6" rx="1.4"/><rect x="9.9" y="7.6" width="4.2" height="12.4" rx="1.4"/><rect x="16.2" y="3.6" width="4.2" height="16.4" rx="1.4"/>',
  },
  /* Einstellungen = Regler. */
  dial: {
    o: '<circle cx="12" cy="12" r="8.4"/><path d="M12 6.6V12l3.4 2.2"/>',
    f: '<circle cx="12" cy="12" r="8.4"/><path d="M12 6.8V12l3.3 2.1" stroke="var(--knock, #0d0f18)" stroke-width="2.1" fill="none" stroke-linecap="round"/>',
  },

  /* ---- Aktionen ---- */
  play: {
    o: '<path d="M8.6 5.9v12.2a1 1 0 0 0 1.52.85l9.7-6.1a1 1 0 0 0 0-1.7l-9.7-6.1a1 1 0 0 0-1.52.85Z"/>',
    f: '<path d="M8.6 5.9v12.2a1 1 0 0 0 1.52.85l9.7-6.1a1 1 0 0 0 0-1.7l-9.7-6.1a1 1 0 0 0-1.52.85Z"/>',
  },
  pause: { o: '<rect x="6.8" y="4.8" width="3.6" height="14.4" rx="1.8"/><rect x="13.6" y="4.8" width="3.6" height="14.4" rx="1.8"/>', f: '<rect x="6.8" y="4.8" width="3.6" height="14.4" rx="1.8"/><rect x="13.6" y="4.8" width="3.6" height="14.4" rx="1.8"/>' },
  plus: { o: '<path d="M12 4.8v14.4M4.8 12h14.4"/>' },
  minus: { o: '<path d="M4.8 12h14.4"/>' },
  check: {
    o: '<path d="m4.8 12.6 4.8 4.8 9.6-10.8"/>',
    f: '<circle cx="12" cy="12" r="9.4"/><path d="m7.6 12.2 3.1 3.1 5.7-6.4" stroke="var(--knock, #0d0f18)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  x: { o: '<path d="M6 6l12 12M18 6 6 18"/>' },
  left: { o: '<path d="M14.6 5.2 7.8 12l6.8 6.8"/>' },
  right: { o: '<path d="M9.4 5.2 16.2 12l-6.8 6.8"/>' },
  down: { o: '<path d="M5.2 9.4 12 16.2l6.8-6.8"/>' },
  arrow: { o: '<path d="M4.4 12h15.2M13 5.6 19.6 12 13 18.4"/>' },
  find: { o: '<circle cx="10.6" cy="10.6" r="6.8"/><path d="m15.6 15.6 4.6 4.6"/>' },
  dots: { o: '<circle cx="5.2" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="18.8" cy="12" r="1.8" fill="currentColor" stroke="none"/>' },
  clock: {
    o: '<circle cx="12" cy="12" r="8.4"/><path d="M12 6.8V12l3.4 2.1"/>',
    f: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5.1l3.3 2" stroke="var(--knock, #0d0f18)" stroke-width="2.1" fill="none" stroke-linecap="round"/>',
  },
  /* Siegel = abgelegte Karte. */
  seal: {
    o: '<path d="M12 3.2 20 7v6.2c0 4.2-3.2 7.4-8 8.6-4.8-1.2-8-4.4-8-8.6V7Z"/><path d="m8.8 12.2 2.2 2.2 4.4-4.8"/>',
    f: '<path d="M12 3.2 20 7v6.2c0 4.2-3.2 7.4-8 8.6-4.8-1.2-8-4.4-8-8.6V7Z"/><path d="m8.6 12.2 2.3 2.3 4.6-5" stroke="var(--knock, #0d0f18)" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  /* Karte umgedreht. */
  facedown: {
    o: '<rect x="4.6" y="3.4" width="14.8" height="17.2" rx="3"/><path d="M9.4 8.6h5.2M9.4 12h5.2M9.4 15.4h3"/>',
    f: '<rect x="4.6" y="3.4" width="14.8" height="17.2" rx="3"/><path d="M9.4 8.6h5.2M9.4 12h5.2M9.4 15.4h3" stroke="var(--knock, #0d0f18)" stroke-width="1.9" stroke-linecap="round" fill="none"/>',
  },
  dice: {
    o: '<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.4"/><circle cx="8.8" cy="8.8" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.2" cy="15.2" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    f: '<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.4"/><circle cx="8.8" cy="8.8" r="1.6" fill="var(--knock, #0d0f18)"/><circle cx="15.2" cy="15.2" r="1.6" fill="var(--knock, #0d0f18)"/><circle cx="12" cy="12" r="1.6" fill="var(--knock, #0d0f18)"/>',
  },
  trash: { o: '<path d="M4.6 6.8h14.8"/><path d="M9.8 6.8V5.6a1.6 1.6 0 0 1 1.6-1.6h1.2a1.6 1.6 0 0 1 1.6 1.6v1.2"/><path d="M6.8 6.8 7.6 19a1.6 1.6 0 0 0 1.6 1.4h5.6A1.6 1.6 0 0 0 16.4 19l.8-12.2"/>' },
  down_tray: { o: '<path d="M12 3.6v11.2"/><path d="m7.4 10.6 4.6 4.6 4.6-4.6"/><path d="M4.4 19.6h15.2"/>' },
  up_tray: { o: '<path d="M12 20.4V9.2"/><path d="m7.4 13.4 4.6-4.6 4.6 4.6"/><path d="M4.4 4.4h15.2"/>' },
  person: {
    o: '<circle cx="12" cy="8.4" r="3.9"/><path d="M4.8 20.2c1.2-3.7 3.8-5.6 7.2-5.6s6 1.9 7.2 5.6"/>',
    f: '<circle cx="12" cy="8.2" r="4.2"/><path d="M12 13.8c3.8 0 6.6 2.3 7.6 6.3a1 1 0 0 1-.97 1.27H5.37A1 1 0 0 1 4.4 20.1c1-4 3.8-6.3 7.6-6.3Z"/>',
  },
  globe: { o: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.2 2.4 3.4 5.2 3.4 8.4s-1.2 6-3.4 8.4c-2.2-2.4-3.4-5.2-3.4-8.4S9.8 6 12 3.6Z"/>' },
  exit: { o: '<path d="M14.4 7.4V6a2 2 0 0 0-2-2H6.4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.4"/><path d="M9.8 12h9.8M16.4 8.8 19.6 12l-3.2 3.2"/>' },
  film: {
    o: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.8"/><path d="M8.4 4.6v14.8M15.6 4.6v14.8"/>',
    f: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.8"/><path d="M8.4 4.6v14.8M15.6 4.6v14.8" stroke="var(--knock, #0d0f18)" stroke-width="1.8"/>',
  },
  layers: { o: '<path d="m12 3.8 8.2 4.5-8.2 4.5-8.2-4.5Z"/><path d="m4.4 12.6 7.6 4.2 7.6-4.2"/><path d="m4.4 16.4 7.6 4.2 7.6-4.2"/>' },
};

export const ICON_NAMES = Object.keys(P);

export function icon(name, { size = 22, filled = false, cls = '' } = {}) {
  const def = P[name];
  if (!def) throw new Error(`V4: Icon "${name}" gibt es nicht`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `ico ${cls}`.trim());
  if (filled && def.f) {
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('stroke', 'none');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.innerHTML = filled && def.f ? def.f : def.o;
  return svg;
}

/** Kontur (aus) und Leuchtform (an) übereinander — der Wechsel „schaltet an". */
export function iconPair(name, { size = 23, active = false } = {}) {
  const wrap = document.createElement('span');
  wrap.className = 'ico-pair' + (active ? ' is-active' : '');
  wrap.style.setProperty('--ico-size', `${size}px`);
  wrap.appendChild(icon(name, { size, filled: false, cls: 'ico-o' }));
  if (P[name].f) wrap.appendChild(icon(name, { size, filled: true, cls: 'ico-f' }));
  return wrap;
}
