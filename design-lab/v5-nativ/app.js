/**
 * TSUGI V5 — „Gerät"
 * ==================
 * Entwurf, kein Produkt: Vanilla JS, kein Build, kein React, keine Tests.
 * Der Zustand lebt im Speicher — ein Neuladen setzt alles zurück. Das ist
 * Absicht: hier soll das DESIGN beurteilt werden.
 *
 * Was trotzdem echt funktioniert, damit die Bewegungen prüfbar sind:
 *   · Titel suchen und hinzufügen (mit Statuswahl) — jede Kategorie hat eine
 *     eigene Einflug-Bewegung
 *   · Episode +1 / −1 (Ring, Balken und Zahl laufen mit)
 *   · Status wechseln (die Karte wechselt Farbe, Zeichen UND Verhalten)
 *   · Wertung setzen, Eintrag entfernen, Zufallsroller
 *   · Panels, Tabs, Detailseite, Suche, Meldungen
 */

import { h, clear, num, clamp, reducedMotion, finePointer } from '../shared/dom.js';
import { defineScreens, startRouter, go, refresh, currentScreen } from '../shared/router.js';
import * as D from '../shared/mock.js';
import { icon, iconPair, ICON_NAMES, hasFilled } from './icons.js';

/* =============================================================== Zustand == */

/** Eigene, veränderbare Kopie — der geteilte Datensatz bleibt unangetastet. */
const state = {
  lib: D.LIBRARY.map((e) => ({ ...e, seasons: [...e.seasons] })),
  panel: 'watching',      // Startbildschirm: welches der drei Panels
  libTab: 'completed',    // Bibliothek: welcher Status-Tab
  genre: null,            // Entdecken: gewähltes Genre
  detailId: D.DETAIL_ENTRY.rootId,
  justAdded: null,        // rootId, dessen Karte einmalig einfliegt
  lang: 'de',
  heroIdx: 0,             // Home: welche „Weiter schauen“-Serie steht vorn
};

/** Die Namen bleiben unverändert — sie kommen aus dem echten Datenmodell.
    Reihenfolge: Bibliothek direkt neben Home, Entdecken in der Mitte. */
const NAV = [
  { key: 'home', label: 'Home', ico: 'home' },
  { key: 'bibliothek', label: 'Bibliothek', ico: 'stack' },
  { key: 'entdecken', label: 'Entdecken', ico: 'compass' },
  { key: 'statistik', label: 'Statistik', ico: 'chart' },
  { key: 'einstellungen', label: 'Einstellungen', ico: 'gear' },
];

/** Kategorie → Zeichen. Fünf Status, fünf Symbole, überall dasselbe. */
const ST_ICON = {
  watching: 'play',
  nextup: 'ready',
  planned: 'bookmark',
  continuation: 'clock',
  completed: 'seal',
};

/** Welche Kategorie färbt welchen Bildschirm ein. */
const SCREEN_TONE = {
  home: () => state.panel,
  bibliothek: () => state.libTab,
  entdecken: () => 'watching',
  detail: () => entry(state.detailId)?.status ?? 'watching',
  statistik: () => 'completed',
  einstellungen: () => 'watching',
  bausteine: () => 'watching',
};

const HOME_PANELS = ['watching', 'nextup', 'planned'];

const entry = (id) => state.lib.find((e) => e.rootId === Number(id));
const byStatus = (s) => state.lib.filter((e) => e.status === s);
const countOf = (s) => byStatus(s).length;

/* ================================================================ Helfer == */

let toastTimer = 0;
function toast(text, tone = 'watching', ico = 'check') {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const t = h('div.toast', { role: 'status', 'data-st': tone },
    h('span.toast__ico', {}, icon(ico, { size: 18, filled: hasFilled(ico) })),
    h('span', {}, text));
  document.body.appendChild(t);
  toastTimer = setTimeout(() => {
    t.classList.add('is-out');
    setTimeout(() => t.remove(), 220);
  }, 2400);
}

function art(media, wide = false) {
  const src = wide ? (media?.banner ?? media?.cover) : media?.cover;
  return src ? h('img', { src, alt: '', loading: 'lazy', decoding: 'async' }) : null;
}

function btn(label, opts = {}) {
  const { variant = '', ico = null, onClick = null, sm = false, disabled = false, wide = false, filled = true, cls = '' } = opts;
  const b = h('button.btn'
    + (variant ? `.btn--${variant}` : '')
    + (sm ? '.btn--sm' : '')
    + (wide ? '.btn--wide' : '')
    + (cls ? `.${cls}` : ''),
    { type: 'button', disabled: disabled || null, onclick: onClick || undefined });
  if (ico) b.appendChild(icon(ico, { size: sm ? 16 : 18, filled: filled && hasFilled(ico) }));
  if (label) b.appendChild(h('span', {}, label));
  return b;
}

function iconBtn(name, label, opts = {}) {
  const { onClick = null, sm = false, filled = false, cls = '' } = opts;
  return h('button.iconbtn' + (sm ? '.iconbtn--sm' : '') + (cls ? `.${cls}` : ''),
    { type: 'button', 'aria-label': label, title: label, onclick: onClick || undefined },
    icon(name, { size: sm ? 17 : 20, filled: filled && hasFilled(name) }));
}

function tag(status, { float = false, solid = false, text = null } = {}) {
  return h('span.tag' + (float ? '.tag--float' : '') + (solid ? '.tag--solid' : ''),
    { 'data-st': status },
    icon(ST_ICON[status], { size: 13, filled: true }),
    h('span', {}, text ?? D.STATUS_LABEL[status]));
}

/** Fortschrittsring. `pct` 0..1. */
function ring(pct, { size = 46, w = 4, label = null } = {}) {
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  const svg = h('svg.ring', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' },
    h('circle.ring__track', { cx: size / 2, cy: size / 2, r, 'stroke-width': w }),
    h('circle.ring__bar', {
      cx: size / 2, cy: size / 2, r, 'stroke-width': w,
      'stroke-dasharray': c.toFixed(1),
      'stroke-dashoffset': (c * (1 - clamp(pct, 0, 1))).toFixed(1),
    }));
  return h('span.ring-wrap', {}, svg, label ? h('span.ring-wrap__label.tnum', {}, label) : null);
}

/** Untertitel einer Karte — sagt in jeder Kategorie etwas anderes. */
function cardSub(e) {
  const s = D.currentSeason(e);
  switch (e.status) {
    case 'watching':
      return `Staffel ${D.seasonNo(e)} · Ep. ${e.progress}/${s?.episodes ?? '?'}`;
    case 'nextup':
      return s?.format === 'MOVIE' ? 'Film wartet' : `Staffel ${D.seasonNo(e)} wartet`;
    case 'planned':
      return D.seasonTag(e.seasons[0]) ?? 'Vorgemerkt';
    case 'continuation':
      return e.releaseNote ?? 'Datum unbekannt';
    case 'completed':
      return `${D.watchedEpisodes(e)} Episoden · ${e.rating ? `${e.rating}/10` : 'ohne Wertung'}`;
    default:
      return '';
  }
}

/**
 * Kurzform für die Wartemarke auf dem Cover — die Marke ist eine feste Pille,
 * keine Fließtextzeile. „37 T 15 Std" oder „Oktober 2027" sprengten sie auf
 * schmalen Karten (Rastermindestbreite 104 px). Volle Countdowns und Monate
 * bleiben dort, wo Platz ist (Detailseite, Bibliotheks-Fließtext).
 */
function compactWhen(e, s) {
  if (s?.nextAiring) {
    const { d, h: hh, m } = D.countdown(s.nextAiring.airingAt);
    if (d > 0) return `${d} T`;
    if (hh > 0) return `${hh} Std`;
    return `${m} Min`;
  }
  const raw = e.releaseNote ?? 'offen';
  const [first, rest] = raw.split(' ');
  // Nur ein echter Monatsname wird gekürzt — ein nackter Jahreswert
  // („2027") darf nicht mitten in die Ziffern geschnitten werden.
  if (rest && /^[A-Za-zÄÖÜäöü]+$/.test(first)) return `${first.slice(0, 3)}. ${rest}`;
  return raw;
}

/**
 * DIE Karte. Eine Bauform, fünf Charaktere — der Unterschied steckt in der
 * Behandlung des Covers, im Zeichen und (auf dem PC) in der Bewegung.
 */
