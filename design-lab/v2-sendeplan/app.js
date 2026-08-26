/**
 * V2 „SENDEPLAN" — sieben Bildschirme.
 *
 * Leitgedanke: Anime wird gesendet. Der Bildschirm ist ein Programmplan,
 * die Bedienelemente sind ein Regieplatz. Jeder Status hat seine eigene
 * Bauform (ON AIR / BEREIT / GEPLANT / ARCHIV / WARTELISTE), nicht bloß ein
 * anderes Etikett — man erkennt am Aussehen, wo man ist.
 */

import { h, clear, num, clamp, reducedMotion, countTo, finePointer } from '../shared/dom.js';
import { defineScreens, startRouter, go, refresh } from '../shared/router.js';
import * as D from '../shared/mock.js';
import { icon, iconPair } from './icons.js';

/* ============================================================== Zustand ==== */

const state = {
  chan: 'watching',
  libChan: 'watching',
  genre: null,
  detailId: D.DETAIL_ENTRY.rootId,
  detailSeason: null,
};

const NAV = [
  { key: 'home', label: 'Plan', ico: 'board' },
  { key: 'bibliothek', label: 'Archiv', ico: 'tape' },
  { key: 'entdecken', label: 'Signal', ico: 'signal' },
  { key: 'statistik', label: 'Pegel', ico: 'levels' },
  { key: 'einstellungen', label: 'Regie', ico: 'sliders' },
];

/** Kanalnamen der Status — im Sendeplan heißt nichts „Watchlist-Tab". */
const CHAN = {
  watching: 'On Air',
  nextup: 'Bereit',
  planned: 'Warteliste',
  continuation: 'Geplant',
  completed: 'Archiv',
};

/* =============================================================== Helfer ==== */

function toast(text) {
  document.querySelector('.toast')?.remove();
  const t = h('div.toast', { role: 'status' }, icon('tally', { size: 15, filled: true }), h('span', {}, text));
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function cover(media, { cls = '' } = {}) {
  const box = h('span.cover' + (cls ? '.' + cls : ''), {});
  if (media?.cover) box.appendChild(h('img', { src: media.cover, alt: '', loading: 'lazy', decoding: 'async' }));
  return box;
}

function key(label, opts = {}) {
  const { variant = '', ico = null, onClick = null, sm = false, disabled = false, wide = false, filled = false } = opts;
  const b = h('button.k' + (variant ? `.k--${variant}` : '') + (sm ? '.k--sm' : '') + (wide ? '.k--wide' : ''),
    { type: 'button', disabled: disabled || null, onclick: onClick || undefined });
  if (ico) b.appendChild(icon(ico, { size: sm ? 15 : 17, filled }));
  if (label) b.appendChild(h('span', {}, label));
  return b;
}

function kbtn(name, label, opts = {}) {
  const { onClick = null, sm = false, filled = false } = opts;
  return h('button.kbtn' + (sm ? '.kbtn--sm' : ''),
    { type: 'button', 'aria-label': label, title: label, onclick: onClick || undefined },
    icon(name, { size: sm ? 16 : 19, filled }));
}

function tally(kind, text) {
  return h(`span.tally.tally--${kind}`, {}, h('i'), text);
}

function sec(index, title, { count = null, action = null } = {}) {
  return h('div.sec', {},
    h('span.sec__i.mono', {}, index),
    h('h2.sec__t', {}, title),
    count !== null ? h('span.sec__n', {}, String(count).padStart(2, '0')) : null,
    action ? h('span.sec__more', {}, action) : null);
}

function channels(items, active, onPick) {
  const box = h('nav.chan', { role: 'tablist' });
  for (const it of items) {
    box.appendChild(h('button.chan__b' + (it.key === active ? '.is-on' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(it.key === active),
      onclick: () => onPick(it.key),
    }, h('span.lbl', {}, it.label), it.count != null ? h('span.n', {}, String(it.count).padStart(2, '0')) : null));
  }
  return box;
}

/** Die Zeitleiste — Signaturelement. Zeigt den laufenden Tag mit Laufbalken. */
function dayRuler() {
  const now = new Date();
  const pct = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const bar = h('div.ruler', { 'aria-hidden': 'true' });
  for (let hh = 0; hh <= 24; hh += 3) {
    bar.appendChild(h('span.ruler__mark.mono', { style: { left: `${(hh / 24) * 100}%` } },
      `${String(hh % 24).padStart(2, '0')}:00`));
  }
  const glow = h('div.ruler__glow');
  bar.appendChild(glow);
  bar.appendChild(h('div.ruler__head', { style: { left: `${pct * 100}%` } }));
  if (finePointer()) {
    bar.addEventListener('pointermove', (e) => {
      const r = bar.getBoundingClientRect();
      glow.style.setProperty('--gx', `${e.clientX - r.left - 60}px`);
    });
  }
  return bar;
}

function statusOf(e) {
  return e.status;
}

/* ======================================== EINTRAG 1: ON AIR (watching) ===== */

function slotCard(entry) {
  const s = D.currentSeason(entry);
  const total = s?.episodes ?? 0;
  const seg = 24;
  const meter = h('div.meter', { 'aria-hidden': 'true' });
  const paintMeter = () => {
    clear(meter);
    const on = total ? Math.round((entry.progress / total) * seg) : 0;
    for (let i = 0; i < seg; i++) meter.appendChild(h('i' + (i < on ? '.on' : '')));
  };
  paintMeter();

  const code = h('div.slot__code', {},
    `${entry.seasons.length > 1 ? `S${String(D.seasonNo(entry)).padStart(2, '0')} · ` : ''}`
    + `E${String(entry.progress).padStart(2, '0')}/${total ? String(total).padStart(2, '0') : '--'}`
    + (s?.nextAiring ? `  ·  NÄCHSTE ${D.weekdayTime(s.nextAiring.airingAt)}` : ''));

  const card = h('article.slot', {},
    h('a.slot__cover', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } }, cover(s)),
    h('div.slot__body', {},
      h('div.fx', {}, tally('live', 'On Air'), h('span.push.mono.sm.mut', {}, `${Math.round(D.seasonPct(entry) * 100)} %`)),
      h('a.slot__t', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } }, D.entryTitle(entry)),
      code,
      meter,
      h('div.slot__acts', {},
        key('Folge +1', {
          variant: 'sig', ico: 'plus', sm: true,
          onClick: () => {
            if (total && entry.progress >= total) { toast('Staffel durch — ins Archiv legen?'); return; }
            D.bumpProgress(entry.rootId, +1);
            paintMeter();
            code.textContent = `${entry.seasons.length > 1 ? `S${String(D.seasonNo(entry)).padStart(2, '0')} · ` : ''}E${String(entry.progress).padStart(2, '0')}/${total ? String(total).padStart(2, '0') : '--'}`;
          },
        }),
        key('Ins Archiv', { sm: true, ico: 'check', onClick: () => { D.setStatus(entry.rootId, 'completed'); toast(`${D.entryTitle(entry)} → Archiv`); refresh(); } }),
        kbtn('more', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) }))));
  return card;
}

