/**
 * V2 „Sendeplan" — Icon-Satz.
 *
 * Regel dieser Version: geometrisch, kantig, aus Rechtecken und geraden
 * Schnitten gebaut — wie Beschriftungen an einem Mischpult. Keine runden
 * Enden, keine weichen Kurven. Aktiv = massiv gefüllte Kachel, inaktiv =
 * dieselbe Form als 2-px-Kontur. Metaphern: Pegel, Band, Uhr, Marker.
 *
 * Keine Emojis, keine Unicode-Symbole — alles SVG-Pfade.
 */

const NS = 'http://www.w3.org/2000/svg';

const P = {
  /* ---- Navigation ---- */
  /* Start = Sendetafel: drei Programmzeilen in einem Rahmen. */
  board: {
    o: '<rect x="3" y="4" width="18" height="16"/><path d="M3 9h18M8 9v11"/>',
    f: '<path d="M3 4h18v5H3z"/><path d="M3 10h4v10H3zM8 10h13v4H8zM8 15h13v5H8z"/>',
  },
  /* Entdecken = Sendemast/Signal. */
  signal: {
    o: '<path d="M12 10v10"/><path d="M8.2 6.4a6 6 0 0 0 0 7.2M15.8 6.4a6 6 0 0 1 0 7.2"/><path d="M5.2 3.4a10 10 0 0 0 0 13.2M18.8 3.4a10 10 0 0 1 0 13.2"/><rect x="10.4" y="8.4" width="3.2" height="3.2"/>',
    f: '<rect x="10.6" y="10" width="2.8" height="10"/><rect x="9.6" y="7.6" width="4.8" height="4.8"/><path d="M8.2 5.6 6.9 4.3a8.4 8.4 0 0 0 0 11.4l1.3-1.3a6.6 6.6 0 0 1 0-8.8ZM15.8 5.6l1.3-1.3a8.4 8.4 0 0 1 0 11.4l-1.3-1.3a6.6 6.6 0 0 0 0-8.8Z"/>',
  },
  /* Bibliothek = Bandarchiv: Kassette. */
  tape: {
    o: '<rect x="2.6" y="5" width="18.8" height="14"/><circle cx="8.6" cy="11.4" r="2.4"/><circle cx="15.4" cy="11.4" r="2.4"/><path d="M6 19v-2.6h12V19"/>',
    f: '<path d="M2.6 5h18.8v14h-3.2v-3.4H5.8V19H2.6Zm6 3.4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm6.8 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/><rect x="7.4" y="10.2" width="2.4" height="2.4" fill="var(--knock, #0a0b0c)"/><rect x="14.2" y="10.2" width="2.4" height="2.4" fill="var(--knock, #0a0b0c)"/>',
  },
  /* Statistik = Aussteuerungspegel. */
  levels: {
    o: '<rect x="3" y="12" width="4" height="8"/><rect x="10" y="7" width="4" height="13"/><rect x="17" y="3" width="4" height="17"/>',
    f: '<rect x="3" y="12" width="4" height="8"/><rect x="10" y="7" width="4" height="13"/><rect x="17" y="3" width="4" height="17"/>',
  },
  /* Einstellungen = Schieberegler. */
  sliders: {
    o: '<path d="M4 7h16M4 12h16M4 17h16"/><rect x="7" y="4.6" width="3.4" height="4.8"/><rect x="14" y="9.6" width="3.4" height="4.8"/><rect x="9" y="14.6" width="3.4" height="4.8"/>',
    f: '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" fill="none"/><rect x="7" y="4.6" width="3.4" height="4.8"/><rect x="14" y="9.6" width="3.4" height="4.8"/><rect x="9" y="14.6" width="3.4" height="4.8"/>',
  },

  /* ---- Zustände / Marken ---- */
  /* Sendezeichen: gefülltes Quadrat im Rahmen (Tally). */
  tally: {
    o: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/>',
    f: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/><rect x="7.6" y="7.6" width="8.8" height="8.8" fill="var(--knock, #0a0b0c)"/>',
  },
  clock: {
    o: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/><path d="M12 7.2V12l3.6 2.2"/>',
    f: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/><path d="M12 7.2V12l3.6 2.2" stroke="var(--knock, #0a0b0c)" stroke-width="2" fill="none"/>',
  },
  /* Datumsstempel. */
  stamp: {
    o: '<rect x="3.4" y="5.4" width="17.2" height="15.2"/><path d="M3.4 10h17.2M8 3v4.4M16 3v4.4"/>',
    f: '<rect x="3.4" y="5.4" width="17.2" height="15.2"/><path d="M3.4 10h17.2" stroke="var(--knock, #0a0b0c)" stroke-width="2"/><path d="M8 3v4.4M16 3v4.4" stroke="currentColor" stroke-width="2.4" fill="none"/>',
  },
  /* Filmstreifen. */
  strip: {
    o: '<rect x="3" y="4" width="18" height="16"/><path d="M7 4v16M17 4v16M3 8.4h4M3 12h4M3 15.6h4M17 8.4h4M17 12h4M17 15.6h4"/>',
    f: '<path d="M3 4h18v16H3Z"/><rect x="4.2" y="6.6" width="2" height="2" fill="var(--knock, #0a0b0c)"/><rect x="4.2" y="11" width="2" height="2" fill="var(--knock, #0a0b0c)"/><rect x="4.2" y="15.4" width="2" height="2" fill="var(--knock, #0a0b0c)"/><rect x="17.8" y="6.6" width="2" height="2" fill="var(--knock, #0a0b0c)"/><rect x="17.8" y="11" width="2" height="2" fill="var(--knock, #0a0b0c)"/><rect x="17.8" y="15.4" width="2" height="2" fill="var(--knock, #0a0b0c)"/><rect x="8" y="6.6" width="8" height="10.8" fill="var(--knock, #0a0b0c)"/>',
  },
  marker: {
    o: '<path d="M5.6 3.4h12.8v17.2L12 15.6l-6.4 5Z"/>',
    f: '<path d="M5.6 3.4h12.8v17.2L12 15.6l-6.4 5Z"/>',
  },

  /* ---- Aktionen ---- */
  play: {
    o: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/><path d="M9.6 8v8l6.4-4Z" fill="currentColor" stroke="none"/>',
    f: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/><path d="M9.6 8v8l6.4-4Z" fill="var(--knock, #0a0b0c)" stroke="none"/>',
  },
  pause: { o: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>', f: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' },
  rec: { o: '<circle cx="12" cy="12" r="8"/>', f: '<circle cx="12" cy="12" r="8"/>' },
  search: { o: '<circle cx="10.6" cy="10.6" r="6.6"/><path d="m15.4 15.4 4.8 4.8"/>' },
  plus: { o: '<path d="M12 4v16M4 12h16"/>' },
  minus: { o: '<path d="M4 12h16"/>' },
  check: { o: '<path d="m4.4 12.4 5 5L19.6 6.6"/>' },
  x: { o: '<path d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4"/>' },
  chevronLeft: { o: '<path d="M15 4.6 7.6 12l7.4 7.4"/>' },
  chevronRight: { o: '<path d="M9 4.6 16.4 12 9 19.4"/>' },
  chevronDown: { o: '<path d="M4.6 9 12 16.4 19.4 9"/>' },
  arrowRight: { o: '<path d="M3.6 12h16.8M13.4 5 20.4 12l-7 7"/>' },
  more: { o: '<rect x="3.4" y="10.4" width="3.2" height="3.2" fill="currentColor" stroke="none"/><rect x="10.4" y="10.4" width="3.2" height="3.2" fill="currentColor" stroke="none"/><rect x="17.4" y="10.4" width="3.2" height="3.2" fill="currentColor" stroke="none"/>' },
  grip: { o: '<path d="M7 6h10M7 12h10M7 18h10"/>' },
  scissors: { o: '<rect x="3" y="3.6" width="4.4" height="4.4"/><rect x="3" y="16" width="4.4" height="4.4"/><path d="M7.4 8 20.4 19M20.4 5 7.4 16"/>' },
  trash: { o: '<path d="M4 6.6h16M9.4 6.6V3.4h5.2v3.2"/><path d="M6.4 6.6 7.4 20.6h9.2l1-14"/>' },
  download: { o: '<path d="M12 3.4v11.8M7 10.4 12 15.4l5-5"/><path d="M4 20.6h16"/>' },
  upload: { o: '<path d="M12 20.6V8.8M7 13.8 12 8.8l5 5"/><path d="M4 3.4h16"/>' },
  dice: {
    o: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/><rect x="7" y="7" width="3" height="3" fill="currentColor" stroke="none"/><rect x="14" y="14" width="3" height="3" fill="currentColor" stroke="none"/><rect x="10.5" y="10.5" width="3" height="3" fill="currentColor" stroke="none"/>',
    f: '<rect x="3.4" y="3.4" width="17.2" height="17.2"/><rect x="7" y="7" width="3" height="3" fill="var(--knock, #0a0b0c)"/><rect x="14" y="14" width="3" height="3" fill="var(--knock, #0a0b0c)"/><rect x="10.5" y="10.5" width="3" height="3" fill="var(--knock, #0a0b0c)"/>',
  },
  chain: { o: '<rect x="2.6" y="8.6" width="8.4" height="6.8"/><rect x="13" y="8.6" width="8.4" height="6.8"/><path d="M11 12h2"/>' },
  user: { o: '<rect x="8" y="3.6" width="8" height="8"/><path d="M3.6 20.4c1.4-4 4.4-6 8.4-6s7 2 8.4 6"/>', f: '<rect x="8" y="3.6" width="8" height="8"/><path d="M12 13.4c4.4 0 7.4 2.4 8.8 7H3.2c1.4-4.6 4.4-7 8.8-7Z"/>' },
  globe: { o: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.2 2.4 3.4 5.2 3.4 8.4s-1.2 6-3.4 8.4c-2.2-2.4-3.4-5.2-3.4-8.4S9.8 6 12 3.6Z"/>' },
  logout: { o: '<path d="M14 7.4V4H4v16h10v-3.4"/><path d="M9.6 12h10.8M17 8.6 20.4 12 17 15.4"/>' },
  burst: { o: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3.4 3.4M14.6 14.6 18 18M18 6l-3.4 3.4M9.4 14.6 6 18"/>', f: '<path d="M10.6 3h2.8v6.2l4.4-4.4 2 2-4.4 4.4H21.6v2.8h-6.2l4.4 4.4-2 2-4.4-4.4V21h-2.8v-6.2l-4.4 4.4-2-2 4.4-4.4H2.4v-2.8h6.2L4.2 5.6l2-2 4.4 4.4Z"/>' },
};

export const ICON_NAMES = Object.keys(P);

export function icon(name, { size = 20, filled = false, cls = '' } = {}) {
  const def = P[name];
  if (!def) throw new Error(`V2: Icon "${name}" gibt es nicht`);
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
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'butt');    // kantig: keine runden Enden
    svg.setAttribute('stroke-linejoin', 'miter');
  }
  svg.innerHTML = filled && def.f ? def.f : def.o;
  return svg;
}

/** Kontur und Füllung übereinander — der Wechsel rastet, er blendet nicht. */
export function iconPair(name, { size = 22, active = false } = {}) {
  const wrap = document.createElement('span');
  wrap.className = 'ico-pair' + (active ? ' is-active' : '');
  wrap.style.setProperty('--ico-size', `${size}px`);
  wrap.appendChild(icon(name, { size, filled: false, cls: 'ico-o' }));
  if (P[name].f) wrap.appendChild(icon(name, { size, filled: true, cls: 'ico-f' }));
  return wrap;
}
