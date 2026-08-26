/**
 * TSUGI V5 — Icon-Satz.
 *
 * Der größte einzelne Hebel gegen den „Website"-Eindruck: Die alte App hat
 * ausschließlich Konturlinien in gleichmäßig 1,8 px — genau der Look, den
 * jedes SaaS-Boilerplate mitliefert. Native Systeme benutzen PAARE:
 *
 *   o = Kontur  → inaktiv, ruhig, 2 px
 *   f = gefüllt → aktiv, optisch schwerer, massive Fläche
 *
 * Wo eine gefüllte Form Innenzeichnung braucht (Uhrzeiger, Häkchen im Kreis),
 * wird sie in --knock ausgestanzt — der Hintergrundfarbe des Trägers. Das ist
 * derselbe Trick, den iOS und Material für gefüllte Symbole benutzen.
 *
 * Keine Emojis, keine Unicode-Zeichen. Jedes Zeichen ist ein SVG-Pfad.
 */

const NS = 'http://www.w3.org/2000/svg';

const P = {
  /* ================================================== Navigation ======= */
  /* Start = Haus mit solider Grundfläche. */
  home: {
    o: '<path d="M3.6 10.4 12 3.8l8.4 6.6V19a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z"/><path d="M9.4 21v-6.2h5.2V21"/>',
    f: '<path d="M11.38 3.3a1 1 0 0 1 1.24 0l8 6.3a1 1 0 0 1 .38.79V19a2.4 2.4 0 0 1-2.4 2.4h-2.9v-6a1 1 0 0 0-1-1h-3.4a1 1 0 0 0-1 1v6H5.4A2.4 2.4 0 0 1 3 19v-8.61a1 1 0 0 1 .38-.79Z"/>',
  },
  /* Entdecken = Kompassnadel. */
  compass: {
    o: '<circle cx="12" cy="12" r="8.6"/><path d="m15.4 8.6-1.9 4.9-4.9 1.9 1.9-4.9Z"/>',
    f: '<circle cx="12" cy="12" r="9"/><path d="m15.9 8.1-4.6 1.8a1 1 0 0 0-.57.57L8.9 15.1a.7.7 0 0 0 .9.9l4.63-1.79a1 1 0 0 0 .57-.57l1.79-4.63a.7.7 0 0 0-.9-.9Z" fill="var(--knock, #0d0f18)"/>',
  },
  /* Bibliothek = Regal aus drei Rücken. */
  stack: {
    o: '<rect x="3.4" y="4.6" width="4.4" height="14.8" rx="1.5"/><rect x="9.8" y="4.6" width="4.4" height="14.8" rx="1.5"/><path d="m16.6 6.2 3.3.9a1.4 1.4 0 0 1 1 1.7l-2.7 10a1.4 1.4 0 0 1-1.7 1l-.6-.2"/>',
    f: '<rect x="3.4" y="4.6" width="4.4" height="14.8" rx="1.5"/><rect x="9.8" y="4.6" width="4.4" height="14.8" rx="1.5"/><path d="m16.35 5.24 2.9.78a2.4 2.4 0 0 1 1.7 2.94l-2.59 9.66a2.4 2.4 0 0 1-2.94 1.7l-.62-.17Z"/>',
  },
  /* Statistik = Balken. */
  chart: {
    o: '<rect x="3.6" y="12.6" width="4.4" height="7.4" rx="1.6"/><rect x="9.8" y="8.2" width="4.4" height="11.8" rx="1.6"/><rect x="16" y="4" width="4.4" height="16" rx="1.6"/>',
    f: '<rect x="3.6" y="12.6" width="4.4" height="7.4" rx="1.6"/><rect x="9.8" y="8.2" width="4.4" height="11.8" rx="1.6"/><rect x="16" y="4" width="4.4" height="16" rx="1.6"/>',
  },
  /* Einstellungen = Schieberegler (nicht das Zahnrad-Klischee). */
  gear: {
    o: '<path d="M4 7.4h16M4 16.6h16"/><circle cx="9.4" cy="7.4" r="2.5"/><circle cx="15" cy="16.6" r="2.5"/>',
    f: '<path d="M4 7.4h2.2M12.6 7.4H20M4 16.6h7.4M18 16.6H20" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/><circle cx="9.4" cy="7.4" r="3.1"/><circle cx="15" cy="16.6" r="3.1"/>',
  },

  /* ============================================= Status-Zeichen ========= */
  /* Weiter schauen = Wiedergabe. Läuft. */
  play: {
    o: '<path d="M8.4 5.7v12.6a1 1 0 0 0 1.53.85l9.9-6.3a1 1 0 0 0 0-1.7l-9.9-6.3a1 1 0 0 0-1.53.85Z"/>',
    f: '<path d="M8.4 5.7v12.6a1 1 0 0 0 1.53.85l9.9-6.3a1 1 0 0 0 0-1.7l-9.9-6.3a1 1 0 0 0-1.53.85Z"/>',
  },
  /* Noch zu schauen = geladen, springt gleich raus. */
  ready: {
    o: '<path d="M12 3.6v11.2"/><path d="m7.6 10.4 4.4 4.4 4.4-4.4"/><path d="M4.6 19.6h14.8"/>',
    f: '<path d="M13.2 3.6a1.2 1.2 0 0 0-2.4 0v7.7l-2.35-2.35a1.2 1.2 0 0 0-1.7 1.7l4.4 4.4a1.2 1.2 0 0 0 1.7 0l4.4-4.4a1.2 1.2 0 0 0-1.7-1.7L13.2 11.3Z"/><rect x="4" y="18.2" width="16" height="2.4" rx="1.2"/>',
  },
  /* Watchlist = Lesezeichen. */
  bookmark: {
    o: '<path d="M6.4 4.8A1.8 1.8 0 0 1 8.2 3h7.6a1.8 1.8 0 0 1 1.8 1.8v15.4l-5.6-3.6-5.6 3.6Z"/>',
    f: '<path d="M6.4 4.8A1.8 1.8 0 0 1 8.2 3h7.6a1.8 1.8 0 0 1 1.8 1.8v15.06a1 1 0 0 1-1.54.84L12 17.87l-4.06 2.83A1 1 0 0 1 6.4 19.86Z"/>',
  },
  /* Fortsetzung folgt = Uhr. Das Zifferblatt tickt. */
  clock: {
    o: '<circle cx="12" cy="12" r="8.6"/><path d="M12 6.6V12l3.6 2.2"/>',
    f: '<circle cx="12" cy="12" r="9"/><path d="M12 6.8V12l3.4 2.1" stroke="var(--knock, #0d0f18)" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  },
  /* Geschaut = Siegel. Abgelegt, fertig. */
  seal: {
    o: '<path d="M12 3.2 20 6.8v6.4c0 4.2-3.2 7.3-8 8.6-4.8-1.3-8-4.4-8-8.6V6.8Z"/><path d="m8.6 12.2 2.3 2.3 4.6-5"/>',
    f: '<path d="M11.6 3.29a1 1 0 0 1 .8 0l8 3.6a1 1 0 0 1 .6.91v5.4c0 4.75-3.62 8.2-8.74 9.57a1 1 0 0 1-.52 0C6.62 21.4 3 17.95 3 13.2V7.8a1 1 0 0 1 .6-.91Z"/><path d="m8.5 12.3 2.4 2.4 4.7-5.1" stroke="var(--knock, #0d0f18)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  },

  /* ==================================================== Aktionen ======== */
  plus:  { o: '<path d="M12 4.8v14.4M4.8 12h14.4"/>' },
  minus: { o: '<path d="M4.8 12h14.4"/>' },
  check: {
    o: '<path d="m4.8 12.4 4.9 4.9L19.2 6.6"/>',
    f: '<circle cx="12" cy="12" r="9.4"/><path d="m7.7 12.2 3 3 5.6-6.3" stroke="var(--knock, #0d0f18)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  x:     { o: '<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>' },
  left:  { o: '<path d="M14.8 4.8 7.6 12l7.2 7.2"/>' },
  right: { o: '<path d="M9.2 4.8 16.4 12l-7.2 7.2"/>' },
  down:  { o: '<path d="M4.8 9 12 16.2 19.2 9"/>' },
  up:    { o: '<path d="M4.8 15 12 7.8 19.2 15"/>' },
  arrow: { o: '<path d="M4.4 12h14.6M12.8 5.8 19 12l-6.2 6.2"/>' },
  search: {
    o: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m15.6 15.6 4.4 4.4"/>',
    f: '<path d="M10.8 3.2a7.6 7.6 0 1 0 4.42 13.79l3.87 3.87a1.2 1.2 0 0 0 1.7-1.7l-3.87-3.87A7.6 7.6 0 0 0 10.8 3.2Zm0 2.4a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4Z"/>',
  },
  dots:  { o: '<circle cx="5" cy="12" r="1.9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.9" fill="currentColor" stroke="none"/>' },
  pause: { o: '<rect x="6.6" y="4.6" width="3.8" height="14.8" rx="1.9"/><rect x="13.6" y="4.6" width="3.8" height="14.8" rx="1.9"/>', f: '<rect x="6.6" y="4.6" width="3.8" height="14.8" rx="1.9"/><rect x="13.6" y="4.6" width="3.8" height="14.8" rx="1.9"/>' },
  star: {
    o: '<path d="m12 3.8 2.68 5.44 6 .88-4.34 4.23 1.02 5.97L12 17.5l-5.36 2.82 1.02-5.97L3.32 10.1l6-.88Z"/>',
    f: '<path d="m11.1 3.4-2.3 4.66-5.14.75a1 1 0 0 0-.55 1.71l3.72 3.62-.88 5.12a1 1 0 0 0 1.45 1.06L12 17.9l4.6 2.42a1 1 0 0 0 1.45-1.06l-.88-5.12 3.72-3.62a1 1 0 0 0-.55-1.71l-5.14-.75-2.3-4.66a1 1 0 0 0-1.8 0Z"/>',
  },
  dice: {
    o: '<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.6"/><circle cx="8.7" cy="8.7" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.3" cy="15.3" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    f: '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.8"/><circle cx="8.6" cy="8.6" r="1.65" fill="var(--knock, #0d0f18)"/><circle cx="15.4" cy="15.4" r="1.65" fill="var(--knock, #0d0f18)"/><circle cx="12" cy="12" r="1.65" fill="var(--knock, #0d0f18)"/>',
  },
  calendar: {
    o: '<rect x="3.6" y="5.4" width="16.8" height="15" rx="3"/><path d="M3.6 10h16.8M8.4 3.4v3.6M15.6 3.4v3.6"/>',
    f: '<path d="M8.4 2.4a1.2 1.2 0 0 1 1.2 1.2v.8h4.8v-.8a1.2 1.2 0 0 1 2.4 0v.83A3.4 3.4 0 0 1 20.4 8.4v.4H3.6v-.4a3.4 3.4 0 0 1 3.6-3.97V3.6a1.2 1.2 0 0 1 1.2-1.2Z"/><path d="M3.6 11h16.8v6a3.4 3.4 0 0 1-3.4 3.4H7a3.4 3.4 0 0 1-3.4-3.4Z" opacity=".55"/>',
  },
  film: {
    o: '<rect x="3.2" y="4.8" width="17.6" height="14.4" rx="3"/><path d="M8.4 4.8v14.4M15.6 4.8v14.4"/>',
    f: '<rect x="3.2" y="4.8" width="17.6" height="14.4" rx="3"/><path d="M8.4 4.8v14.4M15.6 4.8v14.4" stroke="var(--knock, #0d0f18)" stroke-width="1.9"/>',
  },
  tv: {
    o: '<rect x="2.8" y="6" width="18.4" height="12.4" rx="2.8"/><path d="m8.4 2.8 3.6 3.2 3.6-3.2"/>',
    f: '<path d="m7.63 2.02 4.37 3.9 4.37-3.9a1.1 1.1 0 0 1 1.46 1.64L15.5 5.4h2.1a3.6 3.6 0 0 1 3.6 3.6v6a3.6 3.6 0 0 1-3.6 3.6H6.4a3.6 3.6 0 0 1-3.6-3.6V9a3.6 3.6 0 0 1 3.6-3.6h2.1L6.17 3.66a1.1 1.1 0 0 1 1.46-1.64Z"/>',
  },
  sparkle: {
    o: '<path d="M12 3.4 13.7 9l5.6 1.7-5.6 1.7L12 18l-1.7-5.6L4.7 10.7 10.3 9Z"/><path d="M18.6 15.2 19.4 18l2.6.8-2.6.8-.8 2.6-.8-2.6-2.6-.8 2.6-.8Z" opacity=".6"/>',
    f: '<path d="M11.05 3.1a1 1 0 0 1 1.9 0l1.5 4.95 4.95 1.5a1 1 0 0 1 0 1.9l-4.95 1.5-1.5 4.95a1 1 0 0 1-1.9 0l-1.5-4.95-4.95-1.5a1 1 0 0 1 0-1.9l4.95-1.5Z"/><path d="M18.2 15a.7.7 0 0 1 1.3 0l.63 2.07 2.07.63a.7.7 0 0 1 0 1.3l-2.07.63-.63 2.07a.7.7 0 0 1-1.3 0l-.63-2.07-2.07-.63a.7.7 0 0 1 0-1.3l2.07-.63Z" opacity=".65"/>',
  },
  trash:  { o: '<path d="M4.4 6.6h15.2"/><path d="M9.6 6.6V5.2a1.8 1.8 0 0 1 1.8-1.8h1.2a1.8 1.8 0 0 1 1.8 1.8v1.4"/><path d="M6.6 6.6 7.4 19a1.8 1.8 0 0 0 1.8 1.6h5.6a1.8 1.8 0 0 0 1.8-1.6l.8-12.4"/><path d="M10.4 10.4v6.4M13.6 10.4v6.4"/>' },
  download: { o: '<path d="M12 3.6v11.2"/><path d="m7.6 10.4 4.4 4.4 4.4-4.4"/><path d="M4.4 19.8h15.2"/>' },
  upload:   { o: '<path d="M12 20.4V9.2"/><path d="m7.6 13.6 4.4-4.4 4.4 4.4"/><path d="M4.4 4.2h15.2"/>' },
  person: {
    o: '<circle cx="12" cy="8.2" r="4"/><path d="M4.6 20.4c1.3-3.9 3.9-5.8 7.4-5.8s6.1 1.9 7.4 5.8"/>',
    f: '<circle cx="12" cy="8" r="4.4"/><path d="M12 13.8c3.9 0 6.8 2.4 7.8 6.5a1 1 0 0 1-.97 1.24H5.17a1 1 0 0 1-.97-1.24c1-4.1 3.9-6.5 7.8-6.5Z"/>',
  },
  globe:  { o: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.3 2.5 3.5 5.4 3.5 8.6S14.3 18.1 12 20.6C9.7 18.1 8.5 15.2 8.5 12S9.7 5.9 12 3.4Z"/>' },
  exit:   { o: '<path d="M14.6 7.2V5.8a2 2 0 0 0-2-2H6.4a2 2 0 0 0-2 2v12.4a2 2 0 0 0 2 2h6.2a2 2 0 0 0 2-2v-1.4"/><path d="M9.6 12h10M16.4 8.6 19.8 12l-3.4 3.4"/>' },
  grip:   { o: '<circle cx="9" cy="6.4" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="6.4" r="1.6" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="9" cy="17.6" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="17.6" r="1.6" fill="currentColor" stroke="none"/>' },
  scissors: { o: '<circle cx="6.6" cy="6.4" r="2.6"/><circle cx="6.6" cy="17.6" r="2.6"/><path d="M8.8 8.2 20 17.2M20 6.8 8.8 15.8"/>' },
  bell: {
    o: '<path d="M6.2 10.4a5.8 5.8 0 0 1 11.6 0v3.4l1.6 3H4.6l1.6-3Z"/><path d="M10 19.6a2.2 2.2 0 0 0 4 0"/>',
    f: '<path d="M12 2.6a6.8 6.8 0 0 1 6.8 6.8v3.86l1.48 2.78a1 1 0 0 1-.88 1.47H4.6a1 1 0 0 1-.88-1.47L5.2 13.26V9.4A6.8 6.8 0 0 1 12 2.6Z"/><path d="M9.6 19.2h4.8a2.4 2.4 0 0 1-4.8 0Z"/>',
  },
  info:   { o: '<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.4"/><circle cx="12" cy="7.9" r="1.15" fill="currentColor" stroke="none"/>' },
  shuffle: { o: '<path d="M3.6 6.6h3.2c1.4 0 2.6.8 3.4 2l3.6 6.8c.8 1.2 2 2 3.4 2h3.2"/><path d="M3.6 17.4h3.2c1.4 0 2.6-.8 3.4-2"/><path d="M14.4 8.6c.8-1.2 2-2 3.4-2h3.2"/><path d="m17.8 3.6 3 3-3 3M17.8 14.4l3 3-3 3"/>' },
  sort:   { o: '<path d="M6.4 4.8v14.4M6.4 19.2 3.2 16M17.6 19.2V4.8M17.6 4.8 20.8 8"/>' },
  refresh: { o: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.4 3.8v5h-5"/>' },
};

export const ICON_NAMES = Object.keys(P);

/**
 * Ein Icon. `filled` schaltet auf die massive Fassung, wenn es sie gibt —
 * das ist der Aktiv-Zustand in dieser Version.
 */
export function icon(name, { size = 22, filled = false, cls = '' } = {}) {
  const def = P[name];
  if (!def) throw new Error(`V5: Icon "${name}" gibt es nicht`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `ico ${cls}`.trim());
  const solid = filled && def.f;
  if (solid) {
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('stroke', 'none');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.innerHTML = solid ? def.f : def.o;
  return svg;
}

/**
 * Kontur und Füllung übereinander. Der Wechsel blendet die Füllung ein und
 * lässt sie kurz überschwingen — dadurch wird aus „Farbe ändert sich" ein
 * spürbares Einrasten. Das ist der Tab-Bar-Effekt aktueller Systeme.
 */
export function iconPair(name, { size = 24, active = false } = {}) {
  const wrap = document.createElement('span');
  wrap.className = 'ico-pair' + (active ? ' is-on' : '');
  wrap.style.setProperty('--ico-size', `${size}px`);
  wrap.appendChild(icon(name, { size, filled: false, cls: 'ico-o' }));
  if (P[name].f) wrap.appendChild(icon(name, { size, filled: true, cls: 'ico-f' }));
  return wrap;
}

export const hasFilled = (name) => Boolean(P[name]?.f);