/* ========================================= EINTRAG 2: BEREIT (nextup) ====== */

function cueCard(entry) {
  const s = D.currentSeason(entry);
  return h('article.cue', {},
    h('a.cue__reel', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } }, cover(s)),
    h('div.slot__body', {},
      h('div.fx', {}, tally('cue', 'Band eingelegt')),
      h('a.cue__t', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } }, D.entryTitle(entry)),
      h('div.slot__code', {},
        [entry.seasons.length > 1 ? `STAFFEL ${D.seasonNo(entry)}` : null,
          s?.episodes ? `${String(s.episodes).padStart(2, '0')} FOLGEN` : null,
          D.seasonTag(s)?.toUpperCase()].filter(Boolean).join('  ·  ')),
      h('div.slot__acts', {},
        key('Senden', { variant: 'sig', ico: 'play', filled: true, sm: true, onClick: () => { D.setStatus(entry.rootId, 'watching'); toast(`${D.entryTitle(entry)} läuft`); refresh(); } }),
        key('Warteliste', { sm: true, onClick: () => { D.setStatus(entry.rootId, 'planned'); toast('Auf die Warteliste'); refresh(); } }),
        kbtn('more', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) }))));
}

/* ==================================== EINTRAG 3: GEPLANT (continuation) ==== */

function holdCard(entry) {
  const s = D.currentSeason(entry);
  const air = s?.nextAiring;
  return h('article.hold', {},
    h('a', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } }, cover(s)),
    h('div.slot__body', {},
      h('div.fx', {}, tally('hold', 'Programmplatz reserviert')),
      h('a.hold__t', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } }, D.entryTitle(entry)),
      h('span.hold__stamp', {}, icon('clock', { size: 13 }),
        (entry.releaseNote ?? D.releaseLabel(s) ?? 'Datum offen').toUpperCase()),
      air
        ? h('div.hold__cd.mono', { dataset: { airing: String(air.airingAt) } }, D.countdownShort(air.airingAt))
        : h('div.sm.mut', {}, 'Sendetermin noch nicht bestätigt'),
      h('div.slot__acts', {},
        key('Erinnern', { sm: true, ico: 'stamp', onClick: () => toast('Erinnerung gesetzt (Entwurf)') }),
        kbtn('more', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) }))));
}

/* ======================================== EINTRAG 4: ARCHIV (completed) ==== */

function archTile(entry, index) {
  const s = D.currentSeason(entry) ?? entry.seasons[0];
  const box = h('a.tile.arch', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } });
  const cv = cover(s);
  cv.appendChild(h('span.arch__punch', {}, icon('check', { size: 14 })));
  cv.appendChild(h('span.arch__band.mono', {},
    h('span', {}, `NR ${String(index + 1).padStart(3, '0')}`),
    h('b', {}, `${D.watchedEpisodes(entry)} F`)));
  box.append(cv,
    h('span.tile__t', {}, D.entryTitle(entry)),
    h('span.tile__m', {}, `${entry.seasons.length} TEILE · ${Math.round(D.watchedEpisodes(entry) * D.meanDuration(entry) / 60)} STD`));
  return box;
}

/* ==================================== EINTRAG 5: WARTELISTE (planned) ====== */

function planTile(mediaOrEntry) {
  const entry = mediaOrEntry.seasons ? mediaOrEntry : null;
  const m = entry ? D.currentSeason(entry) : mediaOrEntry;
  const box = h('a.tile', {
    href: '#/detail',
    onclick: () => { if (entry) { state.detailId = entry.rootId; state.detailSeason = null; } },
  });
  const cv = cover(m);
  cv.appendChild(h('span', {
    class: 'mono',
    style: {
      position: 'absolute', left: '0', top: '0',
      background: 'var(--sig-500)', color: '#14100c',
      fontSize: '10px', letterSpacing: '.1em', padding: '3px 6px',
    },
  }, 'WARTET'));
  box.append(cv,
    h('span.tile__t', {}, m?.title ?? '—'),
    h('span.tile__m', {}, [D.FORMAT_LABEL[m?.format], D.seasonTag(m)?.toUpperCase(), m?.episodes ? `${m.episodes} F` : null].filter(Boolean).join(' · ')));
  return box;
}

/* ================================================================ Start ==== */

function screenHome() {
  const now = new Date();
  const dateLine = now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

  const counts = {
    watching: D.byStatus('watching').length,
    nextup: D.byStatus('nextup').length,
    planned: D.byStatus('planned').length,
  };

  const body = h('div.stack');
  if (state.chan === 'watching') {
    const l = D.byStatus('watching');
    body.appendChild(l.length ? h('div.stack', {}, ...l.map(slotCard))
      : empty('Kein Programm', 'Es läuft gerade nichts.'));
  } else if (state.chan === 'nextup') {
    const l = D.byStatus('nextup');
    body.appendChild(l.length ? h('div.stack', {}, ...l.map(cueCard))
      : empty('Kein Band eingelegt', 'Sobald eine neue Staffel da ist, liegt sie hier bereit.'));
  } else {
    body.appendChild(rollerBar());
    body.appendChild(h('div.grid-big', {}, ...D.byStatus('planned').map(planTile)));
  }

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {},
      h('div.mono.sm.mut', { style: { letterSpacing: '.12em', textTransform: 'uppercase' } }, dateLine),
      h('h1.ptitle', {}, 'Sendeplan'),
      h('p.psub', {}, `${D.LIBRARY.length} Produktionen im Bestand · ${num(D.stats().episodes)} Folgen gesendet`)),
    dayRuler(),
    channels([
      { key: 'watching', label: CHAN.watching, count: counts.watching },
      { key: 'nextup', label: CHAN.nextup, count: counts.nextup },
      { key: 'planned', label: CHAN.planned, count: counts.planned },
    ], state.chan, (k) => { state.chan = k; refresh(); }),
    body,
    simulcastBoard());
}

