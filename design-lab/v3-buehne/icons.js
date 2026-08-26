/**
 * V3 „Bühne" — Icon-Satz.
 *
 * Regel dieser Version: präzise Zweigewicht-Familie im Geist von SF Symbols —
 * ruhige Kurven, 1,7 px im Ruhezustand, massiv gefüllt im Aktivzustand, und
 * durchweg ETWAS GRÖSSER als üblich (24–26 px), weil die Bedienfläche sonst
 * neben dem großen Artwork verschwindet.
 *
 * Keine Emojis, keine Unicode-Symbole — alles SVG-Pfade.
 */

const NS = 'http://www.w3.org/2000/svg';

const P = {
  /* ---- Navigation ---- */
  stage: {
    o: '<path d="M3.5 10.6 12 4.3l8.5 6.3"/><path d="M5.8 9.4V18a1.8 1.8 0 0 0 1.8 1.8h8.8A1.8 1.8 0 0 0 18.2 18V9.4"/><path d="M9.8 19.8v-4.6a2.2 2.2 0 0 1 4.4 0v4.6"/>',
    f: '<path d="M11.4 3.5a1 1 0 0 1 1.2 0l8.5 6.3a1 1 0 0 1-.6 1.8h-.5V18a2.8 2.8 0 0 1-2.8 2.8h-2.6v-5.6a2.6 2.6 0 0 0-5.2 0v5.6H6.8A2.8 2.8 0 0 1 4 18v-6.4h-.5a1 1 0 0 1-.6-1.8Z"/>',
  },
  collection: {
    o: '<rect x="3.2" y="4.4" width="7" height="15.2" rx="2"/><rect x="13.8" y="4.4" width="7" height="9" rx="2"/><path d="M13.8 16.6h7"/>',
    f: '<rect x="3.2" y="4.4" width="7" height="15.2" rx="2"/><rect x="13.8" y="4.4" width="7" height="9" rx="2"/><rect x="13.8" y="15.6" width="7" height="4" rx="2"/>',
  },
  spark: {
    o: '<path d="M12 3.4c.9 3.9 2.3 5.3 6.2 6.2-3.9.9-5.3 2.3-6.2 6.2-.9-3.9-2.3-5.3-6.2-6.2 3.9-.9 5.3-2.3 6.2-6.2Z"/><path d="M17.6 16.2c.4 1.7 1 2.3 2.7 2.7-1.7.4-2.3 1-2.7 2.7-.4-1.7-1-2.3-2.7-2.7 1.7-.4 2.3-1 2.7-2.7Z"/>',
    f: '<path d="M11.03 3.18a1 1 0 0 1 1.94 0c.83 3.6 2.05 4.82 5.65 5.65a1 1 0 0 1 0 1.94c-3.6.83-4.82 2.05-5.65 5.65a1 1 0 0 1-1.94 0c-.83-3.6-2.05-4.82-5.65-5.65a1 1 0 0 1 0-1.94c3.6-.83 4.82-2.05 5.65-5.65Z"/><path d="M16.85 16a.8.8 0 0 1 1.5 0c.34 1.42.83 1.91 2.25 2.25a.8.8 0 0 1 0 1.5c-1.42.34-1.91.83-2.25 2.25a.8.8 0 0 1-1.5 0c-.34-1.42-.83-1.91-2.25-2.25a.8.8 0 0 1 0-1.5c1.42-.34 1.91-.83 2.25-2.25Z"/>',
  },
  pulse: {
    o: '<path d="M3.2 13.4h3.4l2.4-6.6 3.6 12.4 2.6-8.2 1.6 2.4h4"/>',
    f: '<path d="M3.2 13.4h3.4l2.4-6.6 3.6 12.4 2.6-8.2 1.6 2.4h4" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  person: {
    o: '<circle cx="12" cy="8.4" r="4"/><path d="M4.6 20.2c1.2-3.8 3.9-5.8 7.4-5.8s6.2 2 7.4 5.8"/>',
    f: '<circle cx="12" cy="8.2" r="4.4"/><path d="M12 14c4 0 6.9 2.4 8 6.4a1 1 0 0 1-.97 1.26H4.97A1 1 0 0 1 4 20.4C5.1 16.4 8 14 12 14Z"/>',
  },

  /* ---- Aktionen ---- */
  play: {
    o: '<path d="M8.4 5.6v12.8a1 1 0 0 0 1.53.85l10.1-6.4a1 1 0 0 0 0-1.7L9.93 4.75A1 1 0 0 0 8.4 5.6Z"/>',
    f: '<path d="M8.4 5.6v12.8a1 1 0 0 0 1.53.85l10.1-6.4a1 1 0 0 0 0-1.7L9.93 4.75A1 1 0 0 0 8.4 5.6Z"/>',
  },
  pause: { o: '<rect x="6.6" y="4.6" width="3.8" height="14.8" rx="1.9"/><rect x="13.6" y="4.6" width="3.8" height="14.8" rx="1.9"/>', f: '<rect x="6.6" y="4.6" width="3.8" height="14.8" rx="1.9"/><rect x="13.6" y="4.6" width="3.8" height="14.8" rx="1.9"/>' },
  plus: { o: '<path d="M12 4.6v14.8M4.6 12h14.8"/>' },
  minus: { o: '<path d="M4.6 12h14.8"/>' },
  check: { o: '<path d="m4.8 12.8 4.6 4.6 9.8-10.8"/>', f: '<path d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Zm4.5 6.9-5.4 6a1 1 0 0 1-1.46.04L7 12.9a1 1 0 1 1 1.4-1.42l1.9 1.87 4.7-5.22a1 1 0 0 1 1.5 1.33Z"/>' },
  x: { o: '<path d="M6 6l12 12M18 6 6 18"/>' },
  left: { o: '<path d="M14.6 5.4 8 12l6.6 6.6"/>' },
  right: { o: '<path d="M9.4 5.4 16 12l-6.6 6.6"/>' },
  down: { o: '<path d="M5.4 9.4 12 16l6.6-6.6"/>' },
  arrow: { o: '<path d="M4.4 12h15M13 5.6 19.4 12 13 18.4"/>' },
  find: { o: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m15.8 15.8 4.4 4.4"/>' },
  dots: { o: '<circle cx="5.4" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="18.6" cy="12" r="1.8" fill="currentColor" stroke="none"/>' },
  clock: {
    o: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.4 2"/>',
    f: '<path d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Z"/><path d="M12 7.2v5l3.3 1.9" stroke="var(--knock, #131316)" stroke-width="2" fill="none" stroke-linecap="round"/>',
  },
  calendar: {
    o: '<rect x="3.4" y="5.4" width="17.2" height="15.2" rx="3"/><path d="M3.4 10.2h17.2M8.2 3v4.4M15.8 3v4.4"/>',
    f: '<rect x="3.4" y="5.4" width="17.2" height="15.2" rx="3"/><path d="M3.4 10.2h17.2" stroke="var(--knock, #131316)" stroke-width="1.8"/><path d="M8.2 3v4.4M15.8 3v4.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
  },
  curtain: {
    o: '<path d="M3.4 4h17.2"/><path d="M6 4c0 6.4 1.6 10.6 4.6 12.8V20H6Z"/><path d="M18 4c0 6.4-1.6 10.6-4.6 12.8V20H18Z"/>',
    f: '<path d="M3.4 3h17.2v1.8H3.4Z"/><path d="M6 4.8c0 6.4 1.6 10.6 4.6 12.8V21H6Z"/><path d="M18 4.8c0 6.4-1.6 10.6-4.6 12.8V21H18Z"/>',
  },
  film: {
    o: '<rect x="3.2" y="4.6" width="17.6" height="14.8" rx="3"/><path d="M8.4 4.6v14.8M15.6 4.6v14.8"/>',
    f: '<rect x="3.2" y="4.6" width="17.6" height="14.8" rx="3"/><path d="M8.4 4.6v14.8M15.6 4.6v14.8" stroke="var(--knock, #131316)" stroke-width="1.8"/>',
  },
  dice: {
    o: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6"/><circle cx="8.8" cy="8.8" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.2" cy="15.2" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    f: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6"/><circle cx="8.8" cy="8.8" r="1.6" fill="var(--knock, #131316)"/><circle cx="15.2" cy="15.2" r="1.6" fill="var(--knock, #131316)"/><circle cx="12" cy="12" r="1.6" fill="var(--knock, #131316)"/>',
  },
  trash: { o: '<path d="M4.6 6.8h14.8"/><path d="M9.8 6.8V5.6a1.6 1.6 0 0 1 1.6-1.6h1.2a1.6 1.6 0 0 1 1.6 1.6v1.2"/><path d="M6.8 6.8 7.6 19a1.6 1.6 0 0 0 1.6 1.4h5.6A1.6 1.6 0 0 0 16.4 19l.8-12.2"/>' },
  down_tray: { o: '<path d="M12 3.6v11.2"/><path d="m7.4 10.6 4.6 4.6 4.6-4.6"/><path d="M4.4 19.6h15.2"/>' },
  up_tray: { o: '<path d="M12 20.4V9.2"/><path d="m7.4 13.4 4.6-4.6 4.6 4.6"/><path d="M4.4 4.4h15.2"/>' },
  globe: { o: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.3 2.4 3.5 5.4 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.4-3.5-8.6S9.7 5.8 12 3.4Z"/>' },
  exit: { o: '<path d="M14.6 7.4V6a2 2 0 0 0-2-2H6.4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.2a2 2 0 0 0 2-2v-1.4"/><path d="M9.8 12h9.8M16.4 8.8 19.6 12l-3.2 3.2"/>' },
  layers: { o: '<path d="m12 3.6 8.4 4.6-8.4 4.6-8.4-4.6Z"/><path d="m4.4 12.6 7.6 4.2 7.6-4.2"/><path d="m4.4 16.6 7.6 4.2 7.6-4.2"/>' },
};

export const ICON_NAMES = Object.keys(P);

export function icon(name, { size = 24, filled = false, cls = '' } = {}) {
  const def = P[name];
  if (!def) throw new Error(`V3: Icon "${name}" gibt es nicht`);
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
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.innerHTML = filled && def.f ? def.f : def.o;
  return svg;
}

/** Beide Gewichte übereinander — der Wechsel wird weich überblendet. */
export function iconPair(name, { size = 26, active = false } = {}) {
  const wrap = document.createElement('span');
  wrap.className = 'ico-pair' + (active ? ' is-active' : '');
  wrap.style.setProperty('--ico-size', `${size}px`);
  wrap.appendChild(icon(name, { size, filled: false, cls: 'ico-o' }));
  if (P[name].f) wrap.appendChild(icon(name, { size, filled: true, cls: 'ico-f' }));
  return wrap;
}