function card(e, { showTag = false } = {}) {
  const media = D.currentSeason(e) ?? e.seasons[0];
  const st = e.status;
  const inner = h('div.card__art', {}, art(media));

  if (st === 'watching') {
    inner.appendChild(h('div.card__prog', {}, h('i', { style: { width: `${(D.seasonPct(e) * 100).toFixed(1)}%` } })));
    const knob = h('button.card__knob', {
      type: 'button',
      'aria-label': `Weiter mit Episode ${e.progress + 1}`,
      onclick: (ev) => { ev.stopPropagation(); ev.preventDefault(); bumpEpisode(e, +1); },
    }, icon('play', { size: 16, filled: true }));
    inner.appendChild(knob);
  }
  if (st === 'nextup') {
    // Ohne Zeichen wäre „Noch zu schauen" auf dem Handy die einzige Kategorie,
    // die man im Ruhezustand nicht erkennt — der Ausfahr-Effekt gibt es dort
    // nicht. Also dasselbe Prinzip wie beim Siegel: eine kleine Marke.
    inner.appendChild(h('span.ready-badge', {}, icon('ready', { size: 15, filled: true })));
  }
  if (st === 'planned') {
    inner.appendChild(h('svg.ribbon', { viewBox: '0 0 22 30', 'aria-hidden': 'true' },
      h('path', { d: 'M0 0h22v27.4a1 1 0 0 1-1.55.83L11 22l-9.45 6.23A1 1 0 0 1 0 27.4Z', fill: 'currentColor' })));
  }
  if (st === 'continuation') {
    const s = D.currentSeason(e);
    inner.appendChild(h('span.wait', {},
      h('svg', { viewBox: '0 0 24 24', width: 13, height: 13, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'aria-hidden': 'true' },
        h('circle', { cx: 12, cy: 12, r: 8.6 }),
        h('path.tick', { d: 'M12 12V6.8' })),
      h('span.wait__label', {}, compactWhen(e, s))));
  }
  if (st === 'completed') {
    inner.appendChild(h('span.seal-badge', {}, icon('seal', { size: 15, filled: true })));
  }
  if (showTag) inner.appendChild(tag(st, { float: true }));

  const el = h('a.card' + (state.justAdded === e.rootId ? '.just-added' : ''), {
    href: `#/detail/${e.rootId}`,
    'data-st': st,
    'data-entry': e.rootId,
  },
    inner,
    h('div.card__meta', {},
      h('div.card__title', {}, D.entryTitle(e)),
      h('div.card__sub', {}, cardSub(e))));
  return el;
}

/** Karte für einen Titel, der (noch) nicht in der Bibliothek liegt. */
/**
 * Katalog-Karte für Entdecken/Suche/Empfehlungen — bewusst eine andere Bauform
 * als `card()`: kein Fortschritt, kein Knopf, keine Wartemarke. Die Bewegung
 * ist überall dieselbe (`.card--uniform` in theme.css), egal welche Kategorie
 * ein Titel in der eigenen Bibliothek gerade hat — die individuelle Bewegung
 * gehört den EIGENEN Listen (Home, Bibliothek), nicht dem Katalog.
 *
 * „Fortsetzung folgt" wird hier bewusst NICHT als Marke gezeigt: die Info
 * ist ein Spoiler für einen Titel, um den es an dieser Stelle nicht geht
 * (z. B. „Frieren" unter „Bestbewertet"). Wer es wissen will, findet es im
 * Franchise-Zeitstrahl der Detailseite.
 */
function mediaCard(media, { onClick = null } = {}) {
  const inLib = state.lib.find((e) => e.seasons.some((s) => s.id === media.id));
  const showTag = inLib && inLib.status !== 'continuation';
  const el = h('a.card.card--uniform', {
    href: inLib ? `#/detail/${inLib.rootId}` : '#/entdecken',
    'data-st': inLib ? inLib.status : 'watching',
    onclick: onClick ? (ev) => { if (!inLib) { ev.preventDefault(); onClick(media); } } : undefined,
  },
    h('div.card__art', {}, art(media), showTag ? tag(inLib.status, { float: true }) : null),
    h('div.card__meta', {},
      h('div.card__title', {}, media.title),
      h('div.card__sub', {}, [D.FORMAT_LABEL[media.format] ?? 'TV', D.seasonTag(media)].filter(Boolean).join(' · '))));
  return el;
}

function sectionHead(title, { count = null, tone = null, more = null, kana = null }) {
  return h('div.sechead', tone ? { 'data-st': tone } : {},
    h('span.sechead__rail'),
    h('h2.h-sec', {}, title),
    kana ? h('span.kana', {}, kana) : null,
    count !== null ? h('span.sechead__count.tnum', {}, num(count)) : null,
    more ? h('span.sechead__more', {}, more) : null);
}

function emptyState(status, title, hint, action = null) {
  return h('div.empty', { 'data-st': status },
    h('span.empty__ico', {}, icon(ST_ICON[status], { size: 24, filled: true })),
    h('p.empty__t', {}, title),
    h('p.empty__h', {}, hint),
    action ? h('div', { style: { marginTop: '16px', display: 'flex', justifyContent: 'center' } }, action) : null);
}

/* ======================================================= Zustandsaktionen = */

/** Episode hoch/runter — Ring, Balken und Zahl laufen mit. */
function bumpEpisode(e, delta) {
  const s = D.currentSeason(e);
  const max = s?.episodes ?? 9999;
  const next = clamp(e.progress + delta, 0, max);
  if (next === e.progress) return;
  e.progress = next;
  if (e.status !== 'watching' && next > 0) e.status = 'watching';
  // Staffel durch? Dann wandert der Eintrag sichtbar in eine andere Kategorie.
  if (s?.episodes && next >= s.episodes) {
    if (e.seasonIndex < e.seasons.length - 1) {
      e.status = 'nextup';
    } else {
      e.status = 'completed';
    }
  }
  refresh();
  if (delta > 0) {
    const label = e.status === 'completed' ? 'Abgeschlossen' : `Episode ${next} abgehakt`;
    toast(label, e.status, ST_ICON[e.status]);
  }
}

function setStatus(e, status) {
  if (e.status === status) return;
  e.status = status;
  if (status === 'completed') {
    const s = D.currentSeason(e);
    if (s?.episodes) e.progress = s.episodes;
  }
  if (status === 'planned' || status === 'continuation') e.progress = 0;
  state.justAdded = e.rootId;
  refresh();
  setTimeout(() => { state.justAdded = null; }, 900);
  toast(`Verschoben nach „${D.STATUS_LABEL[status]}"`, status, ST_ICON[status]);
}

function removeEntry(e) {
  state.lib = state.lib.filter((x) => x !== e);
  toast('Aus der Bibliothek entfernt', 'planned', 'trash');
  go('bibliothek');
  refresh();
}

/** Neuen Titel anlegen — Staffeln kommen aus der Franchise-Linie. */
function addMedia(media, status) {
  const seasons = D.franchiseOf(media.id);
  const idx = Math.max(0, seasons.findIndex((s) => s.id === media.id));
  const rootId = seasons[0]?.id ?? media.id;
  if (entry(rootId)) { toast('Liegt schon in deiner Bibliothek', 'planned', 'info'); return; }

  const e = {
    rootId,
    status,
    seasons,
    seasonIndex: status === 'completed' ? seasons.length - 1 : idx,
    progress: 0,
    rating: null,
    notes: '',
    genres: seasons[0]?.genres ?? [],
    addedAt: Date.now(),
    updatedAt: Date.now(),
    releaseNote: null,
  };
  if (status === 'completed') {
    const s = seasons[e.seasonIndex];
    e.progress = s?.episodes ?? 0;
  }
  if (status === 'continuation') e.releaseNote = D.releaseLabel(seasons[e.seasonIndex]);
  state.lib.unshift(e);

  state.justAdded = rootId;
  // Dorthin springen, wo der neue Eintrag jetzt liegt — sonst passiert die
  // Bewegung auf einem Bildschirm, den niemand sieht.
  if (HOME_PANELS.includes(status)) { state.panel = status; go('home'); }
  else { state.libTab = status; go('bibliothek'); }
  refresh();
  setTimeout(() => { state.justAdded = null; }, 1000);
  toast(`Zu „${D.STATUS_LABEL[status]}" hinzugefügt`, status, ST_ICON[status]);
}

/* ================================================================= Blatt == */

let sheetEl = null;
function closeSheet() {
  if (!sheetEl) return;
  const { scrim, sheet } = sheetEl;
  sheetEl = null;
  scrim.classList.add('is-out');
  sheet.classList.add('is-out');
  setTimeout(() => { scrim.remove(); sheet.remove(); }, 260);
}

function openSheet(title, buildBody) {
  closeSheet();
  const scrim = h('div.scrim', { onclick: closeSheet });
  const sheet = h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('span.sheet__grip'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' } },
      h('h2.sheet__t', { style: { flex: '1' } }, title),
      iconBtn('x', 'Schließen', { sm: true, onClick: closeSheet, cls: 'iconbtn--bare' })),
    h('div.sheet__body', {}, buildBody(closeSheet)));
  document.body.append(scrim, sheet);
  sheetEl = { scrim, sheet };
  sheet.querySelector('button, a, input')?.focus?.();
}