function rollerBar() {
  const pool = D.ROLL_POOL.length ? D.ROLL_POOL : D.LIBRARY;
  const face = h('span', { style: { width: '54px', flex: '0 0 54px' } }, cover(D.currentSeason(pool[0])));
  const name = h('div.row__b', {},
    h('div.row__t', {}, 'Zufallsprogramm'),
    h('div.row__s', {}, 'EIN TITEL AUS DER WARTELISTE'));
  return h('div.list', {}, h('div.row', {}, face, name,
    key('Auslosen', {
      variant: 'sig', ico: 'dice', sm: true,
      onClick: (ev) => {
        const b = ev.currentTarget;
        if (b.dataset.busy) return;
        b.dataset.busy = '1';
        const steps = reducedMotion() ? 1 : 12;
        let i = 0;
        const tick = () => {
          const p = pool[Math.floor(Math.random() * pool.length)];
          face.replaceChildren(cover(D.currentSeason(p)));
          name.replaceChildren(h('div.row__t', {}, D.entryTitle(p)),
            h('div.row__s', {}, CHAN[p.status].toUpperCase()));
          if (++i < steps) setTimeout(tick, 60 + i * 14);
          else { delete b.dataset.busy; toast(`Ausgelost: ${D.entryTitle(p)}`); }
        };
        tick();
      },
    })));
}

function simulcastBoard() {
  if (!D.SIMULCAST.length) return null;
  const list = h('div.list');
  for (const { entry, season } of D.SIMULCAST.slice(0, 8)) {
    list.appendChild(h('a.row', { href: '#/detail', onclick: () => { state.detailId = entry.rootId; state.detailSeason = null; } },
      h('span.row__c', {}, cover(season)),
      h('span.row__b', {},
        h('span.row__t', {}, D.entryTitle(entry)),
        h('span.row__s', {}, `E${String(season.nextAiring.episode).padStart(2, '0')} · ${D.weekdayTime(season.nextAiring.airingAt).toUpperCase()}`)),
      h('span.row__n', { dataset: { airing: String(season.nextAiring.airingAt) } }, D.countdownShort(season.nextAiring.airingAt))));
  }
  return h('section', {}, sec('02', 'Sendetermine', { count: D.SIMULCAST.length }), list);
}

function empty(t, s) {
  return h('div.empty', {}, icon('marker', { size: 26 }), h('div.empty__t', {}, t), h('div.empty__s', {}, s));
}

/* ============================================================= Archiv ====== */

function screenLibrary() {
  const chans = D.STATUS_ORDER.map((s) => ({ key: s, label: CHAN[s], count: D.byStatus(s).length }));
  const body = h('div.stack');
  const l = D.byStatus(state.libChan);

  if (!l.length) body.appendChild(empty('Leerer Kanal', 'Hier liegt gerade nichts.'));
  else if (state.libChan === 'watching') body.appendChild(h('div.stack', {}, ...l.map(slotCard)));
  else if (state.libChan === 'nextup') body.appendChild(h('div.stack', {}, ...l.map(cueCard)));
  else if (state.libChan === 'continuation') body.appendChild(h('div.stack', {}, ...l.map(holdCard)));
  else if (state.libChan === 'completed') body.appendChild(h('div.grid-big', {}, ...l.map(archTile)));
  else body.appendChild(h('div.grid-big', {}, ...l.map(planTile)));

  const note = {
    watching: 'Belegte Sendeplätze — was gerade läuft.',
    nextup: 'Eingelegte Bänder — bereit zum Senden.',
    planned: 'Warteliste — noch nicht eingeplant.',
    continuation: 'Reservierte Programmplätze — angekündigt, noch nicht da.',
    completed: 'Archiv — abgelegt und durchnummeriert.',
  }[state.libChan];

  return h('div.screen.stack', {},
    h('div', {}, h('h1.ptitle', {}, 'Archiv'), h('p.psub', {}, note)),
    channels(chans, state.libChan, (k) => { state.libChan = k; refresh(); }),
    body);
}

/* =========================================================== Signal ======== */

function screenDiscover() {
  const chips = h('div.row-scroll.no-bar', { style: { gap: '7px', padding: '2px 0 8px' } },
    h('button.chip' + (state.genre === null ? '.is-on' : ''), { type: 'button', onclick: () => { state.genre = null; refresh(); } }, 'Alle'),
    ...D.GENRES.map((g) => h('button.chip' + (state.genre === g ? '.is-on' : ''), {
      type: 'button', onclick: () => { state.genre = g; refresh(); },
    }, D.GENRE_LABEL[g] ?? g)));

  const body = h('div.stack--lg', { class: 'stack' });
  if (state.genre === null) {
    body.appendChild(spotlight(D.DISCOVER.spotlight));
    D.DISCOVER.rows.forEach((r, i) => body.appendChild(tileRow(String(i + 2).padStart(2, '0'), r.title, r.items)));
  } else {
    body.appendChild(genreStage(state.genre));
    D.genreRows(state.genre).forEach((r, i) => body.appendChild(tileRow(String(i + 2).padStart(2, '0'), r.title, r.items)));
  }

  return h('div.screen.stack', {},
    h('div', {}, h('h1.ptitle', {}, 'Signal'), h('p.psub', {}, 'Was auf Sendung ist, was ankündigt wurde, was du noch nicht hast.')),
    chips, body);
}

