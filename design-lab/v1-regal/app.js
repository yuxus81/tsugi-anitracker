/**
 * V1 „REGAL" — alle acht Bildschirme.
 *
 * Wegwerf-Code mit Absicht: Vanilla, kein Framework, keine Tests. Was hier
 * zählt, ist die Bauform — Umfang je Bildschirm, Zustände der Bedienelemente,
 * Bewegungssprache. Übernommen wird später nur das, was sich bewährt hat:
 * tokens.css und die Bausteine-Seite.
 */

import { h, clear, num, clamp, reducedMotion, tiltOn, countTo, finePointer } from '../shared/dom.js';
import { defineScreens, startRouter, go, refresh, currentScreen } from '../shared/router.js';
import * as D from '../shared/mock.js';
import { icon, iconPair, ICON_NAMES, PAIRED } from './icons.js';

/* ============================================================== Zustand ==== */

const state = {
  panel: 'watching',        // Start: welches Panel ist offen
  libTab: 'completed',      // Bibliothek: welcher Status-Tab
  genre: null,              // Entdecken: gewähltes Genre
  detailId: D.DETAIL_ENTRY.rootId,
  ranking: D.byStatus('completed').map((e) => e.rootId),
  demoBusy: false,
};

const NAV = [
  { key: 'home', label: 'Start', ico: 'home' },
  { key: 'bibliothek', label: 'Bibliothek', ico: 'shelf' },
  { key: 'entdecken', label: 'Entdecken', ico: 'compass' },
  { key: 'statistik', label: 'Statistik', ico: 'chart' },
  { key: 'einstellungen', label: 'Mehr', ico: 'gear' },
];

/* =============================================================== Helfer ==== */

function toast(text, kind = 'ok') {
  document.querySelector('.toast')?.remove();
  const t = h('div.toast', { role: 'status' },
    icon(kind === 'ok' ? 'check' : 'ticket', { size: 18 }),
    h('span', {}, text));
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function coverEl(media, { tilt = true, cls = '' } = {}) {
  const box = h('span.cover' + (cls ? '.' + cls : ''), {});
  if (media?.cover) box.appendChild(h('img', { src: media.cover, alt: '', loading: 'lazy', decoding: 'async' }));
  if (tilt) { box.classList.add('tiltable'); tiltOn(box, { max: 8, scale: 1.03 }); }
  return box;
}

function ring(pct, { size = 54, stroke = 5, label = null } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const bar = h('circle.ring__bar', {
    cx: size / 2, cy: size / 2, r, fill: 'none', 'stroke-width': stroke,
    'stroke-dasharray': c.toFixed(1),
    'stroke-dashoffset': (c - clamp(pct, 0, 1) * c).toFixed(1),
  });
  const el = h('span.ring', {},
    h('svg', { width: size, height: size, 'aria-hidden': 'true' },
      h('circle.ring__track', { cx: size / 2, cy: size / 2, r, fill: 'none', 'stroke-width': stroke }),
      bar),
    label !== null ? h('span.ring__val.tnum', {}, label) : null);
  el._setPct = (p) => { bar.setAttribute('stroke-dashoffset', (c - clamp(p, 0, 1) * c).toFixed(1)); };
  return el;
}

function badge(status) {
  return h(`span.badge.badge--${status}`, {}, D.STATUS_LABEL[status]);
}

function sectionHead(title, { count = null, action = null } = {}) {
  return h('div.sec', {},
    h('span.sec__spine'),
    h('h2.sec__title', {}, title),
    count !== null ? h('span.sec__count.tnum', {}, String(count)) : null,
    action ? h('span.sec__more', {}, action) : null);
}

function btn(label, opts = {}) {
  const { variant = '', ico = null, onClick = null, sm = false, disabled = false, wide = false, iconFilled = false } = opts;
  const b = h('button.btn' + (variant ? `.btn--${variant}` : '') + (sm ? '.btn--sm' : '') + (wide ? '.btn--wide' : ''),
    { type: 'button', disabled: disabled || null, onclick: onClick || undefined });
  if (ico) b.appendChild(icon(ico, { size: sm ? 16 : 18, filled: iconFilled }));
  if (label) b.appendChild(h('span', {}, label));
  return b;
}

function iconBtn(name, label, opts = {}) {
  const { onClick = null, sm = false, filled = false, cls = '' } = opts;
  return h('button.iconbtn' + (sm ? '.iconbtn--sm' : '') + (cls ? '.' + cls : ''),
    { type: 'button', 'aria-label': label, title: label, onclick: onClick || undefined },
    icon(name, { size: sm ? 17 : 20, filled }));
}

/**
 * Segmentierter Umschalter mit gleitender Kapsel (sie wandert, sie blinkt nicht).
 * `short` ist Pflicht, sobald es mehr als zwei Segmente gibt: auf 390 px lief
 * der Umschalter sonst seitlich aus dem Bild und musste gescrollt werden —
 * ausgerechnet die Hauptnavigation des Start-Bildschirms.
 */
function segmented(items, activeKey, onPick) {
  const cap = h('span.seg__cap', { 'aria-hidden': 'true' });
  const box = h('div.seg' + (items.length <= 3 ? '.seg--fit' : ''), { role: 'tablist' }, cap);
  const btns = items.map((it) => {
    const b = h('button.seg__btn' + (it.key === activeKey ? '.is-on' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(it.key === activeKey),
      onclick: () => onPick(it.key),
    },
      h('span.lbl-long', {}, it.label),
      it.short ? h('span.lbl-short', {}, it.short) : null,
      it.count != null ? h('span.cnt.tnum', {}, String(it.count)) : null);
    box.appendChild(b);
    return b;
  });
  const place = () => {
    const i = items.findIndex((x) => x.key === activeKey);
    const b = btns[Math.max(0, i)];
    if (!b) return;
    cap.style.width = `${b.offsetWidth}px`;
    cap.style.transform = `translateX(${b.offsetLeft - 4}px)`;
  };
  // Zwei Wege absichtlich: rAF ruht in einem unsichtbaren Tab, setTimeout nicht.
  setTimeout(place, 0);
  requestAnimationFrame(place);
  new ResizeObserver(place).observe(box);
  return box;
}

/* ================================================================ Start ==== */

function screenHome() {
  const counts = {
    watching: D.byStatus('watching').length,
    nextup: D.byStatus('nextup').length,
    planned: D.byStatus('planned').length,
  };
  const body = h('div.stack');

  const seg = segmented([
    { key: 'watching', label: 'Weiter schauen', short: 'Weiter', count: counts.watching },
    { key: 'nextup', label: 'Noch zu schauen', short: 'Bereit', count: counts.nextup },
    { key: 'planned', label: 'Watchlist', short: 'Liste', count: counts.planned },
  ], state.panel, (k) => { state.panel = k; refresh(); });

  if (state.panel === 'watching') {
    const list = D.byStatus('watching');
    body.appendChild(list.length
      ? h('div.stack', {}, ...list.map(continueRow))
      : emptyState('Nichts angefangen', 'Was du gerade schaust, steht hier vorn.'));
  } else if (state.panel === 'nextup') {
    const list = D.byStatus('nextup');
    body.appendChild(list.length
      ? h('div.stack', {}, ...list.map(readyRow))
      : emptyState('Nichts bereit', 'Sobald eine neue Staffel verfügbar ist, taucht sie hier auf.'));
  } else {
    body.appendChild(rollerCard());
    body.appendChild(h('div.grid-posters', {}, ...D.byStatus('planned').map((e) => posterOf(D.currentSeason(e), e))));
  }

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {},
      h('h1.page-title', {}, 'Dein Regal'),
      h('p.page-sub', {}, `${D.LIBRARY.length} Franchises · ${num(D.STATS.episodes)} Folgen gesehen`)),
    seg,
    body,
    simulcastSection());
}