/** Statuswahl — dieselbe Liste beim Hinzufügen und beim Verschieben. */
function statusPicker(current, onPick) {
  const hints = {
    watching: 'Läuft gerade — Fortschritt wird gezählt',
    nextup: 'Steht bereit, Staffel oder Film ist offen',
    planned: 'Nur vorgemerkt, noch nicht gestartet',
    continuation: 'Fortsetzung ist angekündigt',
    completed: 'Durchgeschaut und abgelegt',
  };
  return D.STATUS_ORDER.map((s) => h('button.pickrow' + (s === current ? '.is-on' : ''), {
    type: 'button', 'data-st': s,
    onclick: () => onPick(s),
  },
    h('span.pickrow__ico', {}, icon(ST_ICON[s], { size: 19, filled: true })),
    h('span', { style: { flex: '1', minWidth: '0' } },
      h('span.pickrow__t', { style: { display: 'block' } }, D.STATUS_LABEL[s]),
      h('span.pickrow__s', { style: { display: 'block' } }, hints[s])),
    s === current ? icon('check', { size: 18 }) : null));
}

function confirmDialog(title, message, confirmLabel, onConfirm) {
  openSheet(title, (close) => h('div', {},
    h('p.sub', { style: { marginBottom: '18px' } }, message),
    h('div', { style: { display: 'flex', gap: '10px' } },
      btn('Abbrechen', { variant: 'quiet', onClick: close, wide: true }),
      btn(confirmLabel, { variant: 'danger', wide: true, ico: 'trash', filled: false, onClick: () => { close(); onConfirm(); } }))));
}

/* ================================================================= Suche == */

/** Damit ein Bildschirmwechsel nie eine offene Ebene stehen lässt. */
let closePalette = null;

function openSearch(prefill = '') {
  closeSheet();
  closePalette?.();
  const scrim = h('div.scrim', { onclick: close });
  const list = h('div.pal__list');
  const input = h('input.pal__input', {
    type: 'search', placeholder: 'Anime oder Film suchen …', 'aria-label': 'Suche',
    value: prefill, autocomplete: 'off', spellcheck: 'false',
  });

  function close() {
    closePalette = null;
    scrim.classList.add('is-out');
    pal.style.opacity = '0';
    setTimeout(() => { scrim.remove(); pal.remove(); }, 200);
    document.removeEventListener('keydown', onKey);
  }
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  function results(q) {
    clear(list);
    const query = q.trim().toLowerCase();
    if (query.length < 2) {
      list.appendChild(sectionHead('Zuletzt gesucht', { tone: 'watching' }));
      list.appendChild(h('div.shelf', {}, D.SEARCH_RECENT.map((m) => mediaCard(m, { onClick: pick }))));
      list.appendChild(sectionHead('Schnellaktionen', { tone: 'nextup' }));
      list.appendChild(h('div.group', {},
        D.SEARCH_ACTIONS.map((a) => h('button.setrow', { type: 'button', 'data-st': 'nextup', onclick: () => { close(); if (a.key === 'stats') go('statistik'); if (a.key === 'random') rollRandom(); } },
          h('span.setrow__ico', {}, icon(a.key === 'random' ? 'dice' : a.key === 'stats' ? 'chart' : a.key === 'lang' ? 'globe' : 'plus', { size: 17, filled: true })),
          h('span.setrow__body', {},
            h('span.setrow__t', { style: { display: 'block' } }, a.label),
            h('span.setrow__s', { style: { display: 'block' } }, a.hint)),
          icon('right', { size: 16 })))));
      return;
    }
    const hits = Object.values(D.MEDIA)
      .filter((m) => m.title.toLowerCase().includes(query) || (m.romaji ?? '').toLowerCase().includes(query))
      .slice(0, 24);
    if (!hits.length) {
      list.appendChild(h('p.muted', { style: { padding: '26px 8px', textAlign: 'center' } }, `Nichts gefunden für „${q}"`));
      return;
    }
    list.appendChild(sectionHead(`${hits.length} Treffer`, { tone: 'watching' }));
    list.appendChild(h('div.grid', {}, hits.map((m) => mediaCard(m, { onClick: pick }))));
  }

  function pick(media) {
    close();
    openSheet('Hinzufügen', (closeIt) => h('div', {},
      h('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } },
        h('span', { style: { width: '58px', flex: 'none', borderRadius: '10px', overflow: 'hidden', aspectRatio: '2/3', background: 'var(--s2)' } }, art(media)),
        h('span', { style: { minWidth: '0' } },
          h('span', { style: { display: 'block', fontSize: '15px', fontWeight: '680', letterSpacing: '-0.02em' } }, media.title),
          h('span.muted', { style: { display: 'block', marginTop: '4px' } },
            [D.FORMAT_LABEL[media.format] ?? 'TV', D.seasonTag(media), media.episodes ? `${media.episodes} Folgen` : null].filter(Boolean).join(' · ')))),
      h('p.muted', { style: { marginBottom: '12px' } }, 'Wo soll der Titel landen?'),
      statusPicker(null, (s) => { closeIt(); addMedia(media, s); })));
  }

  const pal = h('div.pal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Suche', style: { transition: 'opacity .18s' } },
    h('div.pal__bar', {},
      h('label.pal__field', {}, icon('search', { size: 18 }), input),
      btn('Abbrechen', { variant: 'quiet', sm: true, onClick: close })),
    list);

  document.body.append(scrim, pal);
  closePalette = close;
  // Ein Treffer, der schon in der Bibliothek liegt, führt direkt zur
  // Detailseite — dann muss die Palette mitgehen, sonst bleibt sie über dem
  // neuen Bildschirm liegen.
  pal.addEventListener('click', (ev) => {
    if (ev.target instanceof Element && ev.target.closest('a[href^="#/"]')) close();
  });
  input.addEventListener('input', () => results(input.value));
  results(prefill);
  input.focus();
}