function spotlight(m) {
  const art = h('div', { style: { position: 'relative', minHeight: '210px', border: 'var(--bw) solid var(--sig-500)' } });
  if (m.banner) art.appendChild(h('img', { src: m.banner, alt: '', loading: 'lazy', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', opacity: '.42' } }));
  art.appendChild(h('div', { style: { position: 'absolute', inset: '0', background: 'linear-gradient(90deg, var(--bg) 12%, rgba(10,11,12,.35))' } }));
  art.appendChild(h('div', {
    style: { position: 'relative', display: 'grid', gridTemplateColumns: '112px 1fr', gap: '16px', padding: '16px', alignItems: 'end' },
  },
    cover(m),
    h('div', { style: { minWidth: 0 } },
      tally('sig', 'Im Scheinwerfer'),
      h('h3', { class: 'slot__t', style: { fontSize: 'clamp(21px,4.4vw,32px)', marginTop: '6px' } }, m.title),
      h('div.slot__code', {}, [D.FORMAT_LABEL[m.format], D.seasonTag(m)?.toUpperCase(), m.score ? `${m.score} %` : null, m.studio].filter(Boolean).join('  ·  ')),
      h('div.acts', { style: { marginTop: '12px' } },
        key('Aufnehmen', { variant: 'sig', ico: 'plus', sm: true, onClick: () => openAdd(m) }),
        key('Details', { sm: true, ico: 'arrowRight', onClick: () => { const e = D.entryForMedia(m.id); if (e) { state.detailId = e.rootId; state.detailSeason = null; } go('detail'); } })))));
  return art;
}

function genreStage(g) {
  const box = h('div', { style: { position: 'relative', overflow: 'hidden', border: 'var(--bw) solid var(--grid-2)', padding: '16px', background: 'var(--panel)' } });
  if (!reducedMotion()) {
    const layer = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
    for (let i = 0; i < 18; i++) {
      layer.appendChild(h('span', {
        style: {
          position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          width: '3px', height: '3px', background: 'var(--sig-500)',
          opacity: String(0.15 + Math.random() * 0.4),
          animation: `drift ${7 + Math.random() * 8}s linear ${(-Math.random() * 10).toFixed(1)}s infinite`,
        },
      }));
    }
    box.appendChild(layer);
  }
  box.appendChild(h('div', { style: { position: 'relative' } },
    tally('sig', 'Kanal'),
    h('h2.ptitle', { style: { fontSize: 'clamp(26px,7vw,44px)' } }, D.GENRE_LABEL[g] ?? g),
    h('p.psub', {}, `${D.LIBRARY.filter((e) => e.genres.includes(g)).length} davon liegen schon im Archiv.`)));
  return box;
}

function tileRow(i, title, items) {
  if (!items?.length) return document.createTextNode('');
  return h('section', {}, sec(i, title, { count: items.length }),
    h('div.row-scroll.no-bar', {}, ...items.map((m) => discoverTile(m))));
}

function discoverTile(m) {
  const inLib = D.entryForMedia(m.id);
  const box = h('div.tile', {});
  const cv = cover(m);
  if (inLib) {
    cv.appendChild(h('span.arch__punch', { style: { borderColor: 'var(--sig-500)', color: 'var(--sig-300)' } }, icon('check', { size: 13 })));
  }
  box.append(
    h('a', { href: '#/detail', onclick: () => { if (inLib) { state.detailId = inLib.rootId; state.detailSeason = null; } } }, cv),
    h('span.tile__t', {}, m.title),
    h('span.tile__m', {}, [D.FORMAT_LABEL[m.format], D.seasonTag(m)?.toUpperCase()].filter(Boolean).join(' · ')),
    h('div', { style: { marginTop: '8px' } },
      inLib
        ? key('Im Bestand', { sm: true, ico: 'check', disabled: true })
        : key('Aufnehmen', { sm: true, variant: 'sig', ico: 'plus', onClick: () => openAdd(m) })));
  return box;
}

/* =============================================================== Detail ==== */

function screenDetail() {
  const entry = D.BY_ID[state.detailId] ?? D.DETAIL_ENTRY;
  const seasons = entry.seasons;
  const labels = D.timelineLabels(seasons);
  const facts = D.franchiseFacts(seasons);
  const shownIdx = state.detailSeason ?? entry.seasonIndex;
  const shown = seasons[shownIdx] ?? seasons[0];
  const cur = D.currentSeason(entry);
  const total = cur?.episodes ?? 0;

  /* Zeitstrahl der Staffeln — Klick zeigt die Angaben DIESER Staffel. */
  const tl = h('div.tl', { role: 'tablist', 'aria-label': 'Staffeln' });
  seasons.forEach((s, i) => {
    const done = i < entry.seasonIndex;
    tl.appendChild(h('button.tl__i' + (i === shownIdx ? '.is-on' : '') + (done ? '.is-done' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(i === shownIdx),
      onclick: () => { state.detailSeason = i; refresh(); },
    },
      h('div.fx', { style: { justifyContent: 'space-between' } },
        h('span.tl__k', {}, labels[i]),
        D.isReleased(s) ? (done ? icon('check', { size: 13 }) : null) : icon('clock', { size: 13 })),
      h('div', { style: { margin: '8px 0' } }, cover(s)),
      h('div.tl__t', {}, s.title),
      h('div.tl__m', {}, [s.episodes ? `${s.episodes} F` : null, D.seasonTag(s)].filter(Boolean).join(' · '))));
  });

  /* Stepper */
  const valEl = h('span.step__v.mono', {}, h('span', {}, String(entry.progress)), h('small', {}, `/${total || '?'}`));
  const setVal = (n) => {
    entry.progress = clamp(n, 0, total || 999);
    valEl.firstChild.textContent = String(entry.progress);
    valEl.classList.remove('tick'); void valEl.offsetWidth; valEl.classList.add('tick');
  };
  const stepper = h('div.step', {},
    h('button.step__b', { type: 'button', 'aria-label': 'Eine Folge zurück', onclick: () => setVal(entry.progress - 1) }, icon('minus', { size: 17 })),
    valEl,
    h('button.step__b', { type: 'button', 'aria-label': 'Eine Folge weiter', onclick: () => setVal(entry.progress + 1) }, icon('plus', { size: 17 })));

  const st = statusOf(entry);

  return h('div.screen', {},
    h('div.hero', {},
      D.entryBanner(entry) ? h('div.hero__bg', {}, h('img', { src: D.entryBanner(entry), alt: '' })) : null,
      h('div.hero__in', {},
        cover(cur),
        h('div', { style: { minWidth: 0 } },
          tally(st === 'watching' ? 'live' : st === 'nextup' ? 'cue' : st === 'continuation' ? 'hold' : 'sig', CHAN[st]),
          h('h1.hero__t', { style: { marginTop: '8px' } }, D.entryTitle(entry)),
          h('div.slot__code', { style: { marginTop: '8px' } },
            [cur?.studio, D.seasonTag(cur)?.toUpperCase(), cur?.episodes ? `${cur.episodes} FOLGEN` : null, cur?.score ? `${cur.score} %` : null].filter(Boolean).join('  ·  '))))),

    h('div.stack--lg', { class: 'stack', style: { paddingTop: '20px' } },
      h('div.acts', {},
        key('Weiter senden', { variant: 'sig', ico: 'play', filled: true, onClick: () => { D.setStatus(entry.rootId, 'watching'); toast('Läuft'); refresh(); } }),
        key('Kanal wechseln', { ico: 'tape', onClick: () => openStatus(entry) }),
        kbtn('trash', 'Entfernen', { onClick: () => openRemove(entry) })),

      h('section', {},
        sec('01', 'Fortschritt'),
        h('div', { style: { border: 'var(--bw) solid var(--grid-2)', padding: '14px', background: 'var(--panel)' } },
          h('div.fx.fw', { style: { gap: '16px' } },
            stepper,
            h('div', {},
              h('div.mono.sm.mut', {}, `STAFFEL ${D.seasonNo(entry)} VON ${seasons.length}`),
              h('div.mono', { style: { fontSize: '15px', marginTop: '3px' } },
                `${D.watchedEpisodes(entry)} FOLGEN · ${Math.round(D.watchedEpisodes(entry) * D.meanDuration(entry) / 60)} STD`))))),

      h('section', {},
        sec('02', 'Zeitstrahl', { count: seasons.length }),
        tl,
        /* Staffel-Angaben + Franchise-Angaben NEBENEINANDER — genau das,
           was der Hinzufügen-Flow der echten App zeigt. */
        h('div', { style: { display: 'grid', gap: '12px', gridTemplateColumns: '1fr', marginTop: '12px' }, class: 'two' },
          seasonFacts(shown, labels[shownIdx]),
          franchiseFactsBox(facts))),

      h('section', {},
        sec('03', 'Inhalt'),
        h('p.dim', { style: { fontSize: '14px', lineHeight: '1.6' } }, shown?.synopsis || 'Keine Beschreibung hinterlegt.')),

      tileRow('04', 'Empfehlungen', D.DETAIL_EXTRAS.recommendations)));
}

function seasonFacts(s, label) {
  if (!s) return document.createTextNode('');
  return h('div', {},
    h('div.mono.sm', { style: { color: 'var(--sig-300)', letterSpacing: '.1em', marginBottom: '7px', textTransform: 'uppercase' } },
      `Diese ${label ?? 'Staffel'}`),
    h('div.facts', {},
      fact('Titel', s.title),
      fact('Format', D.FORMAT_LABEL[s.format] ?? '—'),
      fact('Folgen', s.episodes ? String(s.episodes) : 'offen'),
      fact('Laufzeit', s.duration ? `${s.duration} Min` : '—'),
      fact('Start', D.releaseLabel(s) ?? '—'),
      fact('Studio', s.studio ?? '—'),
      fact('Wertung', s.score ? `${s.score} %` : '—'),
      fact('Status', D.isReleased(s) ? (s.airStatus === 'RELEASING' ? 'läuft' : 'abgeschlossen') : 'noch nicht erschienen')));
}

function franchiseFactsBox(f) {
  return h('div', {},
    h('div.mono.sm', { style: { color: 'var(--ink-3)', letterSpacing: '.1em', marginBottom: '7px', textTransform: 'uppercase' } },
      'Ganzes Franchise'),
    h('div.facts', {},
      fact('Teile', `${f.parts} (${f.released} erschienen, ${f.upcoming} offen)`),
      fact('Folgen gesamt', String(f.episodes)),
      fact('Laufzeit gesamt', `${f.hours} Std`),
      fact('Zeitraum', f.span),
      fact('Ø Wertung', f.score ? `${f.score} %` : '—'),
      fact('Studios', f.studios.join(', ') || '—'),
      fact('Genres', f.genres.join(', ') || '—')));
}

function fact(k, v) { return h('div.fact', {}, h('b', {}, k), h('span', {}, v)); }

function openStatus(entry) {
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  scrim.appendChild(h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Kanal wechseln', style: { borderColor: 'var(--sig-500)' } },
    h('h3', {}, 'Kanal wechseln'),
    h('p', {}, D.entryTitle(entry)),
    h('div.stack--sm', { class: 'stack', style: { marginTop: '14px' } },
      ...D.STATUS_ORDER.map((s) => h('button.k' + (entry.status === s ? '.is-down' : ''), {
        type: 'button', style: { justifyContent: 'flex-start' },
        onclick: () => { D.setStatus(entry.rootId, s); scrim.remove(); toast(`Kanal: ${CHAN[s]}`); refresh(); },
      }, h('span', {}, CHAN[s])))),
    h('div.dialog__a', {}, key('Abbrechen', { onClick: () => scrim.remove() }))));
  document.body.appendChild(scrim);
  scrim.querySelector('button')?.focus();
}

function openRemove(entry) {
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  scrim.appendChild(h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Eintrag löschen' },
    h('h3', {}, 'Aus dem Bestand nehmen?'),
    h('p', {}, `„${D.entryTitle(entry)}" wird samt Fortschritt entfernt. Das lässt sich nicht rückgängig machen.`),
    h('div.dialog__a', {},
      key('Behalten', { onClick: () => scrim.remove() }),
      key('Löschen', { variant: 'live', ico: 'trash', onClick: () => { D.removeEntry(entry.rootId); scrim.remove(); toast('Entfernt'); go('bibliothek'); refresh(); } }))));
  document.body.appendChild(scrim);
  scrim.querySelector('button')?.focus();
}

/* ============================================================== Pegel ====== */

function screenStats() {
  const st = D.stats();
  const maxG = Math.max(...st.genres.map((g) => g.value), 1);
  const maxY = Math.max(...st.years.map((y) => y.value), 1);
  const totalStatus = st.perStatus.reduce((a, b) => a + b.count, 0) || 1;

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {}, h('h1.ptitle', {}, 'Pegel'), h('p.psub', {}, 'Was durch den Sender gelaufen ist.')),

    h('div.stats-grid', {},
      stat(num(st.episodes), 'Folgen'),
      stat(num(st.hours), 'Stunden'),
      stat(String(st.total), 'Produktionen'),
      stat(st.days >= 1 ? st.days.toFixed(1) : String(st.hours), st.days >= 1 ? 'Tage Sehzeit' : 'Stunden')),

    h('section', {},
      sec('01', 'Belegung der Kanäle'),
      h('div', { style: { border: 'var(--bw) solid var(--grid-2)', padding: '14px', background: 'var(--panel)' } },
        h('div', { style: { display: 'flex', height: '30px', border: '1px solid var(--grid-2)' } },
          ...st.perStatus.filter((r) => r.count).map((r) => h('div', {
            title: `${CHAN[r.status]}: ${r.count}`,
            style: {
              width: `${(r.count / totalStatus) * 100}%`,
              background: { watching: 'var(--live)', nextup: 'var(--cue)', planned: 'var(--panel-4)', continuation: 'var(--hold)', completed: 'var(--sig-500)' }[r.status],
            },
          }))),
        h('div.fx.fw', { style: { marginTop: '12px', gap: '14px' } },
          ...st.perStatus.filter((r) => r.count).map((r) => h('span.fx', { style: { gap: '7px' } },
            h('i', { style: { width: '9px', height: '9px', display: 'block', background: { watching: 'var(--live)', nextup: 'var(--cue)', planned: 'var(--panel-4)', continuation: 'var(--hold)', completed: 'var(--sig-500)' }[r.status] } }),
            h('span.mono.sm', {}, `${CHAN[r.status].toUpperCase()} ${String(r.count).padStart(2, '0')}`)))))),

    h('section', {},
      sec('02', 'Genres'),
      h('div.hbars', { style: { border: 'var(--bw) solid var(--grid-2)', padding: '14px', background: 'var(--panel)' } },
        ...st.genres.map((g) => h('div.hbar', {},
          h('span.mono.sm.mut', {}, g.label.toUpperCase()),
          h('span.hbar__t', {}, h('i.hbar__f', { style: { width: `${(g.value / maxG) * 100}%`, display: 'block' } })),
          h('span.hbar__n', {}, String(g.value).padStart(2, '0')))))),

    h('section', {},
      sec('03', 'Nach Jahr'),
      h('div', { style: { border: 'var(--bw) solid var(--grid-2)', padding: '14px', background: 'var(--panel)' } },
        h('div.cols', {}, ...st.years.map((y) => h('div.col', {},
          h('div.col__b', { style: { height: `${(y.value / maxY) * 100}%` }, title: `${y.value}` }),
          h('div.col__l', {}, String(y.year).slice(2))))))),

    h('section', {},
      sec('04', 'Längste Produktionen'),
      h('div.list', {}, ...st.longest.map((e, i) => h('a.row', {
        href: '#/detail', onclick: () => { state.detailId = e.rootId; state.detailSeason = null; },
      },
        h('span.mono.mut', { style: { width: '26px' } }, String(i + 1).padStart(2, '0')),
        h('span.row__c', {}, cover(D.currentSeason(e))),
        h('span.row__b', {}, h('span.row__t', {}, D.entryTitle(e)),
          h('span.row__s', {}, `${D.watchedEpisodes(e)} FOLGEN`)),
        h('span.row__n', {}, `${Math.round(D.watchedEpisodes(e) * D.meanDuration(e) / 60)} STD`))))));
}