/** Eine Zeile „Weiter schauen": Cover als Objekt, Ring, +1-Taste, Fertig-Taste. */
function continueRow(entry) {
  const s = D.currentSeason(entry);
  const total = s?.episodes ?? 0;
  const rowRing = ring(D.seasonPct(entry), { size: 54, stroke: 5, label: `${entry.progress}` });
  const rail = h('i', { style: { width: `${D.seasonPct(entry) * 100}%` } });
  const meta = h('div.shelfrow__meta', {}, metaLine(entry));

  const plus = btn('Folge +1', {
    variant: 'primary', ico: 'plus', sm: true,
    onClick: () => {
      if (total && entry.progress >= total) { toast('Staffel ist durch — als geschaut markieren?'); return; }
      entry.progress += 1;
      const val = rowRing.querySelector('.ring__val');
      countTo(val, entry.progress - 1, entry.progress, 260);
      rowRing._setPct(D.seasonPct(entry));
      rail.style.width = `${D.seasonPct(entry) * 100}%`;
      meta.replaceChildren(...metaLine(entry));
      if (total && entry.progress >= total) toast(`${D.entryTitle(entry)}: Staffel durch`);
    },
  });

  const row = h('article.shelfrow', {},
    h('a.shelfrow__cover', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; } }, coverEl(s)),
    h('div.shelfrow__body', {},
      badge('watching'),
      h('h3.shelfrow__title', {}, D.entryTitle(entry)),
      meta,
      h('div.shelfrow__acts', {}, plus,
        iconBtn('check', 'Als geschaut markieren', {
          sm: true,
          onClick: () => toast(`${D.entryTitle(entry)} als geschaut markiert`),
        }),
        iconBtn('more', 'Weitere Aktionen', { sm: true, onClick: () => openDialog(entry) }))),
    h('div', { style: { marginLeft: 'auto' } }, rowRing),
    h('div.shelfrow__rail', {}, rail));
  return row;
}

function metaLine(entry) {
  const s = D.currentSeason(entry);
  const parts = [];
  if (entry.seasons.length > 1) parts.push(`Staffel ${D.seasonNo(entry)}`);
  parts.push(s?.episodes ? `Folge ${entry.progress} von ${s.episodes}` : `Folge ${entry.progress}`);
  if (s?.airStatus === 'RELEASING') parts.push('läuft');
  return [document.createTextNode(parts.join(' · '))];
}

/** „Noch zu schauen": bereit im Fach, wartet auf Start. */
function readyRow(entry) {
  const s = D.currentSeason(entry);
  return h('article.shelfrow', {},
    h('a.shelfrow__cover', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; } }, coverEl(s)),
    h('div.shelfrow__body', {},
      badge('nextup'),
      h('h3.shelfrow__title', {}, D.entryTitle(entry)),
      h('div.shelfrow__meta', {},
        [entry.seasons.length > 1 ? `Staffel ${D.seasonNo(entry)}` : null,
          s?.episodes ? `${s.episodes} Folgen` : null,
          D.seasonTag(s)].filter(Boolean).join(' · ')),
      h('div.shelfrow__acts', {},
        btn('Anfangen', { variant: 'primary', ico: 'play', iconFilled: true, sm: true, onClick: () => toast(`${D.entryTitle(entry)} gestartet`) }),
        iconBtn('more', 'Weitere Aktionen', { sm: true, onClick: () => openDialog(entry) }))));
}

/** Zufallsroller — die Walze läuft aus, statt sofort ein Ergebnis zu zeigen. */
function rollerCard() {
  const pool = D.ROLL_POOL.length ? D.ROLL_POOL : D.LIBRARY;
  const win = h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0, flex: '1' } });
  const face = h('span', { style: { width: '54px', flex: '0 0 54px' } }, coverEl(D.currentSeason(pool[0]), { tilt: false }));
  const name = h('div', {},
    h('div.row__t', {}, 'Zufall aus Watchlist'),
    h('div.row__s', {}, 'Ein Titel, keine Ausreden.'));
  win.append(face, name);

  const go = btn('Würfeln', {
    variant: 'primary', ico: 'dice',
    onClick: (ev) => {
      const b = ev.currentTarget;
      if (b.classList.contains('is-loading')) return;
      const steps = reducedMotion() ? 1 : 14;
      let i = 0;
      b.classList.add('is-loading');
      const tick = () => {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        face.replaceChildren(coverEl(D.currentSeason(pick), { tilt: false }));
        name.replaceChildren(
          h('div.row__t', {}, D.entryTitle(pick)),
          h('div.row__s', {}, D.STATUS_LABEL[pick.status]));
        if (++i < steps) setTimeout(tick, 55 + i * 12);
        else { b.classList.remove('is-loading'); toast(`Gewürfelt: ${D.entryTitle(pick)}`); }
      };
      tick();
    },
  });

  return h('div.card', {}, h('div.card__pad.flex', { style: { gap: '12px' } }, win, go));
}

function simulcastSection() {
  if (!D.SIMULCAST.length) return null;
  const box = h('div.list');
  for (const { entry, season } of D.SIMULCAST.slice(0, 6)) {
    box.appendChild(h('a.row', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; } },
      h('span', { style: { width: '38px', flex: '0 0 38px' } }, coverEl(season, { tilt: false })),
      h('span.row__body', {},
        h('span.row__t', {}, D.entryTitle(entry)),
        h('span.row__s', {}, `Folge ${season.nextAiring.episode} · ${D.weekdayTime(season.nextAiring.airingAt)}`)),
      h('span.row__n.tnum', { dataset: { airing: String(season.nextAiring.airingAt) } },
        D.countdownShort(season.nextAiring.airingAt))));
  }
  return h('section', {},
    sectionHead('Läuft gerade', { count: D.SIMULCAST.length, action: h('a.small.mut', { href: '#/bibliothek' }, 'Alle') }),
    box);
}

function emptyState(title, sub) {
  return h('div.empty', {},
    icon('shelf', { size: 30, filled: true, cls: 'mut' }),
    h('div.empty__t', {}, title),
    h('div.empty__s', {}, sub));
}

/* =========================================================== Bibliothek ==== */

function screenLibrary() {
  const tabs = D.STATUS_ORDER.map((s) => ({ key: s, label: D.STATUS_SHORT[s], short: D.STATUS_SHORT[s], count: D.byStatus(s).length }));
  const body = h('div.stack');

  if (state.libTab === 'completed') body.appendChild(rankingList());
  else if (state.libTab === 'continuation') body.appendChild(continuationTiles());
  else if (state.libTab === 'planned') {
    body.appendChild(h('div.grid-posters', {}, ...D.byStatus('planned').map((e) => posterOf(D.currentSeason(e), e))));
  } else {
    const list = D.byStatus(state.libTab);
    body.appendChild(list.length
      ? h('div.stack', {}, ...list.map(state.libTab === 'watching' ? continueRow : readyRow))
      : emptyState('Leeres Fach', 'Hier steht gerade nichts.'));
  }

  return h('div.screen.stack', {},
    h('div', {},
      h('h1.page-title', {}, 'Bibliothek'),
      h('p.page-sub', {}, 'Das Archiv. Sortiert nach dem, was du damit vorhast.')),
    segmented(tabs, state.libTab, (k) => { state.libTab = k; refresh(); }),
    body);
}