/** Zufallsroller: würfelt aus Watchlist + „Noch zu schauen". */
function rollRandom() {
  const pool = [...byStatus('planned'), ...byStatus('nextup')];
  if (!pool.length) { toast('Nichts zum Würfeln da', 'planned', 'info'); return; }
  openSheet('Für mich entscheiden', () => {
    const slot = h('div', { style: { minHeight: '210px', display: 'grid', placeItems: 'center' } });
    const wrap = h('div', {}, slot,
      h('div', { style: { display: 'flex', gap: '10px', marginTop: '16px' } }));
    let i = 0;
    let ticks = reducedMotion() ? 1 : 14;
    const step = () => {
      const e = pool[i++ % pool.length];
      clear(slot);
      const c = card(e);
      c.style.width = '150px';
      slot.appendChild(c);
      if (--ticks > 0) setTimeout(step, 60 + (14 - ticks) * 16);
      else {
        slot.animate?.([{ transform: 'scale(.94)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
          { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        wrap.lastChild.append(
          btn('Nochmal', { variant: 'quiet', ico: 'dice', wide: true, filled: false, onClick: () => { ticks = 10; step(); } }),
          btn('Jetzt ansehen', { variant: 'primary', ico: 'play', wide: true, onClick: () => { closeSheet(); go('detail', e.rootId); } }));
      }
    };
    // zufälliger Startpunkt, damit nicht immer derselbe Titel gewinnt
    i = Math.floor(Math.random() * pool.length);
    step();
    return wrap;
  });
}

/* ================================================ Segmentierte Auswahl ==== */

/**
 * Der Daumen gleitet zur gewählten Fläche UND passt seine Breite an — das
 * ist der Formwechsel, der in der aktuellen App fehlt (dort ändert sich nur
 * die Farbe).
 */
function segmented(items, active, onPick, { tone = true } = {}) {
  const idx = Math.max(0, items.findIndex((x) => x.key === active));
  const thumb = h('span.seg__thumb' + (tone ? '.is-tone' : ''));
  /**
   * Der Daumen wird NICHT gemessen, sondern gerechnet: gleich breite
   * Segmente, Breite = (100 % − Polster) / Anzahl, Versatz = Index × 100 %.
   * Eine gemessene Fassung hing an `requestAnimationFrame` — und genau das
   * läuft in einer versteckten Vorschau nie. Reines CSS sitzt sofort richtig,
   * auch beim allerersten Bild.
   */
  const seg = h('div.seg', { role: 'tablist', 'data-st': tone ? active : null }, thumb);
  // Eigene CSS-Variablen brauchen setProperty — über style-Objekte kommen sie
  // nicht durch.
  seg.style.setProperty('--n', String(items.length));
  seg.style.setProperty('--i', String(idx));
  for (const it of items) {
    const b = h('button.seg__btn' + (it.key === active ? '.is-on' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(it.key === active),
      onclick: () => onPick(it.key),
    },
      it.ico ? icon(it.ico, { size: 15, filled: it.key === active && hasFilled(it.ico) }) : null,
      h('span', {}, it.label),
      it.count !== undefined ? h('span.seg__count.tnum.seg-count', {}, num(it.count)) : null);
    if (it.key === active) b.style.setProperty('--seg-on', 'var(--tone-on)');
    seg.appendChild(b);
  }

  return seg;
}

/* ======================================================= Bildschirm: Home = */

/** Zeigerwechsel der Frontplatte — hält sich an die Länge der aktuellen Liste. */
function shiftHero(delta) {
  const list = byStatus('watching');
  if (!list.length) return;
  state.heroIdx = ((state.heroIdx + delta) % list.length + list.length) % list.length;
  refresh();
}

function screenHome() {
  const wrap = h('div');
  const hour = new Date().getHours();
  const watching = byStatus('watching');
  const heroIdx = watching.length ? clamp(state.heroIdx, 0, watching.length - 1) : 0;
  state.heroIdx = heroIdx;
  const hero = watching[heroIdx];

  wrap.appendChild(h('header', { style: { marginBottom: '16px' } },
    h('h1.h-large', {}, hour >= 17 ? 'Guten Abend' : 'Hey'),
    h('p.sub', { style: { marginTop: '4px' } },
      watching.length
        ? `${num(watching.length)} ${watching.length === 1 ? 'Serie läuft' : 'Serien laufen'} gerade in deinem Archiv.`
        : 'Dein Archiv, dein Tempo.')));

  /* ---- Die laufende Serie als Gerät-Frontplatte --------------------- */
  if (hero) {
    const s = D.currentSeason(hero);
    wrap.appendChild(h('section.hero', { 'data-st': 'watching' },
      h('div.hero__bg', {}, art(hero.seasons.find((x) => x.banner) ?? s, true)),
      h('div.hero__in', {},
        h('a.hero__cover', { href: `#/detail/${hero.rootId}`, 'aria-label': D.entryTitle(hero) },
          art(s),
          // Der Ring sitzt auf der Hülle statt in der Knopfreihe: auf dem
          // Handy sprengte er sonst die Zeile und schob den Würfel um.
          h('span.hero__ring', {}, ring(D.seasonPct(hero), { size: 40, w: 3.5, label: `${Math.round(D.seasonPct(hero) * 100)}` }))),
        h('div.hero__body', {},
          h('div.hero__head', {},
            h('span.kicker', {}, h('span.dot'), 'Weiter schauen'),
            // Umschalter nur, wenn es wirklich was zum Umschalten gibt —
            // sonst zeigt ein einzelner Eintrag zwei tote Pfeile.
            watching.length > 1 ? h('div.hero__switch', {},
              iconBtn('left', 'Vorherige Serie', { sm: true, cls: 'iconbtn--bare', onClick: () => shiftHero(-1) }),
              h('span.hero__idx.tnum', {}, `${heroIdx + 1}/${watching.length}`),
              iconBtn('right', 'Nächste Serie', { sm: true, cls: 'iconbtn--bare', onClick: () => shiftHero(1) })) : null),
          h('h2.hero__title', { style: { marginTop: '6px' } }, D.entryTitle(hero)),
          h('p.hero__line', {}, `Staffel ${D.seasonNo(hero)} · Episode ${hero.progress} von ${s?.episodes ?? '?'}`),
          h('div.hero__acts', {},
            btn(`Weiter mit Ep. ${hero.progress + 1}`, { variant: 'primary', ico: 'play', onClick: () => bumpEpisode(hero, +1) }),
            iconBtn('dice', 'Für mich entscheiden', { onClick: rollRandom }))),
        // Ab Laptop steht rechts die Episodensteuerung — sonst bliebe die
        // rechte Hälfte der Frontplatte leer.
        h('div.hero__side', {},
          h('span.muted', { style: { display: 'block', marginBottom: '8px' } }, 'Fortschritt'),
          h('div.stepper', {},
            h('button.stepper__btn', { type: 'button', 'aria-label': 'Eine Episode zurück', disabled: hero.progress <= 0 || null, onclick: () => bumpEpisode(hero, -1) }, icon('minus', { size: 18 })),
            h('span.stepper__val', {}, h('span.roll-up', {}, String(hero.progress))),
            h('button.stepper__btn', { type: 'button', 'aria-label': 'Eine Episode weiter', onclick: () => bumpEpisode(hero, +1) }, icon('plus', { size: 18 })))))));
  }

  /* ---- Drei Panels: die Namen bleiben, das Verhalten ändert sich ---- */
  const panelWrap = h('div', { style: { marginTop: '22px' } });
  panelWrap.appendChild(segmented(
    HOME_PANELS.map((s) => ({ key: s, label: D.STATUS_LABEL[s], count: countOf(s), ico: ST_ICON[s] })),
    state.panel,
    (k) => { state.panel = k; refresh(); },
  ));

  const list = byStatus(state.panel);
  const body = h('div.panel-body', { style: { marginTop: '16px' }, 'data-st': state.panel });
  if (!list.length) {
    const hints = {
      watching: ['Gerade läuft nichts', 'Starte was von „Noch zu schauen" oder deiner Watchlist.'],
      nextup: ['Keine offenen Staffeln', 'Sobald ein Franchise weitergeht, taucht es hier auf.'],
      planned: ['Deine Watchlist ist leer', 'Merk dir was unter Entdecken vor.'],
    };
    body.appendChild(emptyState(state.panel, hints[state.panel][0], hints[state.panel][1],
      btn('Titel suchen', { variant: 'primary', ico: 'search', onClick: () => openSearch() })));
  } else {
    // Watchlist-Einträge dürfen auf dem PC etwas größer stehen als die
    // beiden anderen Panels.
    body.appendChild(h('div.grid' + (state.panel === 'planned' ? '.grid--roomy' : ''), {}, list.map((e) => card(e))));
  }
  panelWrap.appendChild(body);
  wrap.appendChild(panelWrap);

  return wrap;
}

/* ================================================= Bildschirm: Bibliothek = */

function screenLibrary() {
  const wrap = h('div');
  wrap.appendChild(h('header', { style: { marginBottom: '16px' } },
    h('h1.h-large', {}, 'Bibliothek'),
    h('p.sub', { style: { marginTop: '4px' } }, `${num(state.lib.length)} Franchises in deinem Archiv.`)));

  wrap.appendChild(segmented(
    D.LIBRARY_TABS.map((s) => ({ key: s, label: D.STATUS_LABEL[s], count: countOf(s), ico: ST_ICON[s] })),
    state.libTab,
    (k) => { state.libTab = k; refresh(); },
  ));

  const list = byStatus(state.libTab);
  const body = h('div', { style: { marginTop: '18px' }, 'data-st': state.libTab });

  if (!list.length) {
    body.appendChild(emptyState(state.libTab, `Nichts unter „${D.STATUS_LABEL[state.libTab]}"`,
      'Ändere den Status eines Titels oder füg etwas Neues hinzu.',
      btn('Anime suchen', { variant: 'primary', ico: 'search', onClick: () => openSearch() })));
  } else if (state.libTab === 'completed') {
    /* Geschaut = Rangliste. Bewusst KEIN Poster-Raster: eine andere
       Kategorie soll sich auch anders anfühlen, nicht nur anders färben. */
    const ranked = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    body.appendChild(h('p.muted', { style: { margin: '0 0 8px', paddingLeft: '4px' } }, 'Nach deiner Wertung sortiert · Greifpunkt zum Umsortieren'));
    body.appendChild(h('div.panel.panel--flush', {},
      ranked.map((e, i) => h('a.row-item' + (state.justAdded === e.rootId ? '.just-added' : ''), { href: `#/detail/${e.rootId}`, 'data-st': 'completed' },
        h('span.row-item__rank.tnum', {}, String(i + 1)),
        h('span.row-item__art', {}, art(D.currentSeason(e)), h('span.seal-badge', { style: { top: '5px', right: '5px', width: '24px', height: '24px' } }, icon('seal', { size: 14, filled: true }))),
        h('span.row-item__body', {},
          h('span.row-item__t', { style: { display: 'block' } }, D.entryTitle(e)),
          h('span.row-item__s', {},
            h('span', {}, `${num(D.watchedEpisodes(e))} ${D.watchedEpisodes(e) === 1 ? 'Episode' : 'Episoden'}`),
            h('span.dot', { style: { width: '3px', height: '3px', background: 'var(--ink-3)' } }),
            h('span', {}, `${e.seasons.length} ${e.seasons.length === 1 ? 'Staffel' : 'Staffeln'}`))),
        h('span.row-item__end', {},
          e.rating ? h('span.tag', { 'data-st': 'completed' }, icon('star', { size: 12, filled: true }), h('span.tnum', {}, `${e.rating}`)) : null,
          h('span', { style: { color: 'var(--ink-3)', display: 'grid' } }, icon('grip', { size: 18 })))))));
  } else if (state.libTab === 'continuation') {
    /* Fortsetzung folgt = Wartezimmer: gedämpft, mit laufender Uhr. */
    body.appendChild(h('p.muted', { style: { margin: '0 0 12px', paddingLeft: '4px' } }, 'Angekündigt, aber noch nicht da — die Einträge bleiben gedämpft, bis es losgeht.'));
    body.appendChild(h('div.grid.grid--roomy', {}, list.map((e) => card(e))));
  } else {
    // Nur noch die Watchlist landet hier (LIBRARY_TABS: Geschaut/Fortsetzung
    // folgt/Watchlist) — auch sie bekommt auf dem PC das etwas größere Raster.
    body.appendChild(h('div', { style: { display: 'flex', gap: '10px', marginBottom: '14px' } },
      btn('Für mich entscheiden', { variant: 'primary', ico: 'dice', onClick: rollRandom }),
      btn('Hinzufügen', { variant: 'quiet', ico: 'plus', filled: false, onClick: () => openSearch() })));
    body.appendChild(h('div.grid.grid--roomy', {}, list.map((e) => card(e))));
  }

  wrap.appendChild(body);
  return wrap;
}

/* ================================================== Bildschirm: Entdecken = */

function screenDiscover() {
  const wrap = h('div');
  const spot = D.DISCOVER.spotlight;

  wrap.appendChild(h('header', { style: { marginBottom: '14px' } },
    h('h1.h-large', {}, 'Entdecken'),
    h('p.sub', { style: { marginTop: '4px' } }, 'Was die Welt gerade schaut — und was du als Nächstes schauen könntest.')));

  wrap.appendChild(h('section.spot', { 'data-st': 'watching' },
    h('div.spot__bg', {}, art(spot, true)),
    h('div.spot__in', {},
      h('span.kicker', {}, h('span.dot'), 'Gerade das Gesprächsthema'),
      h('h2.spot__t', { style: { marginTop: '8px' } }, spot.title),
      h('p.spot__d', {}, spot.synopsis ?? ''),
      h('div.spot__acts', {},
        btn('Hinzufügen', { variant: 'primary', ico: 'plus', filled: false, onClick: () => openAddFor(spot) }),
        btn('Ansehen', { variant: 'quiet', ico: 'arrow', filled: false, onClick: () => openAddFor(spot) })))));

  wrap.appendChild(h('div.genrebar', { style: { marginTop: '18px' } },
    h('button.chip' + (state.genre === null ? '.is-on' : ''), { type: 'button', 'data-st': 'watching', onclick: () => { state.genre = null; refresh(); } }, 'Alles'),
    D.GENRES.map((g) => h('button.chip' + (state.genre === g ? '.is-on' : ''), {
      type: 'button', 'data-st': 'nextup',
      onclick: () => { state.genre = state.genre === g ? null : g; refresh(); },
    }, D.GENRE_LABEL[g] ?? g))));

  const rows = state.genre ? D.genreRows(state.genre) : D.DISCOVER.rows;
  for (const row of rows) {
    wrap.appendChild(sectionHead(row.title, { tone: 'watching', count: row.items.length }));
    wrap.appendChild(h('div.shelf.shelf--wide', {}, row.items.map((m) => mediaCard(m, { onClick: openAddFor }))));
  }
  return wrap;
}

/** „Hinzufügen"-Blatt für einen Titel aus Entdecken/Suche. */
function openAddFor(media) {
  const existing = state.lib.find((e) => e.seasons.some((s) => s.id === media.id));
  if (existing) { go('detail', existing.rootId); return; }
  openSheet('Hinzufügen', (close) => h('div', {},
    h('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } },
      h('span', { style: { width: '58px', flex: 'none', borderRadius: '10px', overflow: 'hidden', aspectRatio: '2/3', background: 'var(--s2)' } }, art(media)),
      h('span', { style: { minWidth: '0' } },
        h('span', { style: { display: 'block', fontSize: '15px', fontWeight: '680', letterSpacing: '-0.02em' } }, media.title),
        h('span.muted', { style: { display: 'block', marginTop: '4px' } },
          [D.FORMAT_LABEL[media.format] ?? 'TV', D.seasonTag(media), media.episodes ? `${media.episodes} Folgen` : null].filter(Boolean).join(' · ')))),
    h('p.muted', { style: { marginBottom: '12px' } }, 'Wo soll der Titel landen?'),
    statusPicker(null, (s) => { close(); addMedia(media, s); })));
}

/* ===================================================== Bildschirm: Detail = */

function screenDetail(params) {
  if (params?.[0]) state.detailId = Number(params[0]);
  const e = entry(state.detailId) ?? state.lib[0];
  if (!e) return h('div', {}, emptyState('planned', 'Kein Eintrag', 'Die Bibliothek ist leer.'));
  state.detailId = e.rootId;

  const s = D.currentSeason(e);
  const wrap = h('div', { 'data-st': e.status });
  const line = D.franchiseOf(s?.id ?? e.rootId);
  const labels = D.timelineLabels(line);

  wrap.appendChild(h('div.det__banner', {},
    art(e.seasons.find((x) => x.banner) ?? s, true),
    h('div.det__back', {}, iconBtn('left', 'Zurück', { onClick: () => history.back() }))));

  wrap.appendChild(h('div.det__head', {},
    h('span.det__cover', {}, art(s)),
    h('div.det__headbody', {},
      tag(e.status),
      h('h1.det__t', { style: { marginTop: '8px' } }, D.entryTitle(e)),
      h('div.det__facts', {},
        h('span', {}, D.FORMAT_LABEL[s?.format] ?? 'TV'),
        h('span', {}, D.seasonTag(s) ?? '—'),
        s?.episodes ? h('span', {}, `${s.episodes} Folgen`) : null,
        s?.score ? h('span', {}, `${s.score} % Community`) : null))));

  /* ---- Aktionsleiste: hier sitzen die Knöpfe, um die es geht -------- */
  wrap.appendChild(h('div.det__acts', {},
    e.status === 'completed'
      ? btn('Nochmal schauen', { variant: 'primary', ico: 'refresh', filled: false, onClick: () => { e.progress = 0; setStatus(e, 'watching'); } })
      : btn(e.progress > 0 ? `Weiter mit Ep. ${e.progress + 1}` : 'Jetzt starten', { variant: 'primary', ico: 'play', onClick: () => bumpEpisode(e, +1) }),
    btn('Status ändern', { variant: 'quiet', ico: ST_ICON[e.status], filled: false, onClick: () =>
      openSheet('Status ändern', (close) => h('div', {}, statusPicker(e.status, (st) => { close(); setStatus(e, st); }))) })));

  /* ---- Fortschritt: Ring + echter Stepper ---------------------------- */
  wrap.appendChild(h('div.det__prog', {},
    ring(D.seasonPct(e), { size: 54, w: 5, label: `${Math.round(D.seasonPct(e) * 100)}%` }),
    h('div.det__progtext', {},
      h('div', { style: { fontSize: '14px', fontWeight: '650', letterSpacing: '-0.02em' } }, `Staffel ${D.seasonNo(e)} · Episode ${e.progress} von ${s?.episodes ?? '?'}`),
      h('div.muted', { style: { marginTop: '2px' } }, `${num(D.watchedEpisodes(e))} Episoden im ganzen Franchise gesehen`)),
    h('div.stepper', {},
      h('button.stepper__btn', { type: 'button', 'aria-label': 'Eine Episode zurück', disabled: e.progress <= 0 || null, onclick: () => bumpEpisode(e, -1) }, icon('minus', { size: 18 })),
      h('span.stepper__val', {}, h('span.roll-up', {}, String(e.progress))),
      h('button.stepper__btn', { type: 'button', 'aria-label': 'Eine Episode weiter', onclick: () => bumpEpisode(e, +1) }, icon('plus', { size: 18 })))));

  /* ---- Wertung ------------------------------------------------------- */
  wrap.appendChild(sectionHead('Deine Wertung', { tone: 'completed' }));
  const pips = h('div.pips', {});
  for (let i = 1; i <= 10; i++) {
    pips.appendChild(h('button.pip' + (e.rating >= i ? '.is-on' : ''), {
      type: 'button', 'aria-label': `${i} von 10`,
      onclick: () => { e.rating = e.rating === i ? null : i; refresh(); toast(e.rating ? `Wertung ${e.rating}/10` : 'Wertung entfernt', 'completed', 'star'); },
    }, String(i)));
  }
  wrap.appendChild(pips);

  /* ---- Franchise-Zeitstrahl ------------------------------------------ */
  wrap.appendChild(sectionHead('Franchise-Zeitstrahl', { tone: e.status, count: line.length }));
  wrap.appendChild(h('div.line', {},
    line.map((m, i) => h('button.lineitem' + (m.id === s?.id ? '.is-here' : ''), {
      type: 'button', 'data-st': e.status,
      onclick: () => {
        const idx = e.seasons.findIndex((x) => x.id === m.id);
        if (idx >= 0) { e.seasonIndex = idx; e.progress = 0; refresh(); toast(`Auf ${labels[i]} gestellt`, e.status, ST_ICON[e.status]); }
        else toast('Diese Staffel gehört nicht zu deinem Eintrag', 'continuation', 'info');
      },
    },
      h('span.lineitem__art', {}, art(m)),
      h('span', { style: { flex: '1', minWidth: '0' } },
        h('span.lineitem__t', { style: { display: 'block' } }, labels[i]),
        h('span.lineitem__s', { style: { display: 'block' } }, [m.title, D.releaseLabel(m)].filter(Boolean).join(' · '))),
      m.id === s?.id ? h('span.tag', { 'data-st': e.status }, 'Du bist hier') : null))));

  /* ---- Fakten -------------------------------------------------------- */
  wrap.appendChild(sectionHead('Diese Staffel', { tone: e.status }));
  wrap.appendChild(h('dl.factgrid', {},
    [['Studio', s?.studio ?? '—'],
     ['Erstausstrahlung', D.releaseLabel(s) ?? '—'],
     ['Folgen', s?.episodes ? String(s.episodes) : '—'],
     ['Laufzeit', s?.duration ? `${s.duration} Min` : '—'],
     ['Status', { FINISHED: 'Abgeschlossen', RELEASING: 'Läuft gerade', NOT_YET_RELEASED: 'Angekündigt' }[s?.airStatus] ?? '—'],
     ['Genres', (s?.genres ?? []).slice(0, 2).map((g) => D.GENRE_LABEL[g] ?? g).join(', ') || '—']]
      .map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))));

  if (s?.synopsis) {
    wrap.appendChild(sectionHead('Worum es geht', { tone: e.status }));
    wrap.appendChild(h('p.sub', {}, s.synopsis));
  }

  wrap.appendChild(sectionHead('Wenn dir das gefällt', { tone: 'nextup' }));
  wrap.appendChild(h('div.shelf', {}, D.DETAIL_EXTRAS.recommendations.map((m) => mediaCard(m, { onClick: openAddFor }))));

  /* Löschen steht unten und allein — wie in nativen Apps. In der Knopfreihe
     oben wäre es entweder zu leicht zu treffen oder es bricht die Zeile um. */
  wrap.appendChild(h('div.group', { 'data-st': 'planned', style: { marginTop: '26px' } },
    h('button.setrow', { type: 'button', onclick: () => confirmDialog('Eintrag entfernen?', `„${D.entryTitle(e)}" wird aus der Bibliothek gelöscht. Fortschritt und Wertung gehen verloren.`, 'Entfernen', () => removeEntry(e)) },
      h('span.setrow__ico', {}, icon('trash', { size: 17 })),
      h('span.setrow__body', {},
        h('span.setrow__t', { style: { display: 'block', color: 'var(--pk-t)' } }, 'Aus der Bibliothek entfernen'),
        h('span.setrow__s', { style: { display: 'block' } }, 'Fortschritt und Wertung gehen verloren')),
      icon('right', { size: 16 }))));

  return wrap;
}

/* ================================================== Bildschirm: Statistik = */

/** Zahlen werden aus dem AKTUELLEN Zustand gerechnet, nicht vorgebacken —
 *  sonst zeigt die Statistik nach dem Hinzufügen Fantasiewerte. */
function computeStats() {
  let minutes = 0, episodes = 0, ratingSum = 0, ratingCount = 0;
  const perStatus = Object.fromEntries(D.STATUS_ORDER.map((s) => [s, 0]));
  const perGenre = {}, perYear = {};
  const ratings = Array(10).fill(0);
  for (const e of state.lib) {
    const ep = D.watchedEpisodes(e);
    episodes += ep;
    minutes += ep * D.meanDuration(e);
    perStatus[e.status]++;
    for (const g of (e.genres ?? [])) perGenre[g] = (perGenre[g] ?? 0) + 1;
    const y = e.seasons[0]?.seasonYear;
    if (y) perYear[y] = (perYear[y] ?? 0) + 1;
    if (e.rating) { ratings[e.rating - 1]++; ratingSum += e.rating; ratingCount++; }
  }
  return {
    total: state.lib.length,
    episodes,
    hours: Math.round(minutes / 60),
    days: minutes / 1440,
    avgRating: ratingCount ? ratingSum / ratingCount : 0,
    perStatus,
    genres: Object.entries(perGenre).map(([k, v]) => ({ label: D.GENRE_LABEL[k] ?? k, value: v })).sort((a, b) => b.value - a.value).slice(0, 8),
    years: Object.entries(perYear).map(([y, v]) => ({ year: Number(y), value: v })).sort((a, b) => a.year - b.year),
    ratings: ratings.map((count, i) => ({ score: i + 1, count })),
  };
}

function screenStats() {
  const st = computeStats();
  const wrap = h('div');
  wrap.appendChild(h('header', { style: { marginBottom: '16px' } },
    h('h1.h-large', {}, 'Statistik'),
    h('p.sub', { style: { marginTop: '4px' } }, 'Dein Archiv in Zahlen — komplett offline gerechnet.')));

  wrap.appendChild(h('div.tiles', {},
    [['Sehzeit', `${num(st.hours)} h`, 'watching'],
     ['Episoden', num(st.episodes), 'nextup'],
     ['Einträge', num(st.total), 'planned'],
     ['Ø Wertung', st.avgRating ? st.avgRating.toFixed(1) : '—', 'completed']]
      .map(([k, v, tone]) => h('div.tile.stat-tile', { 'data-st': tone },
        h('span.stat-tile__v', {}, v),
        h('span.stat-tile__k', {}, k)))));

  /* Status-Verteilung: jede Kategorie in ihrer eigenen Farbe. */
  wrap.appendChild(sectionHead('Wie sich dein Archiv verteilt', { tone: 'watching' }));
  const maxStatus = Math.max(1, ...Object.values(st.perStatus));
  wrap.appendChild(h('div.panel', {},
    D.STATUS_ORDER.map((s) => h('div.barrow', { 'data-st': s },
      h('span.barrow__k', {}, D.STATUS_LABEL[s]),
      h('span.bar', {}, h('span.bar__fill', { style: { width: `${(st.perStatus[s] / maxStatus) * 100}%` } })),
      h('span.barrow__v', {}, num(st.perStatus[s]))))));

  wrap.appendChild(sectionHead('Genres', { tone: 'nextup' }));
  const maxG = Math.max(1, ...st.genres.map((g) => g.value));
  wrap.appendChild(h('div.panel', { 'data-st': 'nextup' },
    st.genres.map((g) => h('div.barrow', {},
      h('span.barrow__k', {}, g.label),
      h('span.bar', {}, h('span.bar__fill', { style: { width: `${(g.value / maxG) * 100}%` } })),
      h('span.barrow__v', {}, num(g.value))))));

  wrap.appendChild(sectionHead('Wie du wertest', { tone: 'completed' }));
  const maxR = Math.max(1, ...st.ratings.map((r) => r.count));
  wrap.appendChild(h('div.panel', { 'data-st': 'completed' },
    h('div.spread', {}, st.ratings.map((r) => h('div.spread__col', {},
      h('span.spread__n', {}, r.count ? num(r.count) : ''),
      h('span.spread__bar', { style: { height: `${(r.count / maxR) * 100}%`, minHeight: r.count ? '6px' : '2px', opacity: r.count ? '1' : '.25' } }),
      h('span.spread__n', {}, String(r.score)))))));

  return wrap;
}

/* =============================================== Bildschirm: Einstellungen = */

function screenSettings() {
  const wrap = h('div');
  wrap.appendChild(h('header', { style: { marginBottom: '16px' } },
    h('h1.h-large', {}, 'Einstellungen'),
    h('p.sub', { style: { marginTop: '4px' } }, 'Konto, Sprache, Sicherung.')));

  wrap.appendChild(h('div.panel', { 'data-st': 'watching', style: { display: 'flex', alignItems: 'center', gap: '14px' } },
    h('span', { style: { display: 'grid', placeItems: 'center', width: '54px', height: '54px', borderRadius: '18px', background: 'var(--tone-bg)', color: 'var(--tone-t)', flex: 'none' } }, icon('person', { size: 26, filled: true })),
    h('span', { style: { flex: '1', minWidth: '0' } },
      h('span', { style: { display: 'block', fontSize: '17px', fontWeight: '700', letterSpacing: '-0.025em' } }, D.PROFILE.name),
      h('span.muted', { style: { display: 'block', marginTop: '2px' } }, D.PROFILE.email),
      h('span.muted', { style: { display: 'block' } }, `${D.PROFILE.since} · ${D.PROFILE.devices} Geräte`)),
    iconBtn('right', 'Profil öffnen', { sm: true })));

  wrap.appendChild(h('p.grouptitle', {}, 'Sprache'));
  // Zwei Segmente über die volle Breite sehen auf dem Laptop aus wie ein
  // Bedienfehler — hier bleibt der Schalter so breit wie nötig.
  wrap.appendChild(h('div', { style: { maxWidth: '360px' } }, segmented(
    [{ key: 'de', label: 'Deutsch' }, { key: 'en', label: 'English' }],
    state.lang,
    (k) => { state.lang = k; refresh(); toast(k === 'de' ? 'Sprache: Deutsch' : 'Language: English', 'watching', 'globe'); },
  )));

  wrap.appendChild(h('p.grouptitle', {}, 'Synchronisierung'));
  const rows = [
    ['refresh', 'Automatisch abgleichen', `Zuletzt ${D.PROFILE.lastSync}`, true, 'watching'],
    ['bell', 'Neue Staffeln melden', 'Wenn eine Fortsetzung angekündigt wird', true, 'nextup'],
    ['film', 'Filme mitzählen', 'Kinofilme als Teil des Franchise werten', false, 'planned'],
  ];
  wrap.appendChild(h('div.group', {}, rows.map(([ico, t, s, on, tone]) => {
    const sw = h('span.switch' + (on ? '.is-on' : ''), { role: 'switch', 'aria-checked': String(on), tabindex: '0' });
    const row = h('button.setrow', { type: 'button', 'data-st': tone, onclick: () => {
      const nowOn = !sw.classList.contains('is-on');
      sw.classList.toggle('is-on', nowOn);
      sw.setAttribute('aria-checked', String(nowOn));
    } },
      h('span.setrow__ico', {}, icon(ico, { size: 17, filled: hasFilled(ico) })),
      h('span.setrow__body', {},
        h('span.setrow__t', { style: { display: 'block' } }, t),
        h('span.setrow__s', { style: { display: 'block' } }, s)),
      sw);
    return row;
  })));

  wrap.appendChild(h('p.grouptitle', {}, 'Sicherung'));
  wrap.appendChild(h('div.group', {},
    h('button.setrow', { type: 'button', 'data-st': 'completed', onclick: () => toast('Sicherung exportiert', 'completed', 'download') },
      h('span.setrow__ico', {}, icon('download', { size: 17 })),
      h('span.setrow__body', {}, h('span.setrow__t', { style: { display: 'block' } }, 'Bibliothek exportieren'), h('span.setrow__s', { style: { display: 'block' } }, `${num(state.lib.length)} Einträge als Datei`)),
      icon('right', { size: 16 })),
    h('button.setrow', { type: 'button', 'data-st': 'completed', onclick: () => toast('Datei wählen', 'completed', 'upload') },
      h('span.setrow__ico', {}, icon('upload', { size: 17 })),
      h('span.setrow__body', {}, h('span.setrow__t', { style: { display: 'block' } }, 'Sicherung einspielen'), h('span.setrow__s', { style: { display: 'block' } }, 'Überschreibt die aktuelle Bibliothek')),
      icon('right', { size: 16 }))));

  wrap.appendChild(h('p.grouptitle', {}, 'Gefahrenzone'));
  wrap.appendChild(h('div.group', { 'data-st': 'planned' },
    h('button.setrow', { type: 'button', 'data-st': 'planned', onclick: () => confirmDialog('Bibliothek leeren?', 'Alle Einträge, Fortschritte und Wertungen werden gelöscht. Das lässt sich nicht rückgängig machen.', 'Alles löschen', () => { state.lib = []; refresh(); toast('Bibliothek geleert', 'planned', 'trash'); }) },
      h('span.setrow__ico', {}, icon('trash', { size: 17 })),
      h('span.setrow__body', {}, h('span.setrow__t', { style: { display: 'block', color: 'var(--pk-t)' } }, 'Bibliothek leeren'), h('span.setrow__s', { style: { display: 'block' } }, 'Löscht alle Einträge unwiderruflich')),
      icon('right', { size: 16 })),
    h('button.setrow', { type: 'button', 'data-st': 'planned', onclick: () => toast('Abgemeldet', 'planned', 'exit') },
      h('span.setrow__ico', {}, icon('exit', { size: 17 })),
      h('span.setrow__body', {}, h('span.setrow__t', { style: { display: 'block' } }, 'Abmelden'), h('span.setrow__s', { style: { display: 'block' } }, D.PROFILE.email)),
      icon('right', { size: 16 }))));

  wrap.appendChild(h('p.muted', { style: { marginTop: '22px', textAlign: 'center' } }, 'Tsugi-Anitracker · Entwurf V5 „Gerät"'));
  return wrap;
}

/* ================================================== Bildschirm: Bausteine = */

/** Die Seite, auf der die Knöpfe wirklich beurteilt werden. */
function screenParts() {
  const wrap = h('div');
  wrap.appendChild(h('header', { style: { marginBottom: '18px' } },
    h('h1.h-large', {}, 'Bausteine'),
    h('p.sub', { style: { marginTop: '4px' } }, 'Jeder Knopf in jedem Zustand, der komplette Zeichensatz, die fünf Kategorien nebeneinander. Zum Draufdrücken.')));

  const spec = (title, ...kids) => wrap.appendChild(h('section.spec', {}, h('h2.spec__h', {}, title), ...kids));

  /* ---- Knöpfe -------------------------------------------------------- */
  spec('Knöpfe · ruhend', h('div.spec__row', { 'data-st': 'watching' },
    btn('Primär', { variant: 'primary', ico: 'play' }),
    btn('Standard', { ico: 'plus', filled: false }),
    btn('Leise', { variant: 'quiet', ico: 'bookmark', filled: false }),
    btn('Gefahr', { variant: 'danger', ico: 'trash', filled: false })));

  spec('Knöpfe · klein, deaktiviert, ladend', h('div.spec__row', { 'data-st': 'watching' },
    btn('Klein', { variant: 'primary', sm: true, ico: 'check' }),
    btn('Klein leise', { variant: 'quiet', sm: true }),
    btn('Deaktiviert', { disabled: true, ico: 'plus', filled: false }),
    btn('Lädt', { variant: 'primary', cls: 'is-loading' })));

  spec('Knöpfe · in jeder Kategorie', h('div.spec__row', {},
    D.STATUS_ORDER.map((s) => {
      const b = btn(D.STATUS_LABEL[s], {
        variant: 'primary', ico: ST_ICON[s],
        onClick: () => toast(`Beispiel: ${D.STATUS_LABEL[s]}`, s, ST_ICON[s]),
      });
      b.setAttribute('data-st', s);
      return b;
    })));

  spec('Symbolknöpfe', h('div.spec__row', { 'data-st': 'watching' },
    iconBtn('search', 'Suchen'),
    iconBtn('dice', 'Zufall'),
    iconBtn('plus', 'Hinzufügen'),
    iconBtn('dots', 'Mehr', { sm: true }),
    iconBtn('trash', 'Löschen', { sm: true })));

  /* ---- Zustandsschalter ---------------------------------------------- */
  spec('Segmentierte Auswahl (Daumen gleitet und wächst)',
    segmented(HOME_PANELS.map((s) => ({ key: s, label: D.STATUS_LABEL[s], count: countOf(s), ico: ST_ICON[s] })), state.panel, (k) => { state.panel = k; refresh(); }));

  spec('Chips', h('div.spec__row', {},
    h('button.chip.is-on', { type: 'button', 'data-st': 'watching' }, 'Aktiv'),
    h('button.chip', { type: 'button' }, 'Ruhend'),
    h('button.chip', { type: 'button', 'data-st': 'nextup' }, icon('ready', { size: 14, filled: true }), 'Mit Zeichen'),
    h('button.chip.is-on', { type: 'button', 'data-st': 'planned' }, icon('bookmark', { size: 14, filled: true }), 'Vorgemerkt')));

  const stepVal = h('span.stepper__val', {}, h('span', {}, '9'));
  let v = 9;
  spec('Stepper & Schalter', h('div.spec__row', { 'data-st': 'watching' },
    h('div.stepper', {},
      h('button.stepper__btn', { type: 'button', 'aria-label': 'weniger', onclick: () => { v = Math.max(0, v - 1); clear(stepVal).appendChild(h('span.roll-down', {}, String(v))); } }, icon('minus', { size: 18 })),
      stepVal,
      h('button.stepper__btn', { type: 'button', 'aria-label': 'mehr', onclick: () => { v += 1; clear(stepVal).appendChild(h('span.roll-up', {}, String(v))); } }, icon('plus', { size: 18 }))),
    (() => {
      const sw = h('span.switch.is-on', { role: 'switch', 'aria-checked': 'true', tabindex: '0', onclick: (ev) => ev.currentTarget.classList.toggle('is-on') });
      return sw;
    })(),
    (() => h('span.switch', { role: 'switch', 'aria-checked': 'false', tabindex: '0', onclick: (ev) => ev.currentTarget.classList.toggle('is-on') }))()));

  const pipRow = h('div.pips', {});
  for (let i = 1; i <= 10; i++) {
    pipRow.appendChild(h('button.pip' + (i <= 8 ? '.is-on' : ''), { type: 'button', 'aria-label': `${i} von 10`, onclick: (ev) => {
      const nodes = [...pipRow.children];
      const idx = nodes.indexOf(ev.currentTarget);
      nodes.forEach((n, k) => n.classList.toggle('is-on', k <= idx));
      ev.currentTarget.classList.add('just');
      setTimeout(() => ev.currentTarget.classList.remove('just'), 460);
    } }, String(i)));
  }
  spec('Wertung 1–10', pipRow);

  spec('Fortschritt', h('div.spec__row', { 'data-st': 'watching' },
    ring(0.35, { size: 52, label: '35%' }),
    ring(0.78, { size: 52, label: '78%' }),
    h('span.bar', { style: { width: '160px' } }, h('span.bar__fill', { style: { width: '62%' } }))));

  /* ---- Die fünf Kategorien nebeneinander ------------------------------ */
  spec('Fünf Kategorien — Farbe, Zeichen, Behandlung, Bewegung',
    h('p.muted', { style: { marginBottom: '12px' } }, 'Auf PC/Laptop mit der Maus darüberfahren: jede Kategorie bewegt sich anders. Weiter schauen hebt an und zeigt den Wiedergabeknopf · Noch zu schauen fährt aus dem Schacht · Watchlist lässt die Fahne heraus · Fortsetzung folgt bekommt langsam Farbe zurück · Geschaut bekommt einen Goldfolien-Lauf und stempelt sein Siegel.'),
    h('div.grid', {}, D.STATUS_ORDER.map((s) => {
      const e = byStatus(s)[0] ?? state.lib[0];
      return e ? card({ ...e, status: s }, { showTag: false }) : null;
    })));

  spec('Status-Marken', h('div.spec__row', {},
    D.STATUS_ORDER.map((s) => tag(s)),
    D.STATUS_ORDER.map((s) => tag(s, { solid: true }))));

  spec('Zeichensatz · Kontur (aus) und gefüllt (an)',
    h('div.spec__grid', {}, ICON_NAMES.map((n) => h('div.spec__cell', { 'data-st': 'watching' },
      h('span', { style: { display: 'flex', gap: '10px', color: 'var(--ink-2)' } },
        icon(n, { size: 24 }),
        hasFilled(n) ? h('span', { style: { color: 'var(--tone-t)' } }, icon(n, { size: 24, filled: true })) : null),
      h('span', {}, n)))));

  spec('Listenzeile', h('div.panel.panel--flush', {},
    state.lib.slice(0, 3).map((e) => h('div.row-item', { 'data-st': e.status },
      h('span.row-item__art', {}, art(D.currentSeason(e))),
      h('span.row-item__body', {},
        h('span.row-item__t', { style: { display: 'block' } }, D.entryTitle(e)),
        h('span.row-item__s', {}, tag(e.status))),
      h('span.row-item__end', {}, icon('right', { size: 18 }))))));

  spec('Meldungen, Blatt, Dialog', h('div.spec__row', {},
    btn('Meldung zeigen', { variant: 'quiet', onClick: () => toast('So sieht eine Meldung aus', 'watching', 'check') }),
    btn('Blatt öffnen', { variant: 'quiet', onClick: () => openSheet('Statuswahl', (close) => h('div', {}, statusPicker('watching', () => close()))) }),
    btn('Dialog öffnen', { variant: 'quiet', onClick: () => confirmDialog('Wirklich löschen?', 'Beispiel für eine gefährliche Aktion.', 'Löschen', () => toast('Gelöscht', 'planned', 'trash')) })));

  spec('Leerzustand', emptyState('planned', 'Deine Watchlist ist leer', 'Merk dir was unter Entdecken vor.', btn('Titel suchen', { variant: 'primary', ico: 'search', onClick: () => openSearch() })));

  spec('Skelett', h('div.grid', {}, Array.from({ length: 6 }).map(() => h('div', {},
    h('div.skel', { style: { aspectRatio: '2/3' } }),
    h('div.skel', { style: { height: '11px', marginTop: '8px', width: '85%' } }),
    h('div.skel', { style: { height: '9px', marginTop: '6px', width: '55%' } })))));

  /* Die Schriftfarbe der Farbfelder wird GERECHNET, nicht geraten — bei
     Handarbeit stand vorher Weiß auf --ink-3 und lag mit 2,7:1 unter AA.
     Reines Schwarz/Weiß statt der markentypischen Anthrazit-/Off-White-Töne:
     bei mittleren Tönen wie --sl (#64789f) reichte selbst der bessere der
     beiden Marken-Werte nur auf 4,3:1 — echtes Schwarz/Weiß hat dort noch
     Reserve (4,7:1). */
  const readableOn = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const ratio = (fgL) => (Math.max(fgL, l) + 0.05) / (Math.min(fgL, l) + 0.05);
    return ratio(0) >= ratio(1) ? '#000000' : '#ffffff';
  };
  spec('Farbleiter', h('div.swatches', {},
    [['--void', '#06070d'], ['--bg', '#0d0f18'], ['--s1', '#141827'], ['--s2', '#1b2032'], ['--s3', '#262e48'], ['--s4', '#333d5e'],
     ['--cy', '#00f5d4'], ['--bl', '#3a86ff'], ['--pu', '#8a2be2'], ['--sl', '#64789f'], ['--gr', '#2ecc71'], ['--go', '#ffcf4d'],
     ['--ink', '#f1f3f9'], ['--ink-2', '#a8b3cb'], ['--ink-3', '#8a95af']]
      .map(([k, hex]) => h('div.sw', { style: { background: hex, color: readableOn(hex) } },
        h('div', { style: { fontWeight: '600' } }, k), h('div', {}, hex)))));

  return wrap;
}

/* ================================================================ Rahmen == */

const mount = h('div.pane__inner', { id: 'main' });
const pane = h('main.pane', { 'data-scroll': '', tabindex: '-1' }, mount);

const topTitle = h('span.topbar__title');
const topbar = h('header.topbar', {},
  h('a.topbar__brand', { href: '#/home', 'aria-label': 'Tsugi — Home' },
    h('img.topbar__logo', { src: '/assets/logo.png', alt: '', width: 30, height: 30 }),
    h('span.topbar__name', {}, 'Tsugi')),
  h('span.topbar__spacer', {}, topTitle),
  iconBtn('search', 'Suchen', { onClick: () => openSearch(), sm: false, filled: true }));

const tabNodes = new Map();
const tabbar = h('nav.tabbar', { 'aria-label': 'Navigation' },
  NAV.map((n) => {
    const el = h('a.tab', { href: `#/${n.key}` },
      h('span.tab__cap'),
      iconPair(n.ico, { size: 24 }),
      h('span.tab__label', {}, n.label));
    tabNodes.set(n.key, el);
    return el;
  }));

const railNodes = new Map();
const rail = h('aside.rail', { 'aria-label': 'Navigation' },
  h('a.rail__brand', { href: '#/home', 'aria-label': 'Tsugi — Home' },
    h('img.rail__logo', { src: '/assets/logo.png', alt: '', width: 38, height: 38 }),
    h('span', {}, h('span.rail__name', {}, 'Tsugi'), h('span.rail__sub', {}, 'Anitracker'))),
  h('button.railitem', { type: 'button', style: { marginBottom: '10px' }, onclick: () => openSearch() },
    icon('search', { size: 20 }), h('span', {}, 'Suchen'),
    h('kbd', { style: { marginLeft: 'auto', fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--font-num)' } }, '/')),
  NAV.map((n) => {
    const el = h('a.railitem', { href: `#/${n.key}` }, iconPair(n.ico, { size: 21 }), h('span', {}, n.label));
    railNodes.set(n.key, el);
    return el;
  }),
  h('a.railitem', { href: '#/bausteine' }, iconPair('sparkle', { size: 21 }), h('span', {}, 'Bausteine')),
  h('p.rail__foot', {}, 'Entwurf V5 „Gerät"', h('br'), 'Dein Archiv, auf allen Geräten synchron.'));

const app = h('div.app', { 'data-st': 'watching' }, rail, topbar, pane, tabbar);

/* Kopfleiste bekommt Kante und Titel, sobald der Inhalt darunter läuft. */
pane.addEventListener('scroll', () => {
  topbar.classList.toggle('is-scrolled', pane.scrollTop > 12);
}, { passive: true });

/* Tastenkürzel wie in der echten App. */
document.addEventListener('keydown', (ev) => {
  const t = ev.target;
  const typing = t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (typing) return;
  if (ev.key === '/' || ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k')) {
    ev.preventDefault();
    openSearch();
  }
});

/* ================================================================ Start === */

defineScreens({
  home: screenHome,
  entdecken: screenDiscover,
  bibliothek: screenLibrary,
  detail: screenDetail,
  statistik: screenStats,
  einstellungen: screenSettings,
  bausteine: screenParts,
  suche: () => { openSearch(); return screenHome(); },
});

document.getElementById('root').replaceChildren(app);

let lastKey = null;

startRouter({
  mount,
  fallback: 'home',
  onChange: (key) => {
    // Nur beim echten Bildschirmwechsel aufräumen — `refresh()` läuft durch
    // dieselbe Stelle, und ein Blatt, das bei jeder Zustandsänderung
    // zuklappt, wäre kaputt.
    if (key !== lastKey) {
      lastKey = key;
      closeSheet();
      closePalette?.();
    }
    const tone = (SCREEN_TONE[key] ?? (() => 'watching'))();
    app.dataset.st = tone;
    const title = key === 'detail'
      ? D.entryTitle(entry(state.detailId) ?? state.lib[0] ?? {})
      : (NAV.find((n) => n.key === key)?.label ?? (key === 'bausteine' ? 'Bausteine' : 'Tsugi'));
    topTitle.textContent = title;
    for (const [k, el] of tabNodes) {
      const on = k === key || (key === 'detail' && k === 'bibliothek');
      el.classList.toggle('is-on', on);
      el.querySelector('.ico-pair')?.classList.toggle('is-on', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    }
    for (const [k, el] of railNodes) {
      const on = k === key || (key === 'detail' && k === 'bibliothek');
      el.classList.toggle('is-on', on);
      el.querySelector('.ico-pair')?.classList.toggle('is-on', on);
    }
    topbar.classList.remove('is-scrolled');
  },
});