function stat(v, l) { return h('div.stat', {}, h('div.stat__v', {}, v), h('div.stat__l', {}, l)); }

/* ============================================================== Regie ====== */

function screenSettings() {
  let lang = 'de';
  const langBox = h('div', {});
  const drawLang = () => clear(langBox).appendChild(channels(
    [{ key: 'de', label: 'Deutsch' }, { key: 'en', label: 'English' }], lang,
    (k) => { lang = k; drawLang(); toast(k === 'de' ? 'Sprache: Deutsch' : 'Language: English'); }));
  drawLang();

  const sw = h('button.sw.is-on', { type: 'button', role: 'switch', 'aria-checked': 'true', 'aria-label': 'Originaltitel bevorzugen' });
  sw.addEventListener('click', () => { const on = sw.classList.toggle('is-on'); sw.setAttribute('aria-checked', String(on)); });

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {}, h('h1.ptitle', {}, 'Regie'), h('p.psub', {}, 'Konto, Sprache, Sicherung.')),

    h('section', {}, sec('01', 'Sendekennung'),
      h('div', { style: { border: 'var(--bw) solid var(--grid-2)', padding: '14px', background: 'var(--panel)' } },
        h('div.fx', {},
          h('span', { style: { width: '46px', height: '46px', display: 'grid', placeItems: 'center', border: 'var(--bw) solid var(--sig-500)', color: 'var(--sig-300)' } }, icon('user', { size: 24, filled: true })),
          h('div', {},
            h('div.row__t', {}, D.PROFILE.name),
            h('div.row__s', {}, D.PROFILE.email),
            h('div.row__s', {}, `${D.PROFILE.devices} GERÄTE · SYNC ${D.PROFILE.lastSync.toUpperCase()}`))))),

    h('section', {}, sec('02', 'Sprache'), langBox),

    h('section', {}, sec('03', 'Anzeige'),
      h('div.list', {},
        h('div.row', {}, icon('strip', { size: 19, filled: true }),
          h('span.row__b', {}, h('span.row__t', {}, 'Originaltitel bevorzugen'),
            h('span.row__s', {}, 'ROMAJI STATT INTERNATIONALEM TITEL')), sw))),

    h('section', {}, sec('04', 'Sicherung'),
      h('div.fx.fw', {},
        key('Exportieren', { ico: 'download', onClick: () => toast('Export erstellt (Entwurf)') }),
        key('Importieren', { ico: 'upload', onClick: () => toast('Import gestartet (Entwurf)') }),
        h('span.mono.sm.mut', {}, 'LETZTE SICHERUNG HEUTE 08:14'))),

    h('section', {}, sec('05', 'Sendeschluss'),
      h('div.danger', {},
        h('div.row__t', {}, 'Bestand löschen'),
        h('p.sm.mut', { style: { margin: '5px 0 12px' } }, 'Löscht alle Einträge auf allen Geräten. Es gibt keinen Papierkorb.'),
        h('div.fx.fw', {},
          key('Alles löschen', { variant: 'live', ico: 'trash', onClick: () => openRemove(D.LIBRARY[0]) }),
          key('Abmelden', { ico: 'logout', onClick: () => toast('Abgemeldet (Entwurf)') })))));
}