/** Rangliste „Geschaut" mit Greifpunkt-Sortierung (Zeiger UND Tastatur). */
function rankingList() {
  const order = state.ranking.filter((id) => D.BY_ID[id]?.status === 'completed');
  for (const e of D.byStatus('completed')) if (!order.includes(e.rootId)) order.push(e.rootId);
  state.ranking = order;

  const list = h('div.list');
  const redraw = () => {
    clear(list);
    state.ranking.forEach((id, i) => list.appendChild(rankRow(D.BY_ID[id], i, redraw)));
  };
  redraw();

  return h('section', {},
    sectionHead('Rangliste', { count: state.ranking.length }),
    h('p.small.mut', { style: { margin: '-6px 0 10px' } },
      'Greifpunkt ziehen — oder mit der Tastatur: Greifpunkt anspringen, dann Pfeil hoch/runter.'),
    list);
}

function rankRow(entry, index, redraw) {
  if (!entry) return document.createTextNode('');
  const s = D.currentSeason(entry);
  const row = h('div.row', { dataset: { id: String(entry.rootId) } },
    h('span.rank' + (index < 3 ? '.is-top' : ''), {}, String(index + 1)),
    h('span', { style: { width: '34px', flex: '0 0 34px' } }, coverEl(s, { tilt: false })),
    h('span.row__body', {},
      h('span.row__t', {}, D.entryTitle(entry)),
      h('span.row__s', {}, `${D.watchedEpisodes(entry)} Folgen · ${entry.seasons.length} ${entry.seasons.length === 1 ? 'Eintrag' : 'Einträge'}`)),
    entry.rating ? h('span.row__n.tnum', {}, `${entry.rating}`) : null,
    h('button.row__grip.iconbtn.iconbtn--sm', {
      type: 'button',
      'aria-label': `${D.entryTitle(entry)} verschieben — Pfeil hoch oder runter`,
      onkeydown: (ev) => {
        const dir = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0;
        if (!dir) return;
        ev.preventDefault();
        const from = state.ranking.indexOf(entry.rootId);
        const to = clamp(from + dir, 0, state.ranking.length - 1);
        if (from === to) return;
        state.ranking.splice(to, 0, state.ranking.splice(from, 1)[0]);
        redraw();
        // Fokus wandert mit, sonst verliert die Tastatur nach dem ersten Schritt den Faden.
        setTimeout(() => {
          document.querySelector(`.row[data-id="${entry.rootId}"] .row__grip`)?.focus();
        }, 0);
      },
    }, icon('grip', { size: 17 })));

  attachDrag(row, entry.rootId, redraw);
  return row;
}

/** Zeiger-Sortierung: einfach, aber echt — inklusive Aufnehmen und Ablegen. */
function attachDrag(row, id, redraw) {
  const grip = row.querySelector('.row__grip');
  if (!grip) return;
  grip.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    ev.preventDefault();
    const list = row.parentElement;
    row.classList.add('is-dragging');
    grip.setPointerCapture(ev.pointerId);
    const move = (e) => {
      const rows = [...list.children];
      const y = e.clientY;
      for (const other of rows) {
        if (other === row) continue;
        const r = other.getBoundingClientRect();
        if (y > r.top && y < r.bottom) {
          const from = state.ranking.indexOf(id);
          const to = state.ranking.indexOf(Number(other.dataset.id));
          if (from !== to && to > -1) {
            state.ranking.splice(to, 0, state.ranking.splice(from, 1)[0]);
            redraw();
          }
          break;
        }
      }
    };
    const up = () => {
      row.classList.remove('is-dragging');
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });
}

