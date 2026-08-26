/**
 * V1 „Regal" — Icon-Satz.
 *
 * Regel dieser Version: JEDES Navigations- und Zustands-Icon existiert als
 * PAAR — außen Kontur (inaktiv), gefüllt (aktiv). Genau das unterscheidet
 * native Oberflächen von Template-Optik, in der alles ewig dieselbe 1,8-px-
 * Kontur bleibt. Dazu: runde Enden, dicke 2,3-px-Kontur, optisch schwere
 * Formen, Metaphern aus dem Regal (Buchrücken, Disc, Lade, Ticket).
 *
 * Keine Emojis, keine Unicode-Symbole — alles sind SVG-Pfade.
 */

const NS = 'http://www.w3.org/2000/svg';

/**
 * o = Konturfassung (gestrichen), f = Füllfassung (massiv).
 * Wo `f` fehlt, ist das Icon reine Aktion und hat keinen Aktiv-Zustand.
 */
const P = {
  /* ---- Navigation (alle mit Paar) ---- */
  home: {
    o: '<path d="M3.6 10.9 12 4.2l8.4 6.7"/><path d="M6 9.9V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.9"/><path d="M10 20v-5h4v5"/>',
    f: '<path d="M11.37 3.44a1 1 0 0 1 1.26 0l8.4 6.7a1 1 0 0 1-.63 1.78H20V19a2 2 0 0 1-2 2h-3.2v-5.2a1 1 0 0 0-1-1h-3.6a1 1 0 0 0-1 1V21H6a2 2 0 0 1-2-2v-7.08h-.4a1 1 0 0 1-.63-1.78Z"/>',
  },
  compass: {
    o: '<circle cx="12" cy="12" r="8.6"/><path d="m15.4 8.6-2 4.8-4.8 2 2-4.8Z"/>',
    f: '<path d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Zm4.32 6.06-2.2 5.3a1 1 0 0 1-.54.54l-5.3 2.2a1 1 0 0 1-1.3-1.3l2.2-5.3a1 1 0 0 1 .54-.54l5.3-2.2a1 1 0 0 1 1.3 1.3Z"/><circle cx="12" cy="12" r="1.7" fill="var(--icon-knockout, #14100d)"/>',
  },
  /* Bibliothek = Buchrücken im Regal, einer schräg herausgezogen. */
  shelf: {
    o: '<rect x="3.4" y="4.6" width="3.4" height="14.8" rx="1.1"/><rect x="8.6" y="4.6" width="3.4" height="14.8" rx="1.1"/><path d="m14.6 6.3 3.1-.9a1 1 0 0 1 1.24.7l3 11.1a1 1 0 0 1-.7 1.22l-3.1.86a1 1 0 0 1-1.23-.7l-3-11.06a1 1 0 0 1 .7-1.22Z"/>',
    f: '<rect x="3.4" y="4.6" width="3.4" height="14.8" rx="1.1"/><rect x="8.6" y="4.6" width="3.4" height="14.8" rx="1.1"/><path d="m14.6 6.3 3.1-.9a1 1 0 0 1 1.24.7l3 11.1a1 1 0 0 1-.7 1.22l-3.1.86a1 1 0 0 1-1.23-.7l-3-11.06a1 1 0 0 1 .7-1.22Z"/>',
  },
  chart: {
    o: '<rect x="3.4" y="13" width="4" height="7" rx="1.3"/><rect x="10" y="8" width="4" height="12" rx="1.3"/><rect x="16.6" y="4" width="4" height="16" rx="1.3"/>',
    f: '<rect x="3.4" y="13" width="4" height="7" rx="1.3"/><rect x="10" y="8" width="4" height="12" rx="1.3"/><rect x="16.6" y="4" width="4" height="16" rx="1.3"/>',
  },
  gear: {
    o: '<circle cx="12" cy="12" r="3.1"/><path d="M19.1 14.4a1.5 1.5 0 0 0 .3 1.66l.05.05a1.82 1.82 0 1 1-2.58 2.58l-.05-.06a1.5 1.5 0 0 0-1.66-.3 1.5 1.5 0 0 0-.91 1.37v.15a1.82 1.82 0 1 1-3.64 0v-.08a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.66.3l-.05.06A1.82 1.82 0 1 1 4.34 16.2l.06-.05a1.5 1.5 0 0 0 .3-1.66 1.5 1.5 0 0 0-1.37-.91h-.15a1.82 1.82 0 1 1 0-3.64h.08a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.66l-.06-.05A1.82 1.82 0 1 1 6.85 4.6l.05.06a1.5 1.5 0 0 0 1.66.3h.07a1.5 1.5 0 0 0 .91-1.37v-.15a1.82 1.82 0 1 1 3.64 0v.08a1.5 1.5 0 0 0 .91 1.37 1.5 1.5 0 0 0 1.66-.3l.05-.06a1.82 1.82 0 1 1 2.58 2.58l-.06.05a1.5 1.5 0 0 0-.3 1.66v.07a1.5 1.5 0 0 0 1.37.91h.15a1.82 1.82 0 1 1 0 3.64h-.08a1.5 1.5 0 0 0-1.37.91Z"/>',
    f: '<path d="M19.1 14.4a1.5 1.5 0 0 0 .3 1.66l.05.05a1.82 1.82 0 1 1-2.58 2.58l-.05-.06a1.5 1.5 0 0 0-1.66-.3 1.5 1.5 0 0 0-.91 1.37v.15a1.82 1.82 0 1 1-3.64 0v-.08a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.66.3l-.05.06A1.82 1.82 0 1 1 4.34 16.2l.06-.05a1.5 1.5 0 0 0 .3-1.66 1.5 1.5 0 0 0-1.37-.91h-.15a1.82 1.82 0 1 1 0-3.64h.08a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.66l-.06-.05A1.82 1.82 0 1 1 6.85 4.6l.05.06a1.5 1.5 0 0 0 1.66.3h.07a1.5 1.5 0 0 0 .91-1.37v-.15a1.82 1.82 0 1 1 3.64 0v.08a1.5 1.5 0 0 0 .91 1.37 1.5 1.5 0 0 0 1.66-.3l.05-.06a1.82 1.82 0 1 1 2.58 2.58l-.06.05a1.5 1.5 0 0 0-.3 1.66v.07a1.5 1.5 0 0 0 1.37.91h.15a1.82 1.82 0 1 1 0 3.64h-.08a1.5 1.5 0 0 0-1.37.91Z"/><circle cx="12" cy="12" r="3.1" fill="var(--icon-knockout, #14100d)"/>',
  },

  /* ---- Aktionen ---- */
  search: { o: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m15.7 15.7 4.3 4.3"/>' },
  plus: { o: '<path d="M12 5.2v13.6M5.2 12h13.6"/>' },
  minus: { o: '<path d="M5.2 12h13.6"/>' },
  check: { o: '<path d="m4.8 12.6 4.6 4.6 9.8-10.4"/>' },
  x: { o: '<path d="M6 6l12 12M18 6 6 18"/>' },
  chevronLeft: { o: '<path d="m14.6 5.6-6.4 6.4 6.4 6.4"/>' },
  chevronRight: { o: '<path d="m9.4 5.6 6.4 6.4-6.4 6.4"/>' },
  chevronDown: { o: '<path d="m5.6 9.4 6.4 6.4 6.4-6.4"/>' },
  arrowRight: { o: '<path d="M4.4 12h14.4M13 6.4 18.8 12 13 17.6"/>' },
  more: { o: '<circle cx="5.4" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.6" cy="12" r="1.7" fill="currentColor" stroke="none"/>' },

  /* Wertung: Kontur = nicht vergeben, gefüllt = vergeben. */
  star: {
    o: '<path d="M12 3.6l2.72 5.65 6.18.85-4.5 4.3 1.1 6.13L12 17.6l-5.5 2.93 1.1-6.13-4.5-4.3 6.18-.85Z"/>',
    f: '<path d="M11.1 3.15a1 1 0 0 1 1.8 0l2.5 5.2 5.68.78a1 1 0 0 1 .55 1.71l-4.14 3.96 1.01 5.64a1 1 0 0 1-1.46 1.05L12 18.8l-5.04 2.69a1 1 0 0 1-1.46-1.05l1.01-5.64-4.14-3.96a1 1 0 0 1 .55-1.71l5.68-.78Z"/>',
  },

  /* Abspielen = massives Dreieck in gerundetem Feld (Hardware-Taste). */
  play: {
    o: '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5.2"/><path d="M10.2 8.7v6.6l5.4-3.3Z" fill="currentColor" stroke="none"/>',
    f: '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5.2" fill="currentColor" stroke="none"/><path d="M10.2 8.4v7.2a.6.6 0 0 0 .92.5l5.7-3.6a.6.6 0 0 0 0-1l-5.7-3.6a.6.6 0 0 0-.92.5Z" fill="var(--icon-knockout, #14100d)" stroke="none"/>',
  },
  pause: {
    o: '<rect x="6.6" y="4.6" width="3.8" height="14.8" rx="1.5"/><rect x="13.6" y="4.6" width="3.8" height="14.8" rx="1.5"/>',
    f: '<rect x="6.6" y="4.6" width="3.8" height="14.8" rx="1.5"/><rect x="13.6" y="4.6" width="3.8" height="14.8" rx="1.5"/>',
  },

  /* Ticket = Ausstrahlungstermin. Regal-Metapher statt Kalenderblatt. */
  ticket: {
    o: '<path d="M3.6 8.4a2 2 0 0 1 2-2h12.8a2 2 0 0 1 2 2v1.3a2.3 2.3 0 0 0 0 4.6v1.3a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2v-1.3a2.3 2.3 0 0 0 0-4.6Z"/><path d="M14 7.4v2M14 14.6v2"/>',
    f: '<path d="M5.6 6.4h12.8a2 2 0 0 1 2 2v1.3a2.3 2.3 0 0 0 0 4.6v1.3a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2v-1.3a2.3 2.3 0 0 0 0-4.6V8.4a2 2 0 0 1 2-2Z"/><path d="M14 7v2.4M14 14.6V17" stroke="var(--icon-knockout, #14100d)" stroke-width="2" stroke-linecap="round" fill="none"/>',
  },
  /* Disc = Medium / Format. */
  disc: {
    o: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2.6"/>',
    f: '<path d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Zm0 6.7a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z"/>',
  },
  /* Lade = Bibliothek-Ablage, Backup. */
  drawer: {
    o: '<rect x="3.4" y="4.6" width="17.2" height="6.2" rx="1.8"/><rect x="3.4" y="13.2" width="17.2" height="6.2" rx="1.8"/><path d="M9.6 7.7h4.8M9.6 16.3h4.8"/>',
    f: '<rect x="3.4" y="4.6" width="17.2" height="6.2" rx="1.8"/><rect x="3.4" y="13.2" width="17.2" height="6.2" rx="1.8"/><path d="M9.6 7.7h4.8M9.6 16.3h4.8" stroke="var(--icon-knockout, #14100d)" stroke-width="2" stroke-linecap="round"/>',
  },
  clock: {
    o: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>',
    f: '<path d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Z"/><path d="M12 7.4V12l3 1.9" stroke="var(--icon-knockout, #14100d)" stroke-width="2.1" stroke-linecap="round" fill="none"/>',
  },
  /* Würfel für den Zufallsroller — Pips als echte Kreise, kein Emoji. */
  dice: {
    o: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.4"/><circle cx="8.6" cy="8.6" r="1.45" fill="currentColor" stroke="none"/><circle cx="15.4" cy="15.4" r="1.45" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.45" fill="currentColor" stroke="none"/>',
    f: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.4" fill="currentColor" stroke="none"/><circle cx="8.6" cy="8.6" r="1.55" fill="var(--icon-knockout, #14100d)"/><circle cx="15.4" cy="15.4" r="1.55" fill="var(--icon-knockout, #14100d)"/><circle cx="12" cy="12" r="1.55" fill="var(--icon-knockout, #14100d)"/>',
  },
  /* Greifpunkt der Rangliste — Schubladen-Griff, kein Hamburger. */
  grip: { o: '<path d="M8.2 7.4h7.6M8.2 12h7.6M8.2 16.6h7.6"/>' },
  trash: {
    o: '<path d="M4.6 6.8h14.8"/><path d="M9.6 6.8V5.4a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v1.4"/><path d="M6.6 6.8 7.4 19a1.4 1.4 0 0 0 1.4 1.3h6.4A1.4 1.4 0 0 0 16.6 19l.8-12.2"/>',
  },
  download: { o: '<path d="M12 3.8v11.4"/><path d="m7.2 10.6 4.8 4.8 4.8-4.8"/><path d="M4.4 18.6h15.2"/>' },
  upload: { o: '<path d="M12 20.2V8.8"/><path d="m7.2 13.4 4.8-4.8 4.8 4.8"/><path d="M4.4 5.4h15.2"/>' },
  /* Kontur-Version des Franchise-Zeichens: verbundene Bände. */
  franchise: {
    o: '<rect x="3.4" y="6.4" width="6.4" height="11.2" rx="1.6"/><rect x="12.2" y="4" width="6.4" height="16" rx="1.6"/><path d="M9.8 12h2.4"/>',
  },
  sparkle: {
    o: '<path d="M12 3.6 13.7 9l5.4 1.7-5.4 1.7L12 17.8l-1.7-5.4L4.9 10.7 10.3 9Z"/><path d="M18.4 4.2v3M19.9 5.7h-3"/>',
    f: '<path d="M11.05 3.3a1 1 0 0 1 1.9 0l1.5 4.75 4.75 1.5a1 1 0 0 1 0 1.9l-4.75 1.5-1.5 4.75a1 1 0 0 1-1.9 0l-1.5-4.75-4.75-1.5a1 1 0 0 1 0-1.9l4.75-1.5Z"/><path d="M18.4 3.6a.7.7 0 0 1 1.34 0l.3.96.96.3a.7.7 0 0 1 0 1.34l-.96.3-.3.96a.7.7 0 0 1-1.34 0l-.3-.96-.96-.3a.7.7 0 0 1 0-1.34l.96-.3Z"/>',
  },
  scissors: { o: '<circle cx="6.4" cy="6.4" r="2.6"/><circle cx="6.4" cy="17.6" r="2.6"/><path d="M8.6 8.2 20 18M20 6 8.6 15.8"/>' },
  film: {
    o: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4"/><path d="M8.2 4.6v14.8M15.8 4.6v14.8M3.4 12h17.2"/>',
    f: '<path d="M5.8 4.6h12.4a2.4 2.4 0 0 1 2.4 2.4v10a2.4 2.4 0 0 1-2.4 2.4H5.8a2.4 2.4 0 0 1-2.4-2.4V7a2.4 2.4 0 0 1 2.4-2.4Zm2.4 1.4v12M15.8 6v12M3.4 12h17.2" stroke="var(--icon-knockout, #14100d)" stroke-width="1.6"/>',
  },
  user: {
    o: '<circle cx="12" cy="8.2" r="3.9"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
    f: '<circle cx="12" cy="8" r="4.2"/><path d="M12 13.8c3.8 0 6.6 2.3 7.5 6.2H4.5c.9-3.9 3.7-6.2 7.5-6.2Z"/>',
  },
  globe: {
    o: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.3 2.4 3.5 5.4 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.4-3.5-8.6S9.7 5.8 12 3.4Z"/>',
  },
  shield: {
    o: '<path d="M12 3.4 19.4 6v5.6c0 4.2-2.9 7.6-7.4 9-4.5-1.4-7.4-4.8-7.4-9V6Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
  },
  logout: { o: '<path d="M14.6 7.4V5.8a1.8 1.8 0 0 0-1.8-1.8H6.2a1.8 1.8 0 0 0-1.8 1.8v12.4A1.8 1.8 0 0 0 6.2 20h6.6a1.8 1.8 0 0 0 1.8-1.8v-1.6"/><path d="M9.8 12h9.8M16.4 8.8 19.6 12l-3.2 3.2"/>' },
};

/** Welche Icons haben ein echtes Aktiv-Paar? (für die Bausteine-Seite) */
export const PAIRED = ['home', 'compass', 'shelf', 'chart', 'gear', 'star', 'play', 'pause', 'ticket', 'disc', 'drawer', 'clock', 'dice', 'sparkle', 'film', 'user'];

export const ICON_NAMES = Object.keys(P);

/**
 * @param {string} name
 * @param {{size?:number, filled?:boolean, cls?:string}} opts
 */
export function icon(name, { size = 22, filled = false, cls = '' } = {}) {
  const def = P[name];
  if (!def) throw new Error(`V1: Icon "${name}" gibt es nicht`);
  const use = filled && def.f ? def.f : def.o;
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
    svg.setAttribute('stroke-width', '2.3');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.innerHTML = use;
  return svg;
}

/** Beide Fassungen übereinander — der Wechsel wird dann überblendet, nicht getauscht. */
export function iconPair(name, { size = 22, active = false } = {}) {
  const wrap = document.createElement('span');
  wrap.className = 'ico-pair' + (active ? ' is-active' : '');
  wrap.style.setProperty('--ico-size', `${size}px`);
  const o = icon(name, { size, filled: false, cls: 'ico-o' });
  wrap.appendChild(o);
  if (P[name].f) wrap.appendChild(icon(name, { size, filled: true, cls: 'ico-f' }));
  return wrap;
}