/* ====================================================== Suche + Aufnahme === */

let findOpen = false;

function openFind() {
  if (findOpen) return;
  findOpen = true;
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) close(); } });
  const close = () => { findOpen = false; scrim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  const results = h('div.panel__b');
  const input = h('input', { type: 'search', placeholder: 'Titel, Studio oder Genre …', 'aria-label': 'Suche', autocomplete: 'off', spellcheck: 'false' });

  const draw = (q) => {
    clear(results);
    const term = q.trim();
    const hits = term ? D.searchMedia(term) : D.SEARCH_RECENT;
    results.appendChild(h('div.mono.sm.mut', { style: { letterSpacing: '.12em', marginBottom: '10px' } },
      term ? `${hits.length} TREFFER` : 'ZULETZT GESUCHT'));
    if (!hits.length) { results.appendChild(empty('Kein Treffer', 'Anderer Begriff?')); return; }
    const grid = h('div.grid-big');
    for (const m of hits) {
      const inLib = D.entryForMedia(m.id);
      const box = h('div.tile', {});
      const cv = cover(m);
      if (inLib) cv.appendChild(h('span.arch__punch', { style: { borderColor: 'var(--sig-500)', color: 'var(--sig-300)' } }, icon('check', { size: 13 })));
      box.append(cv,
        h('span.tile__t', {}, m.title),
        h('span.tile__m', {}, [D.FORMAT_LABEL[m.format], D.seasonTag(m)?.toUpperCase()].filter(Boolean).join(' · ')),
        h('div', { style: { marginTop: '8px' } },
          inLib ? key('Im Bestand', { sm: true, ico: 'check', disabled: true })
            : key('Aufnehmen', { sm: true, variant: 'sig', ico: 'plus', onClick: () => { close(); openAdd(m); } })));
      grid.appendChild(box);
    }
    results.appendChild(grid);
  };
  input.addEventListener('input', () => draw(input.value));
  draw('');

  scrim.appendChild(h('div.panel', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Suche' },
    h('div.find__in', {}, icon('search', { size: 18, cls: 'mut' }), input,
      h('button.kbtn.kbtn--sm', { type: 'button', 'aria-label': 'Schließen', onclick: close }, icon('x', { size: 15 }))),
    results));
  document.body.appendChild(scrim);
  input.focus();
}