/** „Fortsetzung folgt": Countdown-Kacheln. */
function continuationTiles() {
  const list = D.byStatus('continuation');
  if (!list.length) return emptyState('Keine Fortsetzung angekündigt', 'Sobald etwas datiert ist, steht es hier.');
  const grid = h('div', { style: { display: 'grid', gap: 'var(--gap)', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' } });
  for (const e of list) {
    const s = D.currentSeason(e);
    grid.appendChild(h('a.card', { href: '#/detail', onclick: () => { state.detailId = e.rootId; } },
      h('div.card__pad.flex', { style: { alignItems: 'flex-start', gap: '12px' } },
        h('span', { style: { width: '58px', flex: '0 0 58px' } }, coverEl(s, { tilt: false })),
        h('div', { style: { minWidth: 0 } },
          badge('continuation'),
          h('div.row__t', { style: { marginTop: '6px' } }, D.entryTitle(e)),
          h('div.row__s', {}, s?.nextAiring
            ? `Folge ${s.nextAiring.episode} · ${D.weekdayTime(s.nextAiring.airingAt)}`
            : (D.releaseLabel(s) ?? 'Datum unbekannt')),
          s?.nextAiring
            ? h('div.small', { class: 'tnum', style: { marginTop: '6px', color: 'var(--brass-300)' }, dataset: { airing: String(s.nextAiring.airingAt) } },
              D.countdownShort(s.nextAiring.airingAt))
            : null))));
  }
  return h('section', {}, sectionHead('Fortsetzung folgt', { count: list.length }), grid);
}

function posterOf(media, entry = null) {
  if (!media) return document.createTextNode('');
  return h('a.poster', {
    href: '#/detail',
    onclick: () => { if (entry) state.detailId = entry.rootId; },
  },
    coverEl(media),
    h('span.poster__title', {}, media.title),
    h('span.poster__meta', {}, [D.FORMAT_LABEL[media.format] ?? '', D.seasonTag(media)].filter(Boolean).join(' · ')));
}

/* ============================================================ Entdecken ==== */

function screenDiscover() {
  const chips = h('div.row-scroll.no-bar', { style: { gap: '8px', padding: '2px 0 8px' } },
    h('button.chip' + (state.genre === null ? '.is-on' : ''), {
      type: 'button', onclick: () => { state.genre = null; refresh(); },
    }, 'Alle'),
    ...D.GENRES.map((g) => h('button.chip' + (state.genre === g ? '.is-on' : ''), {
      type: 'button', onclick: () => { state.genre = g; refresh(); },
    }, D.GENRE_LABEL[g] ?? g)));

  const body = h('div.stack--lg', { class: 'stack' });
  if (state.genre === null) {
    body.appendChild(spotlight(D.DISCOVER.spotlight));
    for (const row of D.DISCOVER.rows) body.appendChild(posterRow(row.title, row.items));
  } else {
    body.appendChild(genreStage(state.genre));
    for (const row of D.genreRows(state.genre)) body.appendChild(posterRow(row.title, row.items));
  }

  return h('div.screen.stack', {},
    h('div', {},
      h('h1.page-title', {}, 'Entdecken'),
      h('p.page-sub', {}, 'Was gerade läuft, was kommt, was du übersehen hast.')),
    chips,
    body);
}

function spotlight(media) {
  const card = h('article.card', { style: { overflow: 'hidden' } });
  const art = h('div', { style: { position: 'relative', minHeight: '190px' } });
  if (media.banner) art.appendChild(h('img', { src: media.banner, alt: '', loading: 'lazy', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' } }));
  art.appendChild(h('div', { style: { position: 'absolute', inset: '0', background: 'linear-gradient(180deg, rgba(20,16,12,.15), rgba(20,16,12,.9))' } }));
  art.appendChild(h('div', { style: { position: 'relative', display: 'flex', gap: '14px', alignItems: 'flex-end', padding: '70px 14px 14px' } },
    h('span', { style: { width: '74px', flex: '0 0 74px' } }, coverEl(media)),
    h('div', { style: { minWidth: 0 } },
      h('div.small', { style: { color: 'var(--brass-300)', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase' } }, 'Im Scheinwerfer'),
      h('h3', { class: 'shelfrow__title', style: { fontSize: '21px', whiteSpace: 'normal' } }, media.title),
      h('div.row__s', {}, [D.FORMAT_LABEL[media.format], D.seasonTag(media), media.score ? `${media.score} %` : null].filter(Boolean).join(' · ')),
      h('div.acts', { style: { marginTop: '10px' } },
        btn('Hinzufügen', { variant: 'primary', ico: 'plus', sm: true, onClick: () => toast(`${media.title} zur Watchlist`) }),
        btn('Details', { ico: 'arrowRight', sm: true, onClick: () => go('detail') })))));
  card.appendChild(art);
  return card;
}

/** Genre-Bühne mit Staubpartikeln — Licht im Regal, kein Konfetti. */
function genreStage(genre) {
  const stage = h('div.card', { style: { position: 'relative', overflow: 'hidden', minHeight: '132px' } });
  const layer = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
  if (!reducedMotion()) {
    for (let i = 0; i < 16; i++) {
      const s = 2 + Math.random() * 3;
      layer.appendChild(h('span', {
        style: {
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${s}px`, height: `${s}px`,
          borderRadius: '50%',
          background: 'var(--brass-300)',
          opacity: String(0.12 + Math.random() * 0.3),
          animation: `dust ${9 + Math.random() * 9}s linear ${(-Math.random() * 12).toFixed(1)}s infinite`,
        },
      }));
    }
  }
  stage.append(layer, h('div.card__pad', { style: { position: 'relative' } },
    h('div.small', { style: { color: 'var(--brass-300)', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase' } }, 'Genre-Bühne'),
    h('h2', { class: 'page-title', style: { fontSize: 'clamp(24px,7vw,38px)' } }, D.GENRE_LABEL[genre] ?? genre),
    h('p.page-sub', {}, `${D.LIBRARY.filter((e) => e.genres.includes(genre)).length} davon stehen schon in deinem Regal.`)));
  return stage;
}

function posterRow(title, items) {
  if (!items?.length) return document.createTextNode('');
  return h('section', {},
    sectionHead(title, { count: items.length }),
    h('div.row-scroll.no-bar.rail-row', {}, ...items.map((m) => posterOf(m))));
}

/* =============================================================== Detail ==== */

function screenDetail() {
  const entry = D.BY_ID[state.detailId] ?? D.DETAIL_ENTRY;
  const s = D.currentSeason(entry);
  const total = s?.episodes ?? 0;

  /* Stepper */
  const valEl = h('span.stepper__val.tnum', {}, h('span', {}, String(entry.progress)), h('small', {}, `/ ${total || '?'}`));
  const setVal = (n) => {
    entry.progress = clamp(n, 0, total || 999);
    valEl.firstChild.textContent = String(entry.progress);
    valEl.classList.remove('bump');
    void valEl.offsetWidth;
    valEl.classList.add('bump');
    heroRing._setPct(D.seasonPct(entry));
    heroRing.querySelector('.ring__val').textContent = `${Math.round(D.seasonPct(entry) * 100)}%`;
  };
  const stepper = h('div.stepper', {},
    h('button.stepper__btn', { type: 'button', 'aria-label': 'Eine Folge zurück', onclick: () => setVal(entry.progress - 1) }, icon('minus', { size: 18 })),
    valEl,
    h('button.stepper__btn', { type: 'button', 'aria-label': 'Eine Folge weiter', onclick: () => setVal(entry.progress + 1) }, icon('plus', { size: 18 })));

  /* Wertung */
  const rate = h('div.rating', { role: 'group', 'aria-label': 'Wertung von 1 bis 10' });
  const paint = (v) => [...rate.children].forEach((c, i) => c.classList.toggle('is-on', i < v));
  for (let i = 1; i <= 10; i++) {
    rate.appendChild(h('button.rating__s', {
      type: 'button', 'aria-label': `${i} von 10`, 'aria-pressed': String((entry.rating ?? 0) >= i),
      onclick: () => { entry.rating = i; paint(i); toast(`Wertung ${i}/10 gespeichert`); },
    }, icon('star', { size: 21, filled: (entry.rating ?? 0) >= i })));
  }
  // Sternform tauschen statt nur einfärben: gefüllt = vergeben.
  const repaint = () => {
    [...rate.children].forEach((c, i) => {
      c.replaceChildren(icon('star', { size: 21, filled: (entry.rating ?? 0) >= i + 1 }));
      c.classList.toggle('is-on', (entry.rating ?? 0) >= i + 1);
    });
  };
  [...rate.children].forEach((c, i) => c.addEventListener('click', () => { entry.rating = i + 1; repaint(); }));
  repaint();

  const heroRing = ring(D.seasonPct(entry), { size: 62, stroke: 6, label: `${Math.round(D.seasonPct(entry) * 100)}%` });

  /* Franchise-Akkordeon */
  const acc = h('div', {});
  D.DETAIL_EXTRAS.franchise.forEach((grp, gi) => {
    const inner = h('div.drawer__inner', {},
      h('div', { style: { padding: '4px 12px 12px' } },
        h('div.row-scroll.no-bar.rail-row', {}, ...grp.items.map((m) => posterOf(m)))));
    const d = h('div.drawer' + (gi === 0 ? '.is-open' : ''), {},
      h('button.drawer__head', {
        type: 'button', 'aria-expanded': String(gi === 0),
        onclick: (ev) => {
          const el = ev.currentTarget.parentElement;
          const open = el.classList.toggle('is-open');
          ev.currentTarget.setAttribute('aria-expanded', String(open));
        },
      }, icon('franchise', { size: 18 }), h('span', {}, grp.group),
        h('span.sec__count.tnum', {}, String(grp.items.length)),
        h('span.caret', {}, icon('chevronDown', { size: 17 }))),
      h('div.drawer__body', {}, inner));
    acc.appendChild(d);
  });

  return h('div.screen', {},
    h('div.hero', {},
      D.entryBanner(entry) ? h('img', { src: D.entryBanner(entry), alt: '' }) : null,
      h('div.hero__in', {},
        h('span.hero__cover', {}, coverEl(s)),
        h('div', { style: { minWidth: 0, paddingBottom: '14px' } },
          badge(entry.status),
          h('h1.hero__title', {}, D.entryTitle(entry)),
          h('div.row__s', {}, [s?.studio, D.seasonTag(s), s?.episodes ? `${s.episodes} Folgen` : null].filter(Boolean).join(' · '))),
        h('div', { class: 'hide-mob', style: { marginLeft: 'auto', paddingBottom: '14px' } }, heroRing))),

    h('div.stack--lg', { class: 'stack', style: { paddingTop: '18px' } },
      h('div.acts', {},
        btn('Weiter schauen', { variant: 'primary', ico: 'play', iconFilled: true, onClick: () => toast('Fortsetzen') }),
        btn('Status ändern', { ico: 'shelf', onClick: () => openStatusDialog(entry) }),
        iconBtn('plus', 'Zur Watchlist', { onClick: () => toast('Zur Watchlist gelegt') }),
        iconBtn('more', 'Weitere Aktionen', { onClick: () => openDialog(entry) })),

      h('section', {},
        sectionHead('Fortschritt'),
        h('div.card', {}, h('div.card__pad.flex.flex-wrap', { style: { gap: '16px' } },
          stepper,
          h('div', {}, h('div.row__t', {}, `Staffel ${D.seasonNo(entry)} von ${entry.seasons.length}`),
            h('div.row__s', {}, `${D.watchedEpisodes(entry)} Folgen insgesamt · ${Math.round(D.watchedEpisodes(entry) * D.meanDuration(entry) / 60)} Std`)),
          h('div.push', {}, heroRing.cloneNode(true))))),

      h('section', {},
        sectionHead('Deine Wertung'),
        h('div.card', {}, h('div.card__pad', {}, rate,
          h('p.small.mut', { style: { marginTop: '8px' } }, entry.rating ? `${entry.rating} von 10` : 'Noch nicht bewertet')))),

      h('section', {}, sectionHead('Franchise'), acc),

      h('section', {},
        sectionHead('Infos'),
        h('div.card', {}, h('div.card__pad', {},
          h('p.dim.small', { style: { marginBottom: '12px' } }, s?.synopsis || 'Keine Beschreibung hinterlegt.'),
          h('div.facts', {}, ...D.DETAIL_EXTRAS.facts.map(([k, v]) => h('div.fact', {}, h('b', {}, k), h('span', {}, v))))))),

      posterRow('Empfehlungen', D.DETAIL_EXTRAS.recommendations)));
}

function openStatusDialog(entry) {
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  const box = h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Status ändern' },
    h('h3', {}, 'Status ändern'),
    h('p', {}, D.entryTitle(entry)),
    h('div.stack--sm', { class: 'stack', style: { marginTop: '16px' } },
      ...D.STATUS_ORDER.map((s) => h('button.row', {
        type: 'button', style: { borderRadius: 'var(--r-2)' },
        onclick: () => { entry.status = s; scrim.remove(); toast(`Status: ${D.STATUS_LABEL[s]}`); refresh(); },
      }, badge(s), h('span.push', {}, entry.status === s ? icon('check', { size: 18 }) : null)))),
    h('div.dialog__acts', {}, btn('Abbrechen', { onClick: () => scrim.remove() })));
  scrim.appendChild(box);
  document.body.appendChild(scrim);
  box.querySelector('button')?.focus();
}

function openDialog(entry) {
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  const box = h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Eintrag entfernen' },
    h('h3', {}, 'Aus dem Regal nehmen?'),
    h('p', {}, `„${D.entryTitle(entry)}" wird samt Fortschritt und Wertung entfernt. Das lässt sich nicht rückgängig machen.`),
    h('div.dialog__acts', {},
      btn('Behalten', { onClick: () => scrim.remove() }),
      btn('Entfernen', { variant: 'danger', ico: 'trash', onClick: () => { scrim.remove(); toast('Entfernt (Entwurf — nichts passiert wirklich)'); } })));
  scrim.appendChild(box);
  document.body.appendChild(scrim);
  box.querySelector('button')?.focus();
}

/* ============================================================ Statistik ==== */

function screenStats() {
  const st = D.STATS;
  const orbit = ring(st.completionPct, { size: 150, stroke: 12, label: null });
  orbit.appendChild(h('div', { style: { position: 'absolute', textAlign: 'center' } },
    h('div', { class: 'tile__v tnum', style: { fontSize: '30px' } }, st.days >= 1 ? st.days.toFixed(1) : String(st.hours)),
    h('div.tile__l', {}, st.days >= 1 ? 'Tage Sehzeit' : 'Stunden Sehzeit')));

  const donutRows = st.perStatus.filter((r) => r.count > 0);
  const donutTotal = donutRows.reduce((a, b) => a + b.count, 0) || 1;
  const donutColors = {
    watching: 'var(--brass-500)', nextup: 'var(--jade-500)', planned: 'var(--raised-3)',
    continuation: 'var(--ox-500)', completed: 'var(--brass-700)',
  };
  let acc = 0;
  const R = 52, C = 2 * Math.PI * R;
  const donut = h('svg', { width: 132, height: 132, viewBox: '0 0 132 132', 'aria-hidden': 'true' },
    ...donutRows.map((r) => {
      const len = (r.count / donutTotal) * C;
      const seg = h('circle', {
        cx: 66, cy: 66, r: R, fill: 'none',
        stroke: donutColors[r.status], 'stroke-width': 15,
        'stroke-dasharray': `${len - 2.5} ${C - len + 2.5}`,
        'stroke-dashoffset': String(-acc),
        transform: 'rotate(-90 66 66)',
      });
      acc += len;
      return seg;
    }));

  const maxGenre = Math.max(...st.genres.map((g) => g.value), 1);
  const maxRating = Math.max(...st.ratings.map((r) => r.count), 1);
  const maxYear = Math.max(...st.years.map((y) => y.value), 1);

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {},
      h('h1.page-title', {}, 'Statistik'),
      h('p.page-sub', {}, 'Was das Regal über dich verrät.')),

    h('div.card', {}, h('div.card__pad.flex.flex-wrap', { style: { gap: '20px' } },
      orbit,
      h('div', { style: { minWidth: '180px', flex: '1' } },
        h('div.tile__v.tnum', {}, num(st.episodes)),
        h('div.tile__l', {}, 'Folgen gesehen'),
        h('p.small.mut', { style: { marginTop: '10px' } },
          `${st.total} Einträge · ${Math.round(st.completionPct * 100)} % abgeschlossen · Ø Wertung ${st.avgRating.toFixed(1)}`)))),

    h('div.tiles', {},
      tile(String(st.total), 'Franchises'),
      tile(num(st.episodes), 'Folgen'),
      tile(num(st.hours), 'Stunden'),
      tile(st.avgRating.toFixed(1), 'Ø Wertung', `${st.ratedCount} bewertet`)),

    h('section', {},
      sectionHead('Nach Status'),
      h('div.card', {}, h('div.card__pad.flex.flex-wrap', { style: { gap: '22px' } },
        donut,
        h('div', { style: { flex: '1', minWidth: '190px' } }, ...donutRows.map((r) =>
          h('div.fact', {},
            h('b', { class: 'flex', style: { gap: '8px' } },
              h('span', { style: { width: '10px', height: '10px', borderRadius: '3px', background: donutColors[r.status] } }),
              D.STATUS_LABEL[r.status]),
            h('span.tnum', {}, String(r.count)))))))),

    h('section', {},
      sectionHead('Genres'),
      h('div.card', {}, h('div.card__pad.bars', { class: 'bars' }, ...st.genres.map((g) =>
        h('div.bar', {},
          h('span.mut', {}, g.label),
          h('span.bar__t', {}, h('i.bar__f', { style: { width: `${(g.value / maxGenre) * 100}%`, display: 'block' } })),
          h('span.bar__n.tnum', {}, String(g.value))))))),

    h('section', {},
      sectionHead('Wertungen'),
      h('div.card', {}, h('div.card__pad', {},
        h('div.dist', {}, ...st.ratings.map((r) =>
          h('div.dist__c', {},
            h('div.dist__b', { style: { height: `${(r.count / maxRating) * 100}%` }, title: `${r.count}×` }),
            h('div.dist__l.tnum', {}, String(r.score)))))))),

    h('section', {},
      sectionHead('Nach Jahr'),
      h('div.card', {}, h('div.card__pad', {},
        h('div.dist', {}, ...st.years.map((y) =>
          h('div.dist__c', {},
            h('div.dist__b', { style: { height: `${(y.value / maxYear) * 100}%` }, title: `${y.value}×` }),
            h('div.dist__l', {}, String(y.year).slice(2)))))))),

    h('section', {},
      sectionHead('Größte Brocken'),
      h('div.list', {}, ...st.longest.map((e, i) =>
        h('div.row', {},
          h('span.rank' + (i === 0 ? '.is-top' : ''), {}, String(i + 1)),
          h('span', { style: { width: '34px', flex: '0 0 34px' } }, coverEl(D.currentSeason(e), { tilt: false })),
          h('span.row__body', {}, h('span.row__t', {}, D.entryTitle(e)),
            h('span.row__s', {}, `${D.watchedEpisodes(e)} Folgen`)),
          h('span.row__n.tnum', {}, `${Math.round(D.watchedEpisodes(e) * D.meanDuration(e) / 60)} h`))))));
}

function tile(v, l, detail = null) {
  return h('div.tile', {}, h('div.tile__v.tnum', {}, v), h('div.tile__l', {}, l),
    detail ? h('div.tile__l', {}, detail) : null);
}

/* ========================================================= Einstellungen === */

function screenSettings() {
  let lang = 'de';
  const langSeg = () => segmented([{ key: 'de', label: 'Deutsch', short: 'DE' }, { key: 'en', label: 'English', short: 'EN' }], lang, (k) => {
    lang = k;
    const parent = langBox;
    clear(parent).appendChild(langSeg());
    toast(k === 'de' ? 'Sprache: Deutsch' : 'Language: English');
  });
  const langBox = h('div', {});
  langBox.appendChild(langSeg());

  const sw = h('button.switch.is-on', { type: 'button', role: 'switch', 'aria-checked': 'true', 'aria-label': 'Originaltitel anzeigen' });
  sw.addEventListener('click', () => {
    const on = sw.classList.toggle('is-on');
    sw.setAttribute('aria-checked', String(on));
  });

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {},
      h('h1.page-title', {}, 'Einstellungen'),
      h('p.page-sub', {}, 'Konto, Sprache, Sicherung.')),

    h('section', {},
      sectionHead('Profil'),
      h('div.card', {}, h('div.card__pad.flex', {},
        h('span.iconbtn.iconbtn--brass', { style: { width: '52px', height: '52px' } }, icon('user', { size: 26, filled: true })),
        h('div', {},
          h('div.row__t', {}, D.PROFILE.name),
          h('div.row__s', {}, D.PROFILE.email),
          h('div.row__s', {}, `${D.PROFILE.since} · ${D.PROFILE.devices} Geräte · Sync ${D.PROFILE.lastSync}`))))),

    h('section', {},
      sectionHead('Sprache'),
      h('div.card', {}, h('div.card__pad', {},
        h('p.small.mut', { style: { marginBottom: '10px' } },
          'Serientitel bleiben in beiden Sprachen international — AniList liefert keine deutschen Titel.'),
        langBox))),

    h('section', {},
      sectionHead('Anzeige'),
      h('div.list', {},
        h('div.row', {},
          icon('film', { size: 20, filled: true }),
          h('span.row__body', {}, h('span.row__t', {}, 'Originaltitel bevorzugen'),
            h('span.row__s', {}, 'Romaji statt internationalem Titel')),
          sw),
        h('a.row', { href: '#/bausteine' },
          icon('disc', { size: 20, filled: true }),
          h('span.row__body', {}, h('span.row__t', {}, 'Bausteine ansehen'),
            h('span.row__s', {}, 'Alle Knöpfe, Icons und Zustände dieser Version')),
          icon('chevronRight', { size: 18, cls: 'mut' })))),

    h('section', {},
      sectionHead('Sicherung'),
      h('div.card', {}, h('div.card__pad.flex.flex-wrap', {},
        btn('Exportieren', { ico: 'download', onClick: () => toast('Export erstellt (Entwurf)') }),
        btn('Importieren', { ico: 'upload', onClick: () => toast('Import gestartet (Entwurf)') }),
        h('span.small.mut', {}, 'Letzte Sicherung: heute, 08:14')))),

    h('section', {},
      sectionHead('Gefahrenzone'),
      h('div.danger-zone', {},
        h('div.row__t', {}, 'Bibliothek leeren'),
        h('p.small.mut', { style: { margin: '4px 0 12px' } },
          'Löscht alle Einträge auf allen Geräten. Es gibt keinen Papierkorb.'),
        h('div.flex.flex-wrap', {},
          btn('Alles löschen', { variant: 'danger', ico: 'trash', onClick: () => openDialog(D.LIBRARY[0]) }),
          btn('Abmelden', { ico: 'logout', onClick: () => toast('Abgemeldet (Entwurf)') })))));
}

/* =============================================================== Suche ===== */

let paletteOpen = false;

function openPalette() {
  if (paletteOpen) return;
  paletteOpen = true;
  const scrim = h('div.scrim', {
    onclick: (e) => { if (e.target === scrim) close(); },
  });
  const close = () => { paletteOpen = false; scrim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  const results = h('div.palette__body');
  const input = h('input', {
    type: 'search', placeholder: 'Titel, Genre oder Befehl …', 'aria-label': 'Suche',
    autocomplete: 'off', spellcheck: 'false',
  });

  const draw = (q) => {
    clear(results);
    const term = q.trim().toLowerCase();
    const acts = D.SEARCH_ACTIONS.filter((a) => !term || a.label.toLowerCase().includes(term));
    const hits = (term
      ? Object.values(D.MEDIA).filter((m) => m.title.toLowerCase().includes(term) || (m.romaji ?? '').toLowerCase().includes(term))
      : D.SEARCH_RECENT).slice(0, 8);

    if (acts.length) {
      results.appendChild(h('div.part__label', {}, 'Befehle'));
      for (const a of acts) {
        results.appendChild(h('button.row', {
          type: 'button', style: { borderRadius: 'var(--r-2)' },
          onclick: () => { close(); toast(a.label); },
        }, icon('sparkle', { size: 18, filled: true }),
          h('span.row__body', {}, h('span.row__t', {}, a.label), h('span.row__s', {}, a.hint))));
      }
    }
    results.appendChild(h('div.part__label', {}, term ? 'Treffer' : 'Zuletzt gesucht'));
    if (!hits.length) results.appendChild(h('div.empty', {}, h('div.empty__t', {}, 'Nichts gefunden'), h('div.empty__s', {}, 'Anderer Begriff?')));
    for (const m of hits) {
      results.appendChild(h('button.row', {
        type: 'button', style: { borderRadius: 'var(--r-2)' },
        onclick: () => { close(); go('detail'); },
      }, h('span', { style: { width: '32px', flex: '0 0 32px' } }, coverEl(m, { tilt: false })),
        h('span.row__body', {}, h('span.row__t', {}, m.title),
          h('span.row__s', {}, [D.FORMAT_LABEL[m.format], D.seasonTag(m)].filter(Boolean).join(' · ')))));
    }
  };
  input.addEventListener('input', () => draw(input.value));
  draw('');

  scrim.appendChild(h('div.palette', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Suche' },
    h('div.palette__in', {}, icon('search', { size: 19, cls: 'mut' }), input,
      h('button.iconbtn.iconbtn--sm', { type: 'button', 'aria-label': 'Suche schließen', onclick: close }, icon('x', { size: 16 }))),
    results));
  document.body.appendChild(scrim);
  input.focus();
}

function screenSearch() {
  // Die Suche ist ein Overlay ÜBER dem letzten Bildschirm — kein eigener Ort.
  requestAnimationFrame(openPalette);
  return screenHome();
}

/* ============================================================ Bausteine ==== */

function screenParts() {
  const swatch = (v, n) => h('div.sw', {}, h('i', { style: { background: `var(${v})` } }), h('span', {}, n));

  const btnStates = h('div.part__row', {},
    btn('Ruhend', { variant: 'primary' }),
    (() => { const b = btn('Gedrückt', { variant: 'primary' }); b.classList.add('is-down'); return b; })(),
    (() => { const b = btn('Ladend', { variant: 'primary' }); b.classList.add('is-loading'); return b; })(),
    btn('Deaktiviert', { variant: 'primary', disabled: true }));

  const iconTable = h('div.icon-table', {}, ...ICON_NAMES.map((n) =>
    h('div.icon-cell', {},
      h('div.icon-cell__pair', {},
        icon(n, { size: 24 }),
        PAIRED.includes(n) ? h('span.on', {}, icon(n, { size: 24, filled: true })) : h('span.mut', { style: { fontSize: '11px' } }, '—')),
      h('div.icon-cell__n', {}, n))));

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {},
      h('h1.page-title', {}, 'Bausteine'),
      h('p.page-sub', {},
        'Die Seite, auf der die Knöpfe wirklich beurteilt werden: jeder Zustand nebeneinander, in Originalgröße.')),

    h('div.parts-grid', {},
      part('Knöpfe — Zustände', 'Druck heißt: das Element fährt runter, der Schatten fällt zusammen. Hover ist Zusatz, nicht Sprache.',
        h('div.part__label', {}, 'Primär (Messing)'), btnStates,
        h('div.part__label', {}, 'Sekundär'),
        h('div.part__row', {}, btn('Ruhend'),
          (() => { const b = btn('Gedrückt'); b.classList.add('is-down'); return b; })(),
          (() => { const b = btn('Ladend'); b.classList.add('is-loading'); return b; })(),
          btn('Deaktiviert', { disabled: true })),
        h('div.part__label', {}, 'Leise & Gefahr'),
        h('div.part__row', {}, btn('Leise', { variant: 'quiet' }), btn('Abbrechen', { variant: 'quiet', ico: 'x' }),
          btn('Entfernen', { variant: 'danger', ico: 'trash' })),
        h('div.part__label', {}, 'Klein & Icon-Knöpfe'),
        h('div.part__row', {}, btn('Klein', { sm: true, ico: 'plus' }), btn('Klein primär', { variant: 'primary', sm: true, ico: 'play', iconFilled: true }),
          iconBtn('search', 'Suchen'), iconBtn('dice', 'Würfeln'), iconBtn('more', 'Mehr'), iconBtn('check', 'Fertig', { sm: true }))),

      part('Icon-Satz', `${ICON_NAMES.length} Zeichen, alle als SVG-Pfade — keine Emojis, keine Unicode-Symbole. Links Kontur (inaktiv), rechts gefüllt (aktiv). ${PAIRED.length} davon haben ein echtes Paar.`,
        iconTable),

      part('Umschalter & Chips', 'Die Kapsel wandert mit Feder — sie erscheint nicht neu.',
        segmented([
          { key: 'a', label: 'Weiter schauen', short: 'Weiter', count: 9 },
          { key: 'b', label: 'Noch zu schauen', short: 'Bereit', count: 4 },
          { key: 'c', label: 'Watchlist', short: 'Liste', count: 7 },
        ], 'a', () => {}),
        h('div.part__label', {}, 'Chips'),
        h('div.part__row', {},
          h('button.chip.is-on', { type: 'button' }, 'Aktiv'),
          h('button.chip', { type: 'button' }, 'Ruhend'),
          h('button.chip', { type: 'button' }, h('span.chip__dot'), 'Mit Punkt')),
        h('div.part__label', {}, 'Status-Plaketten'),
        h('div.part__row', {}, ...D.STATUS_ORDER.map((s) => badge(s)))),

      part('Fortschritt & Eingabe', 'Zahlen rasten ein, sie blinken nicht um.',
        h('div.part__row', { style: { gap: '20px' } },
          ring(0.25, { size: 56, stroke: 5, label: '3' }),
          ring(0.62, { size: 56, stroke: 5, label: '9' }),
          ring(1, { size: 56, stroke: 5, label: '12' }),
          h('div.stepper', {},
            h('button.stepper__btn', { type: 'button', 'aria-label': 'Weniger' }, icon('minus', { size: 18 })),
            h('span.stepper__val.tnum', {}, h('span', {}, '9'), h('small', {}, '/ 23')),
            h('button.stepper__btn', { type: 'button', 'aria-label': 'Mehr' }, icon('plus', { size: 18 }))),
          h('button.switch.is-on', { type: 'button', role: 'switch', 'aria-checked': 'true', 'aria-label': 'Beispielschalter' }),
          h('button.switch', { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': 'Beispielschalter aus' })),
        h('div.part__label', {}, 'Wertung'),
        h('div.part__row', {}, (() => {
          const r = h('div.rating', {});
          for (let i = 1; i <= 10; i++) r.appendChild(h('span.rating__s' + (i <= 7 ? '.is-on' : ''), {}, icon('star', { size: 21, filled: i <= 7 })));
          return r;
        })()),
        h('div.part__label', {}, 'Eingabefeld'),
        h('div.part__row', {}, h('input.input', { type: 'text', value: 'Frieren', style: { maxWidth: '260px' }, 'aria-label': 'Beispiel-Eingabe' }))),

      part('Listenzeilen', 'Eine Zeile ist eine Lade: greifbar links, Wert rechts.',
        h('div.list', {},
          h('div.row', {}, h('span.rank.is-top', {}, '1'),
            h('span', { style: { width: '34px', flex: '0 0 34px' } }, coverEl(D.M(154587), { tilt: false })),
            h('span.row__body', {}, h('span.row__t', {}, 'Frieren'), h('span.row__s', {}, '28 Folgen')),
            h('span.row__n.tnum', {}, '10'),
            h('span.row__grip', {}, icon('grip', { size: 17 }))),
          h('div.row', {}, h('span.rank', {}, '2'),
            h('span', { style: { width: '34px', flex: '0 0 34px' } }, coverEl(D.M(5114), { tilt: false })),
            h('span.row__body', {}, h('span.row__t', {}, 'Fullmetal Alchemist: Brotherhood'), h('span.row__s', {}, '64 Folgen')),
            h('span.row__n.tnum', {}, '10'),
            h('span.row__grip', {}, icon('grip', { size: 17 }))))),

      part('Dialog, Hinweis, Leerzustand', 'Alles, was auftaucht, kommt mit Gewicht von unten.',
        h('div.part__row', {},
          btn('Dialog zeigen', { onClick: () => openDialog(D.LIBRARY[0]) }),
          btn('Hinweis zeigen', { onClick: () => toast('Folge 10 als gesehen markiert') }),
          btn('Suche öffnen', { ico: 'search', onClick: openPalette })),
        h('div', { style: { marginTop: '14px' } }, emptyState('Leeres Fach', 'Hier steht gerade nichts.'))),

      part('Skelette', 'Beim Laden bleibt die Form stehen, nur der Inhalt fehlt.',
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px,1fr))', gap: '14px' } },
          ...Array.from({ length: 4 }, () => h('div', {},
            h('div.skel.skel--cover'),
            h('div.skel.skel--line', { style: { marginTop: '8px', width: '85%' } }),
            h('div.skel.skel--line', { style: { marginTop: '6px', width: '55%' } }))))),

      part('Farbleiter', 'Durchgestuft mit bewusstem Kontrastabstand — nicht drei zufällige Töne.',
        h('div.swatches', {},
          swatch('--bg', '--bg'), swatch('--surface', '--surface'), swatch('--raised', '--raised'),
          swatch('--raised-2', '--raised-2'), swatch('--raised-3', '--raised-3'),
          swatch('--brass-100', '--brass-100'), swatch('--brass-300', '--brass-300'), swatch('--brass-500', '--brass-500'),
          swatch('--brass-700', '--brass-700'), swatch('--brass-900', '--brass-900'),
          swatch('--ox-500', '--ox-500'), swatch('--jade-500', '--jade-500'),
          swatch('--ink', '--ink'), swatch('--ink-2', '--ink-2'), swatch('--ink-3', '--ink-3'))),

      part('Schrift', 'Bricolage Grotesque für Titel, Archivo für alles Bedienbare. Tabellarische Ziffern überall, wo gezählt wird.',
        h('div', {},
          h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: '800', letterSpacing: '-.03em' } }, 'Dein Regal'),
          h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '21px', fontWeight: '700' } }, 'Frieren: Beyond Journey’s End'),
          h('div.dim', { style: { marginTop: '8px' } }, 'Archivo — Fließtext und Bedienelemente, 15 px.'),
          h('div.mut.tnum', { style: { marginTop: '4px' } }, '0123456789 · 12 / 28 Folgen · 1.284 Stunden')))));
}

function part(title, note, ...kids) {
  return h('section.part', {}, h('h3.part__h', {}, title), h('p.part__n', {}, note), ...kids);
}

/* =============================================================== Rahmen ==== */

function tabbar(active) {
  return h('nav.tabbar', { 'aria-label': 'Hauptnavigation' },
    ...NAV.map((n) => h('a.tabbar__item' + (n.key === active ? '.is-on' : ''), {
      href: `#/${n.key}`, 'aria-current': n.key === active ? 'page' : null,
    }, iconPair(n.ico, { size: 23, active: n.key === active }), h('span.tabbar__label', {}, n.label))));
}

function rail(active) {
  return h('aside.rail', {},
    h('div.rail__brand', {},
      h('img', { src: '/assets/logo.png', alt: '', width: 32, height: 32, style: { borderRadius: '8px' } }),
      h('span.brandmark__word', {}, 'Tsugi'),
      /* つぎ — genau EINMAL in dieser Version: als Gravur auf dem Regalrücken. */
      h('span.flex', { style: { marginLeft: 'auto', gap: '6px', alignSelf: 'stretch' } },
        h('span.kana.kana--vert', { title: 'つぎ — als Nächstes' }, 'つぎ'),
        h('span.spine'))),
    h('button.searchbtn', { type: 'button', onclick: openPalette },
      icon('search', { size: 18 }), h('span', {}, 'Suchen'), h('kbd', {}, 'Strg K')),
    h('div', { style: { height: '10px' } }),
    ...NAV.map((n) => h('a.rail__item' + (n.key === active ? '.is-on' : ''), {
      href: `#/${n.key}`, 'aria-current': n.key === active ? 'page' : null,
    }, iconPair(n.ico, { size: 21, active: n.key === active }), h('span', {}, n.key === 'einstellungen' ? 'Einstellungen' : n.label))),
    h('a.rail__item' + (active === 'bausteine' ? '.is-on' : ''), { href: '#/bausteine' },
      iconPair('disc', { size: 21, active: active === 'bausteine' }), h('span', {}, 'Bausteine')),
    h('div.rail__foot', {},
      h('a.small.mut', { href: '/index.html' }, '← Showroom'),
      h('p.small.mut', { style: { marginTop: '6px' } }, 'V1 „Regal" — Entwurf, keine echten Daten.')));
}

function mobileHead(active) {
  const title = NAV.find((n) => n.key === active)?.label ?? 'Tsugi';
  return h('header.topbar', {},
    active === 'home'
      ? h('span.brandmark', {},
        h('img', { src: '/assets/logo.png', alt: 'Tsugi' }),
        h('span.brandmark__word', {}, 'Tsugi'))
      : h('a.iconbtn.iconbtn--sm', { href: '#/home', 'aria-label': 'Zurück zum Start' }, icon('chevronLeft', { size: 18 })),
    h('span.topbar__title', {}, active === 'home' ? '' : (active === 'detail' ? 'Titel' : title)),
    h('button.iconbtn.iconbtn--sm', { type: 'button', 'aria-label': 'Suchen', onclick: openPalette }, icon('search', { size: 18 })));
}

/* ================================================================ Start ==== */

defineScreens({
  home: screenHome,
  bibliothek: screenLibrary,
  entdecken: screenDiscover,
  detail: screenDetail,
  statistik: screenStats,
  einstellungen: screenSettings,
  suche: screenSearch,
  bausteine: screenParts,
});

const root = document.getElementById('root');
const shell = h('div.app', {});
/* Kopfzeile liegt IM Inhaltsbereich: nur so darf sie mit negativem Rand
   bis an den Rand ziehen, ohne die Seite breiter zu machen. */
/* display:contents — sonst ist dieser Wrapper der Bezugskasten der klebenden
   Kopfzeile, und sie klebt nur innerhalb ihrer eigenen Höhe (also gar nicht). */
const headSlot = h('div', { style: { display: 'contents' } });
const wrap = h('div.wrap', {});
const mount = h('main.main', { id: 'inhalt' }, headSlot, wrap);
shell.append(h('div', {}), mount);
root.append(
  h('a.skip.btn.btn--primary', { href: '#inhalt' }, 'Zum Inhalt springen'),
  shell);

startRouter({
  mount: wrap,
  fallback: 'home',
  onChange: (key) => {
    const navKey = NAV.some((n) => n.key === key) ? key : (key === 'bausteine' ? 'bausteine' : key);
    clear(headSlot).appendChild(mobileHead(key));
    shell.firstChild.replaceWith(rail(navKey));
    document.querySelector('.tabbar')?.remove();
    document.body.appendChild(tabbar(navKey));
    document.title = `Tsugi V1 „Regal" — ${NAV.find((n) => n.key === key)?.label ?? key}`;
  },
});

/* Kopfzeile bekommt erst eine Linie, wenn wirklich gescrollt wurde. */
window.addEventListener('scroll', () => {
  document.querySelector('.topbar')?.classList.toggle('is-stuck', window.scrollY > 6);
}, { passive: true });

/* Countdowns laufen weiter, egal welcher Bildschirm offen ist. */
setInterval(() => {
  for (const el of document.querySelectorAll('[data-airing]')) {
    el.textContent = D.countdownShort(Number(el.dataset.airing));
  }
}, 30000);

/* Strg/Cmd + K öffnet die Suche — auf jedem Bildschirm. */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});