/**
 * Aufnahme-Flow — das Gegenstück zum `AddPanel` der echten App.
 * Beim Durchklicken durch den Zeitstrahl stehen links die Angaben DIESER
 * Staffel und rechts die Angaben des GANZEN Franchise.
 */
function openAdd(media) {
  const seasons = D.franchiseOf(media.id);
  const labels = D.timelineLabels(seasons);
  const facts = D.franchiseFacts(seasons);

  let mode = 'watching';           // watching | completed | planned
  let pick = seasons.findIndex((s) => D.isReleased(s));
  if (pick < 0) pick = 0;
  let episode = 1;
  let cutoff = null;               // ab hier gehört nichts mehr zum Eintrag

  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  const body = h('div.panel__b');
  const foot = h('div.panel__f');

  const render = () => {
    clear(body); clear(foot);

    body.appendChild(channels([
      { key: 'watching', label: 'Schaue ich' },
      { key: 'completed', label: 'Schon geschaut' },
      { key: 'planned', label: 'Nur vormerken' },
    ], mode, (k) => { mode = k; render(); }));

    body.appendChild(h('p.sm.dim', { style: { margin: '12px 0 10px' } }, {
      watching: 'Bei welcher Staffel bist du gerade — und bei welcher Folge?',
      completed: 'Bis wohin hast du geschaut? Mit der Schere schneidest du alles ab, was gar nicht zum Eintrag gehören soll.',
      planned: 'Der ganze Zeitstrahl landet auf der Warteliste.',
    }[mode]));

    if (mode === 'completed' && cutoff !== null) {
      body.appendChild(h('div.fx', { style: { marginBottom: '10px', color: 'var(--live)' } },
        icon('scissors', { size: 15 }),
        h('span.mono.sm', {}, `ABGESCHNITTEN AB ${labels[cutoff].toUpperCase()}`),
        h('button.k.k--sm.k--ghost', { type: 'button', onclick: () => { cutoff = null; render(); } }, h('span', {}, 'Zurücknehmen'))));
    }

    /* Zeitstrahl mit großen Covern */
    const strip = h('div.tl');
    seasons.forEach((s, i) => {
      const released = D.isReleased(s);
      const excluded = cutoff !== null && i > cutoff;
      const selected = mode === 'completed' ? i <= pick && !excluded : i === pick;
      const item = h('button.tl__i' + (selected ? '.is-on' : '') + (excluded ? '.is-done' : ''), {
        type: 'button',
        disabled: (!released && mode !== 'planned') || excluded || null,
        onclick: () => { pick = i; episode = 1; render(); },
        oncontextmenu: (ev) => { if (mode === 'completed') { ev.preventDefault(); cutoff = i; render(); } },
      },
        h('div.fx', { style: { justifyContent: 'space-between' } },
          h('span.tl__k', {}, labels[i]),
          released ? (selected ? icon('check', { size: 13 }) : null) : icon('clock', { size: 13 })),
        h('div', { style: { margin: '8px 0', filter: released ? 'none' : 'grayscale(.9)' } }, cover(s)),
        h('div.tl__t', {}, s.title),
        h('div.tl__m', {}, [s.episodes ? `${s.episodes} F` : 'offen', D.seasonTag(s)].filter(Boolean).join(' · ')));
      strip.appendChild(item);
    });
    body.appendChild(strip);

    if (mode === 'completed') {
      body.appendChild(h('div.fx.fw', { style: { marginTop: '10px', gap: '8px' } },
        h('span.mono.sm.mut', {}, 'ABSCHNEIDEN AB:'),
        ...seasons.map((s, i) => h('button.chip', {
          type: 'button', onclick: () => { cutoff = i; if (pick > i) pick = i; render(); },
        }, labels[i]))));
    }

    /* Angaben: diese Staffel | ganzes Franchise */
    body.appendChild(h('div', { class: 'two', style: { display: 'grid', gap: '12px', marginTop: '16px' } },
      seasonFacts(seasons[pick], labels[pick]),
      franchiseFactsBox(facts)));

    if (mode === 'watching') {
      const max = seasons[pick]?.episodes ?? null;
      const val = h('span.step__v.mono', {}, h('span', {}, String(episode)), h('small', {}, `/${max ?? '?'}`));
      body.appendChild(h('div', { style: { marginTop: '16px' } },
        h('div.mono.sm.mut', { style: { marginBottom: '7px', letterSpacing: '.1em' } }, 'BEI WELCHER FOLGE?'),
        h('div.step', {},
          h('button.step__b', { type: 'button', 'aria-label': 'Weniger', onclick: () => { episode = Math.max(1, episode - 1); val.firstChild.textContent = String(episode); } }, icon('minus', { size: 16 })),
          val,
          h('button.step__b', { type: 'button', 'aria-label': 'Mehr', onclick: () => { episode = max ? Math.min(max, episode + 1) : episode + 1; val.firstChild.textContent = String(episode); } }, icon('plus', { size: 16 })))));
    }

    foot.append(
      key('Aufnehmen', {
        variant: 'sig', ico: 'check',
        onClick: () => {
          const cut = cutoff !== null ? seasons.slice(0, cutoff + 1) : seasons;
          let entry;
          if (mode === 'planned') entry = D.addFranchise({ seasons: cut, status: 'planned' });
          else if (mode === 'completed') entry = D.addFranchise({ seasons: cut, status: 'watching', watchedThrough: pick + 1, currentEpisode: cut[Math.min(pick, cut.length - 1)]?.episodes ?? 0 });
          else entry = D.addFranchise({ seasons: cut, status: 'watching', watchedThrough: pick, currentEpisode: episode });
          scrim.remove();
          toast(`${seasons[0].title} → ${CHAN[entry.status]}`);
          refresh();
        },
      }),
      key('Abbrechen', { variant: 'ghost', onClick: () => scrim.remove() }),
      h('span.mono.sm.mut', { class: 'push hide-s' }, `${facts.parts} TEILE · ${facts.episodes} FOLGEN`));
  };

  const panel = h('div.panel', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Aufnehmen' },
    h('div.panel__h', {},
      icon('rec', { size: 13, filled: true, cls: 'mut' }),
      h('span', {}, 'In den Bestand aufnehmen'),
      h('button.kbtn.kbtn--sm.push', { type: 'button', 'aria-label': 'Schließen', onclick: () => scrim.remove() }, icon('x', { size: 15 }))),
    body, foot);
  render();
  scrim.appendChild(panel);
  document.body.appendChild(scrim);
  panel.querySelector('button')?.focus();
}

function screenSearch() {
  requestAnimationFrame(openFind);
  return screenHome();
}

/* =============================================================== Rahmen ==== */

function tabbar(active) {
  return h('nav.tabbar', { 'aria-label': 'Hauptnavigation' },
    ...NAV.map((n) => h('a.tabbar__i' + (n.key === active ? '.is-on' : ''), {
      href: `#/${n.key}`, 'aria-current': n.key === active ? 'page' : null,
    }, iconPair(n.ico, { size: 21, active: n.key === active }), h('span.tabbar__l', {}, n.label))));
}

function rail(active) {
  const now = new Date();
  return h('aside.rail', {},
    h('div.rail__brand', {},
      h('img', { src: '/assets/logo.png', alt: '', width: 28, height: 28 }),
      h('span.brand__w', {}, 'Tsugi'),
      /* つぎ genau EINMAL: als Sendekennung neben der Uhr. */
      h('span.kana', { class: 'push', title: 'つぎ — als Nächstes' }, 'つぎ')),
    h('div.clockline', { style: { marginBottom: '10px', display: 'block', textAlign: 'center' } },
      now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' · ON AIR'),
    h('button.findk', { type: 'button', onclick: openFind }, icon('search', { size: 17 }), h('span', {}, 'SUCHEN'), h('kbd', {}, 'STRG K')),
    h('div', { style: { height: '12px' } }),
    ...NAV.map((n) => h('a.rail__i' + (n.key === active ? '.is-on' : ''), {
      href: `#/${n.key}`, 'aria-current': n.key === active ? 'page' : null,
    }, iconPair(n.ico, { size: 19, active: n.key === active }), h('span', {}, n.label))),
    h('div.rail__foot', {},
      h('a.mono.sm.mut', { href: '/index.html' }, '← SHOWROOM'),
      h('p.mono.sm.mut', { style: { marginTop: '6px' } }, 'V2 SENDEPLAN — ENTWURF')));
}

function head(active) {
  const t = NAV.find((n) => n.key === active)?.label ?? 'Tsugi';
  return h('header.topbar', {},
    active === 'home'
      ? h('span.brand', {}, h('img', { src: '/assets/logo.png', alt: 'Tsugi' }), h('span.brand__w', {}, 'Tsugi'))
      : h('a.kbtn.kbtn--sm', { href: '#/home', 'aria-label': 'Zurück' }, icon('chevronLeft', { size: 16 })),
    h('span.topbar__title', {}, active === 'home' ? '' : t),
    h('button.kbtn.kbtn--sm', { type: 'button', 'aria-label': 'Suchen', onclick: openFind }, icon('search', { size: 16 })));
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
});

const root = document.getElementById('root');
const shell = h('div.app', {});
const headSlot = h('div', {});
const wrap = h('div.wrap', {});
const mount = h('main.main', { id: 'inhalt' }, headSlot, wrap);
shell.append(h('div', {}), mount);
root.append(h('a.skip.k.k--sig', { href: '#inhalt' }, 'Zum Inhalt springen'), shell);

startRouter({
  mount: wrap,
  fallback: 'home',
  onChange: (kkey) => {
    clear(headSlot).appendChild(head(kkey));
    shell.firstChild.replaceWith(rail(kkey));
    document.querySelector('.tabbar')?.remove();
    document.body.appendChild(tabbar(kkey));
    document.title = `Tsugi V2 „Sendeplan" — ${NAV.find((n) => n.key === kkey)?.label ?? kkey}`;
  },
});

window.addEventListener('scroll', () => {
  document.querySelector('.topbar')?.classList.toggle('is-stuck', window.scrollY > 6);
}, { passive: true });

setInterval(() => {
  for (const el of document.querySelectorAll('[data-airing]')) {
    el.textContent = D.countdownShort(Number(el.dataset.airing));
  }
}, 30000);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openFind(); }
});
