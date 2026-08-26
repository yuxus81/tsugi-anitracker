/**
 * V4 „DECK" — sieben Bildschirme.
 *
 * Leitgedanke: つぎ = als Nächstes. Die App ist ein Stapel, den man
 * durchblättert. Auf dem Startbildschirm steht EINE Karte im Fokus, die
 * anderen liegen sichtbar dahinter. Licht liegt auf Kanten, nie auf Flächen —
 * das ist der Unterschied zwischen echtem Licht und einem CSS-Verlauf.
 */

import { h, clear, num, clamp, reducedMotion, finePointer } from '../shared/dom.js';
import { defineScreens, startRouter, go, refresh } from '../shared/router.js';
import * as D from '../shared/mock.js';
import { icon, iconPair } from './icons.js';

/* ============================================================== Zustand ==== */

const state = {
  deckIdx: 0,
  libTab: 'watching',
  genre: null,
  detailId: D.DETAIL_ENTRY.rootId,
  detailSeason: null,
};

const NAV = [
  { key: 'home', label: 'Deck', ico: 'deck' },
  { key: 'bibliothek', label: 'Stapel', ico: 'fan' },
  { key: 'entdecken', label: 'Signal', ico: 'pulse' },
  { key: 'statistik', label: 'Werte', ico: 'bars' },
  { key: 'einstellungen', label: 'Setup', ico: 'dial' },
];

/** Wie die Status hier heißen — jede Karte liegt anders im Stapel. */
const PILE = {
  watching: 'Vorn im Deck',
  nextup: 'Geladen',
  planned: 'Aufgefächert',
  continuation: 'Verdeckt',
  completed: 'Gesiegelt',
};
const TONE = { watching: 'cy', nextup: 'pu', planned: 'pk', continuation: 'off', completed: 'cy' };

/* =============================================================== Helfer ==== */

function toast(text) {
  document.querySelector('.toast')?.remove();
  const t = h('div.toast', { role: 'status' }, icon('check', { size: 18, filled: true }), h('span', {}, text));
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/** Licht folgt dem Zeiger — nur mit echter Maus, sonst reine Rechenlast. */
function lightTrack(el) {
  if (!finePointer() || reducedMotion()) return el;
  let raf = 0;
  el.addEventListener('pointermove', (ev) => {
    const r = el.getBoundingClientRect();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.setProperty('--mx', `${((ev.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((ev.clientY - r.top) / r.height) * 100}%`);
    });
  });
  return el;
}

function art(media, { wide = false } = {}) {
  const box = h('span.art' + (wide ? '.art--wide' : ''), {});
  const src = wide ? (media?.banner ?? media?.cover) : media?.cover;
  if (src) box.appendChild(h('img', { src, alt: '', loading: 'lazy', decoding: 'async' }));
  return box;
}

function btn(label, opts = {}) {
  const { variant = '', ico = null, onClick = null, sm = false, disabled = false, wide = false, filled = false } = opts;
  const b = h('button.btn' + (variant ? `.btn--${variant}` : '') + (sm ? '.btn--sm' : '') + (wide ? '.btn--wide' : ''),
    { type: 'button', disabled: disabled || null, onclick: onClick || undefined });
  if (ico) b.appendChild(icon(ico, { size: sm ? 16 : 18, filled }));
  if (label) b.appendChild(h('span', {}, label));
  return lightTrack(b);
}

function iconBtn(name, label, opts = {}) {
  const { onClick = null, sm = false, filled = false } = opts;
  return h('button.iconbtn' + (sm ? '.iconbtn--sm' : ''),
    { type: 'button', 'aria-label': label, title: label, onclick: onClick || undefined },
    icon(name, { size: sm ? 17 : 20, filled }));
}

function dot(tone, text) { return h(`span.dot.dot--${tone}`, {}, h('i'), text); }

function sec(title, { count = null, action = null } = {}) {
  return h('div.sec', {},
    h('h2.sec__t', {}, title),
    count !== null ? h('span.sec__n', {}, String(count)) : null,
    action ? h('span.sec__more', {}, action) : null);
}

function segmented(items, active, onPick) {
  const box = h('div.seg', { role: 'tablist' });
  for (const it of items) {
    box.appendChild(h('button.seg__b' + (it.key === active ? '.is-on' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(it.key === active),
      onclick: () => onPick(it.key),
    }, h('span', {}, it.label), it.count != null ? h('span.n', {}, String(it.count)) : null));
  }
  return box;
}

const openDetail = (entry) => () => { state.detailId = entry.rootId; state.detailSeason = null; };

/* ================================================================ Deck ===== */

/**
 * Der Startbildschirm IST der Stapel: die vorderste Karte groß, dahinter
 * zwei angedeutete, darunter die Blätter-Bedienung. Was hier liegt, ist
 * das, was als Nächstes dran ist — laufend zuerst, dann bereit.
 */
function screenHome() {
  const deck = [...D.byStatus('watching'), ...D.byStatus('nextup')];
  if (!deck.length) {
    return h('div.screen.stack--lg', { class: 'stack' },
      h('h1.ptitle', {}, 'Dein Deck'),
      empty('Der Stapel ist leer', 'Nimm etwas auf — dann liegt es hier vorn.'));
  }
  state.deckIdx = clamp(state.deckIdx, 0, deck.length - 1);
  const entry = deck[state.deckIdx];

  const holder = h('div.deck', {},
    h('div.deck__behind'), h('div.deck__behind'), h('div.deck__behind'),
    entry.status === 'watching' ? frontCard(entry) : loadedCardBig(entry));

  const pips = h('div.deck__pips', { 'aria-hidden': 'true' },
    ...deck.slice(0, 12).map((_, i) => h('span.deck__pip' + (i === state.deckIdx ? '.is-on' : ''))));

  const flip = (dir) => {
    state.deckIdx = (state.deckIdx + dir + deck.length) % deck.length;
    refresh();
  };

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {},
      h('div.fx', {},
        /* つぎ genau EINMAL — dort, wo das Wort wörtlich hingehört. */
        h('span.kana', { title: 'つぎ — als Nächstes' }, 'つぎ'),
        h('span.dot.dot--off', {}, h('i'), `${deck.length} Karten im Deck`)),
      h('h1.ptitle', {}, 'Als Nächstes'),
      h('p.psub', {}, `${D.LIBRARY.length} Titel · ${num(D.stats().episodes)} Folgen gesehen`)),

    holder,

    h('div.deck__nav', {},
      iconBtn('left', 'Eine Karte zurück', { onClick: () => flip(-1) }),
      iconBtn('right', 'Nächste Karte', { onClick: () => flip(+1) }),
      h('span.deck__count.mono', {}, `${String(state.deckIdx + 1).padStart(2, '0')} / ${String(deck.length).padStart(2, '0')}`),
      pips),

    rollerCard(),

    D.byStatus('planned').length
      ? h('section', {},
        sec('Aufgefächert', { count: D.byStatus('planned').length, action: h('a.sm.mut', { href: '#/bibliothek' }, 'Alle') }),
        h('div.row-scroll.no-bar.row-cards', {}, ...D.byStatus('planned').map(fannedCard)))
      : null,

    upcoming());
}

/* ============================ KARTE 1: vorn und beleuchtet (watching) ====== */

function frontCard(entry) {
  const s = D.currentSeason(entry);
  const total = s?.episodes ?? 0;
  const fill = h('i', { style: { width: `${D.seasonPct(entry) * 100}%` } });
  const meta = h('div.front__m', {}, metaText(entry));

  const card = lightTrack(h('article.card.card--cy.lit.front', {}));
  card.append(
    h('a', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block' } }, art(s)),
    h('div', { style: { minWidth: 0, display: 'flex', flexDirection: 'column' } },
      h('div.fx', {}, dot('cy', 'läuft'),
        h('span.push.mono.sm.mut', {}, `${String(entry.progress).padStart(2, '0')}/${total ? String(total).padStart(2, '0') : '--'}`)),
      h('a.front__t', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block', marginTop: '4px' } }, D.entryTitle(entry)),
      meta,
      h('div.front__acts', {},
        btn('Folge +1', {
          variant: 'solid', ico: 'plus',
          onClick: () => {
            if (total && entry.progress >= total) { toast('Karte ist durch — siegeln?'); return; }
            D.bumpProgress(entry.rootId, +1);
            fill.style.width = `${D.seasonPct(entry) * 100}%`;
            meta.textContent = metaText(entry);
            card.querySelector('.mono').textContent = `${String(entry.progress).padStart(2, '0')}/${total ? String(total).padStart(2, '0') : '--'}`;
          },
        }),
        btn('Siegeln', { variant: 'cy', ico: 'seal', sm: true, onClick: () => { D.setStatus(entry.rootId, 'completed'); toast(`${D.entryTitle(entry)} gesiegelt`); refresh(); } }),
        iconBtn('dots', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) }))),
    h('div.front__bar', {}, fill));
  return card;
}

function metaText(entry) {
  const s = D.currentSeason(entry);
  const bits = [];
  if (entry.seasons.length > 1) bits.push(`Staffel ${D.seasonNo(entry)} von ${entry.seasons.length}`);
  if (s?.studio) bits.push(s.studio);
  if (s?.nextAiring) bits.push(`nächste Folge ${D.weekdayTime(s.nextAiring.airingAt)}`);
  else if (D.seasonTag(s)) bits.push(D.seasonTag(s));
  return bits.join(' · ');
}

/* =================================== KARTE 2: geladen (nextup) ============= */

function loadedCardBig(entry) {
  const s = D.currentSeason(entry);
  const card = lightTrack(h('article.card.card--pu.lit.front', {}));
  card.append(
    h('a', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block' } }, art(s)),
    h('div', { style: { minWidth: 0 } },
      dot('pu', 'geladen — noch nicht an'),
      h('a.front__t', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block', marginTop: '4px' } }, D.entryTitle(entry)),
      h('div.front__m', {}, [entry.seasons.length > 1 ? `Staffel ${D.seasonNo(entry)}` : null, s?.episodes ? `${s.episodes} Folgen` : null, D.seasonTag(s)].filter(Boolean).join(' · ')),
      h('div.front__acts', {},
        h('button.power', {
          type: 'button',
          onclick: () => { D.setStatus(entry.rootId, 'watching'); toast(`${D.entryTitle(entry)} ist an`); refresh(); },
        }, h('span', {}, 'Einschalten'), h('i', {}, icon('play', { size: 14, filled: true }))),
        iconBtn('dots', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) }))));
  return card;
}

function loadedCard(entry) {
  const s = D.currentSeason(entry);
  return h('article.loaded', {},
    h('a', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block' } }, art(s)),
    h('div', { style: { minWidth: 0 } },
      dot('pu', 'geladen'),
      h('a.loaded__t', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block', marginTop: '7px' } }, D.entryTitle(entry)),
      h('div.sm.mut', { style: { marginTop: '5px' } },
        [entry.seasons.length > 1 ? `Staffel ${D.seasonNo(entry)}` : null, s?.episodes ? `${s.episodes} Folgen` : null].filter(Boolean).join(' · ')),
      h('div.fx.fw', { style: { marginTop: '12px', gap: '9px' } },
        h('button.power', {
          type: 'button',
          onclick: () => { D.setStatus(entry.rootId, 'watching'); toast(`${D.entryTitle(entry)} ist an`); refresh(); },
        }, h('span', {}, 'Einschalten'), h('i', {}, icon('play', { size: 14, filled: true }))),
        iconBtn('dots', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) }))));
}

/* ============================ KARTE 3: verdeckt (continuation) ============= */

function coveredCard(entry) {
  const s = D.currentSeason(entry);
  const air = s?.nextAiring;
  /* EIN Anker um Cover, Titel und Zeile: das Cover IST der Eintrag, und
     ein 18-px-Titellink daneben wäre auf dem Handy nicht zu treffen. */
  const shot = h('span', { style: { display: 'block', position: 'relative' } }, art(s));
  shot.appendChild(h('span.covered__plate', {},
    icon('clock', { size: 13 }),
    h('span', {}, (entry.releaseNote ?? D.releaseLabel(s) ?? 'offen')),
    air ? h('b', { dataset: { airing: String(air.airingAt) } }, D.countdownShort(air.airingAt)) : null));
  return h('a.fanned.covered', { href: '#/detail', onclick: openDetail(entry) },
    shot,
    h('span.fanned__t', {}, D.entryTitle(entry)),
    h('span.fanned__m', {}, 'ANGEKÜNDIGT · NOCH VERDECKT'));
}

/* ============================= KARTE 4: gesiegelt (completed) ============== */

function sealedCard(entry) {
  const s = D.currentSeason(entry) ?? entry.seasons[0];
  const shot = h('span', { style: { display: 'block', position: 'relative' } }, art(s));
  shot.appendChild(h('span.sealed__seal', {}, icon('seal', { size: 17, filled: true })));
  shot.appendChild(h('span.sealed__sum', {},
    h('span', {}, `${entry.seasons.length} ${entry.seasons.length === 1 ? 'TEIL' : 'TEILE'}`),
    h('b', {}, `${D.watchedEpisodes(entry)} F`)));
  return h('a.fanned.sealed', { href: '#/detail', onclick: openDetail(entry) },
    shot,
    h('span.fanned__t', {}, D.entryTitle(entry)),
    h('span.fanned__m', {}, `${Math.round(D.watchedEpisodes(entry) * D.meanDuration(entry) / 60)} STUNDEN`));
}

/* =========================== KARTE 5: aufgefächert (planned/discover) ====== */

function fannedCard(mediaOrEntry, i = 0) {
  const entry = mediaOrEntry.seasons ? mediaOrEntry : null;
  const m = entry ? D.currentSeason(entry) : mediaOrEntry;
  const deg = ((i % 5) - 2) * 1.1;   // der Fächer: leichte, wechselnde Neigung
  const box = h('div', { style: { '--tiltdeg': `${deg}deg`, minWidth: 0 } });
  box.append(h('a.fanned', { href: '#/detail', onclick: entry ? openDetail(entry) : undefined },
    art(m),
    h('span.fanned__t', {}, m?.title ?? '—'),
    h('span.fanned__m', {}, [D.FORMAT_LABEL[m?.format], D.seasonTag(m), m?.episodes ? `${m.episodes} F` : null].filter(Boolean).join(' · '))));
  if (!entry) {
    const inLib = D.entryForMedia(m.id);
    box.appendChild(h('div', { style: { marginTop: '9px' } },
      inLib ? btn('Im Deck', { sm: true, ico: 'check', disabled: true })
        : btn('Aufnehmen', { variant: 'pk', ico: 'plus', sm: true, onClick: () => openAdd(m) })));
  }
  return box;
}

function rollerCard() {
  const pool = D.ROLL_POOL.length ? D.ROLL_POOL : D.LIBRARY;
  const face = h('span.row__c', {}, art(D.currentSeason(pool[0])));
  const name = h('span.row__b', {},
    h('span.row__t', {}, 'Karte ziehen'),
    h('span.row__s', {}, 'EIN ZUFALLSTITEL AUS DEM FÄCHER'));
  return h('div.row', {}, face, name,
    btn('Ziehen', {
      variant: 'pk', ico: 'dice', sm: true,
      onClick: (ev) => {
        const b = ev.currentTarget;
        if (b.dataset.busy) return;
        b.dataset.busy = '1';
        const steps = reducedMotion() ? 1 : 13;
        let i = 0;
        const tick = () => {
          const p = pool[Math.floor(Math.random() * pool.length)];
          face.replaceChildren(art(D.currentSeason(p)));
          name.replaceChildren(h('span.row__t', {}, D.entryTitle(p)), h('span.row__s', {}, PILE[p.status].toUpperCase()));
          if (++i < steps) setTimeout(tick, 56 + i * 13);
          else { delete b.dataset.busy; toast(`Gezogen: ${D.entryTitle(p)}`); }
        };
        tick();
      },
    }));
}

function upcoming() {
  if (!D.SIMULCAST.length) return null;
  const list = h('div.list');
  for (const { entry, season } of D.SIMULCAST.slice(0, 7)) {
    list.appendChild(h('a.row', { href: '#/detail', onclick: openDetail(entry) },
      h('span.row__c', {}, art(season)),
      h('span.row__b', {},
        h('span.row__t', {}, D.entryTitle(entry)),
        h('span.row__s', {}, `E${String(season.nextAiring.episode).padStart(2, '0')} · ${D.weekdayTime(season.nextAiring.airingAt).toUpperCase()}`)),
      h('span.row__n', { dataset: { airing: String(season.nextAiring.airingAt) } }, D.countdownShort(season.nextAiring.airingAt))));
  }
  return h('section', {}, sec('Kommt rein', { count: D.SIMULCAST.length }), list);
}

function empty(t, s) {
  return h('div.empty', {}, icon('facedown', { size: 28 }), h('div.empty__t', {}, t), h('div.empty__s', {}, s));
}

/* ============================================================== Stapel ===== */

function screenLibrary() {
  const tabs = D.STATUS_ORDER.map((s) => ({ key: s, label: PILE[s], count: D.byStatus(s).length }));
  const l = D.byStatus(state.libTab);
  const body = h('div.stack');

  if (!l.length) body.appendChild(empty('Keine Karte hier', 'Dieser Teil des Stapels ist leer.'));
  else if (state.libTab === 'watching') body.appendChild(h('div.stack', {}, ...l.map(frontCard)));
  else if (state.libTab === 'nextup') body.appendChild(h('div.stack', {}, ...l.map(loadedCard)));
  else if (state.libTab === 'continuation') body.appendChild(h('div.grid-cards', {}, ...l.map(coveredCard)));
  else if (state.libTab === 'completed') body.appendChild(h('div.grid-cards', {}, ...l.map(sealedCard)));
  else body.appendChild(h('div.grid-cards', {}, ...l.map(fannedCard)));

  const note = {
    watching: 'Diese Karten sind an — sie liegen vorn.',
    nextup: 'Eingelegt, aber noch nicht eingeschaltet.',
    planned: 'Der Fächer: alles, was du noch sehen willst.',
    continuation: 'Verdeckt — angekündigt, aber noch nicht aufgedeckt.',
    completed: 'Gesiegelt und abgelegt.',
  }[state.libTab];

  return h('div.screen.stack', {},
    h('div', {}, h('h1.ptitle', {}, 'Stapel'), h('p.psub', {}, note)),
    segmented(tabs, state.libTab, (k) => { state.libTab = k; refresh(); }),
    body);
}

/* ============================================================== Signal ===== */

function screenDiscover() {
  const chips = h('div.seg', {},
    h('button.seg__b' + (state.genre === null ? '.is-on' : ''), { type: 'button', onclick: () => { state.genre = null; refresh(); } }, h('span', {}, 'Alle')),
    ...D.GENRES.map((g) => h('button.seg__b' + (state.genre === g ? '.is-on' : ''), {
      type: 'button', onclick: () => { state.genre = g; refresh(); },
    }, h('span', {}, D.GENRE_LABEL[g] ?? g))));

  const body = h('div.stack--lg', { class: 'stack' });
  if (state.genre === null) {
    body.appendChild(spotlight(D.DISCOVER.spotlight));
    for (const r of D.DISCOVER.rows) body.appendChild(cardRow(r.title, r.items));
  } else {
    body.appendChild(genreStage(state.genre));
    for (const r of D.genreRows(state.genre)) body.appendChild(cardRow(r.title, r.items));
  }

  return h('div.screen.stack', {},
    h('div', {}, h('h1.ptitle', {}, 'Signal'), h('p.psub', {}, 'Was läuft, was kommt, was noch fehlt.')),
    chips, body);
}

function spotlight(m) {
  const card = lightTrack(h('section.card.card--pu.lit', { style: { position: 'relative', overflow: 'hidden' } }));
  const bg = h('div', { style: { position: 'absolute', inset: '0' } });
  if (m.banner) bg.appendChild(h('img', { src: m.banner, alt: '', loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'cover', opacity: '.34' } }));
  bg.appendChild(h('div', { style: { position: 'absolute', inset: '0', background: 'linear-gradient(96deg, var(--bg) 14%, rgba(13,15,24,.5))' } }));
  card.append(bg, h('div', {
    style: { position: 'relative', display: 'grid', gridTemplateColumns: '116px 1fr', gap: '16px', padding: '16px', alignItems: 'end' },
  },
    art(m),
    h('div', { style: { minWidth: 0 } },
      dot('pu', 'im Scheinwerfer'),
      h('h3.front__t', { style: { marginTop: '7px' } }, m.title),
      h('div.front__m', {}, [D.FORMAT_LABEL[m.format], D.seasonTag(m), m.studio, m.score ? `${m.score} %` : null].filter(Boolean).join(' · ')),
      h('div.acts', { style: { marginTop: '13px' } },
        btn('Aufnehmen', { variant: 'solid', ico: 'plus', onClick: () => openAdd(m) }),
        btn('Ansehen', { variant: 'ghost', ico: 'arrow', onClick: () => { const e = D.entryForMedia(m.id); if (e) { state.detailId = e.rootId; state.detailSeason = null; } go('detail'); } })))));
  return card;
}

function genreStage(g) {
  const box = h('div.card.card__pad', { style: { position: 'relative', overflow: 'hidden' } });
  if (!reducedMotion()) {
    const layer = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
    const tones = ['var(--cy)', 'var(--pu)', 'var(--pk)'];
    for (let i = 0; i < 20; i++) {
      const s = 2 + Math.random() * 3;
      layer.appendChild(h('span', {
        style: {
          position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          width: `${s}px`, height: `${s}px`, borderRadius: '50%',
          background: tones[i % 3],
          boxShadow: `0 0 ${6 + Math.random() * 8}px ${tones[i % 3]}`,
          opacity: String(0.2 + Math.random() * 0.5),
          animation: `spark ${8 + Math.random() * 9}s linear ${(-Math.random() * 11).toFixed(1)}s infinite`,
        },
      }));
    }
    box.appendChild(layer);
  }
  box.appendChild(h('div', { style: { position: 'relative' } },
    dot('cy', 'Genre'),
    h('h2.ptitle', { style: { fontSize: 'clamp(26px,7vw,42px)' } }, D.GENRE_LABEL[g] ?? g),
    h('p.psub', {}, `${D.LIBRARY.filter((e) => e.genres.includes(g)).length} davon liegen schon im Stapel.`)));
  return box;
}

function cardRow(title, items) {
  if (!items?.length) return document.createTextNode('');
  return h('section', {}, sec(title, { count: items.length }),
    h('div.row-scroll.no-bar.row-cards', {}, ...items.map((m, i) => fannedCard(m, i))));
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

  const tl = h('div.tl', { role: 'tablist', 'aria-label': 'Staffeln' });
  seasons.forEach((s, i) => {
    const done = i < entry.seasonIndex;
    tl.appendChild(h('button.tl__i' + (i === shownIdx ? '.is-on' : '') + (done ? '.is-off' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(i === shownIdx),
      onclick: () => { state.detailSeason = i; refresh(); },
    },
      h('span.tl__k', {}, labels[i], D.isReleased(s) ? (done ? icon('check', { size: 13 }) : null) : icon('clock', { size: 13 })),
      art(s),
      h('span.tl__t', {}, s.title),
      h('span.tl__m', {}, [s.episodes ? `${s.episodes} F` : 'offen', D.seasonTag(s)].filter(Boolean).join(' · '))));
  });

  const valEl = h('span.step__v.mono', {}, h('span', {}, String(entry.progress)), h('small', {}, ` /${total || '?'}`));
  const setVal = (n) => {
    entry.progress = clamp(n, 0, total || 999);
    valEl.firstChild.textContent = String(entry.progress);
    valEl.classList.remove('zap'); void valEl.offsetWidth; valEl.classList.add('zap');
  };

  return h('div.screen', {},
    h('div.hero', {},
      D.entryBanner(entry) ? h('div.hero__bg', {}, h('img', { src: D.entryBanner(entry), alt: '' })) : null,
      h('div.hero__in', {},
        art(cur),
        h('div', { style: { minWidth: 0 } },
          dot(TONE[entry.status], PILE[entry.status]),
          h('h1.hero__t', { style: { marginTop: '8px' } }, D.entryTitle(entry)),
          h('p.hero__m', {}, [cur?.studio, D.seasonTag(cur), cur?.episodes ? `${cur.episodes} Folgen` : null, cur?.score ? `${cur.score} %` : null].filter(Boolean).join(' · '))))),

    h('div.stack--lg', { class: 'stack', style: { paddingTop: '18px' } },
      h('div.acts', {},
        btn('Weiter', { variant: 'solid', ico: 'play', filled: true, onClick: () => { D.setStatus(entry.rootId, 'watching'); toast('Karte ist an'); refresh(); } }),
        btn('Umlegen', { variant: 'pu', ico: 'layers', onClick: () => openStatus(entry) }),
        iconBtn('trash', 'Entfernen', { onClick: () => openRemove(entry) })),

      h('section', {},
        sec('Fortschritt'),
        h('div.card.card__pad.fx.fw', { style: { gap: '18px' } },
          h('div.step', {},
            h('button.step__b', { type: 'button', 'aria-label': 'Eine Folge zurück', onclick: () => setVal(entry.progress - 1) }, icon('minus', { size: 18 })),
            valEl,
            h('button.step__b', { type: 'button', 'aria-label': 'Eine Folge weiter', onclick: () => setVal(entry.progress + 1) }, icon('plus', { size: 18 }))),
          h('div', {},
            h('div.row__t', {}, `Staffel ${D.seasonNo(entry)} von ${seasons.length}`),
            h('div.row__s', {}, `${D.watchedEpisodes(entry)} FOLGEN · ${Math.round(D.watchedEpisodes(entry) * D.meanDuration(entry) / 60)} STD`)))),

      h('section', {},
        sec('Zeitstrahl', { count: seasons.length }),
        tl,
        h('div.two', {}, seasonFacts(shown, labels[shownIdx]), franchiseBox(facts))),

      h('section', {},
        sec('Inhalt'),
        h('p.dim', { style: { fontSize: '14.5px', lineHeight: '1.65' } }, shown?.synopsis || 'Keine Beschreibung hinterlegt.')),

      cardRow('Passt dazu', D.DETAIL_EXTRAS.recommendations)));
}

function seasonFacts(s, label) {
  if (!s) return document.createTextNode('');
  return h('div.card.card__pad', {},
    h('div.fx', { style: { marginBottom: '10px' } }, dot('cy', `Diese ${label ?? 'Staffel'}`)),
    h('div.facts', {},
      fact('Titel', s.title),
      fact('Format', D.FORMAT_LABEL[s.format] ?? '—'),
      fact('Folgen', s.episodes ? String(s.episodes) : 'offen'),
      fact('Laufzeit', s.duration ? `${s.duration} Min` : '—'),
      fact('Start', D.releaseLabel(s) ?? '—'),
      fact('Studio', s.studio ?? '—'),
      fact('Wertung', s.score ? `${s.score} %` : '—'),
      fact('Zustand', D.isReleased(s) ? (s.airStatus === 'RELEASING' ? 'läuft gerade' : 'abgeschlossen') : 'noch nicht erschienen')));
}

function franchiseBox(f) {
  return h('div.card.card__pad', {},
    h('div.fx', { style: { marginBottom: '10px' } }, dot('pu', 'Ganzes Franchise')),
    h('div.facts', {},
      fact('Teile', `${f.parts} · ${f.released} erschienen, ${f.upcoming} offen`),
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
  scrim.appendChild(h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Umlegen', style: { boxShadow: 'var(--edge-pu), var(--sh-3)' } },
    h('h3', {}, 'Wohin im Stapel?'),
    h('p', {}, D.entryTitle(entry)),
    h('div.stack--sm', { class: 'stack', style: { marginTop: '15px' } },
      ...D.STATUS_ORDER.map((s) => btn(PILE[s], {
        variant: entry.status === s ? 'cy' : 'ghost',
        onClick: () => { D.setStatus(entry.rootId, s); scrim.remove(); toast(PILE[s]); refresh(); },
      }))),
    h('div.dialog__a', {}, btn('Abbrechen', { variant: 'ghost', onClick: () => scrim.remove() }))));
  document.body.appendChild(scrim);
  scrim.querySelector('button')?.focus();
}

function openRemove(entry) {
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  scrim.appendChild(h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Entfernen' },
    h('h3', {}, 'Karte aus dem Deck nehmen?'),
    h('p', {}, `„${D.entryTitle(entry)}" verschwindet samt Fortschritt. Das lässt sich nicht rückgängig machen.`),
    h('div.dialog__a', {},
      btn('Behalten', { variant: 'ghost', onClick: () => scrim.remove() }),
      btn('Entfernen', { variant: 'pk', ico: 'trash', onClick: () => { D.removeEntry(entry.rootId); scrim.remove(); toast('Entfernt'); go('bibliothek'); refresh(); } }))));
  document.body.appendChild(scrim);
  scrim.querySelector('button')?.focus();
}

/* =============================================================== Werte ===== */

function screenStats() {
  const st = D.stats();
  const maxG = Math.max(...st.genres.map((g) => g.value), 1);
  const maxY = Math.max(...st.years.map((y) => y.value), 1);
  const totalStatus = st.perStatus.reduce((a, b) => a + b.count, 0) || 1;
  const tone = { watching: 'var(--cy)', nextup: 'var(--pu)', planned: 'var(--pk)', continuation: 'var(--card-4)', completed: 'var(--cy-dim)' };

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {}, h('h1.ptitle', {}, 'Werte'), h('p.psub', {}, 'Was der Stapel über dich sagt.')),

    h('div.tiles', {},
      tile(num(st.episodes), 'Folgen'),
      tile(num(st.hours), 'Stunden'),
      tile(String(st.total), 'Karten'),
      tile(st.days >= 1 ? st.days.toFixed(1) : String(st.hours), st.days >= 1 ? 'Tage am Stück' : 'Stunden')),

    h('section', {},
      sec('Verteilung im Stapel'),
      h('div.card.card__pad', {},
        h('div', { style: { display: 'flex', gap: '3px', height: '14px' } },
          ...st.perStatus.filter((r) => r.count).map((r) => h('div', {
            title: `${PILE[r.status]}: ${r.count}`,
            style: {
              width: `${(r.count / totalStatus) * 100}%`, borderRadius: '3px',
              background: tone[r.status],
              boxShadow: r.status === 'continuation' ? 'none' : `0 0 14px -4px ${tone[r.status]}`,
            },
          }))),
        h('div.fx.fw', { style: { marginTop: '14px', gap: '16px' } },
          ...st.perStatus.filter((r) => r.count).map((r) => h('span.fx', { style: { gap: '7px' } },
            h('i', { style: { width: '8px', height: '8px', borderRadius: '50%', display: 'block', background: tone[r.status] } }),
            h('span.sm', {}, `${PILE[r.status]} · ${r.count}`)))))),

    h('section', {},
      sec('Genres'),
      h('div.card.card__pad.bars', { class: 'bars' }, ...st.genres.map((g) => h('div.bar', {},
        h('span.mut', {}, g.label),
        h('span.bar__t', {}, h('i.bar__f', { style: { width: `${(g.value / maxG) * 100}%`, display: 'block' } })),
        h('span.bar__n', {}, String(g.value)))))),

    h('section', {},
      sec('Nach Jahr'),
      h('div.card.card__pad', {}, h('div.cols', {}, ...st.years.map((y) => h('div.col', {},
        h('div.col__b', { style: { height: `${(y.value / maxY) * 100}%` }, title: `${y.value}` }),
        h('div.col__l', {}, String(y.year).slice(2))))))),

    h('section', {},
      sec('Die schwersten Karten'),
      h('div.list', {}, ...st.longest.map((e, i) => h('a.row', { href: '#/detail', onclick: openDetail(e) },
        h('span.mono.mut', { style: { width: '24px' } }, String(i + 1).padStart(2, '0')),
        h('span.row__c', {}, art(D.currentSeason(e))),
        h('span.row__b', {}, h('span.row__t', {}, D.entryTitle(e)), h('span.row__s', {}, `${D.watchedEpisodes(e)} FOLGEN`)),
        h('span.row__n', {}, `${Math.round(D.watchedEpisodes(e) * D.meanDuration(e) / 60)} STD`))))));
}

function tile(v, l) { return h('div.tile', {}, h('div.tile__v', {}, v), h('div.tile__l', {}, l)); }

/* =============================================================== Setup ===== */

function screenSettings() {
  let lang = 'de';
  const langBox = h('div', {});
  const drawLang = () => clear(langBox).appendChild(segmented(
    [{ key: 'de', label: 'Deutsch' }, { key: 'en', label: 'English' }], lang,
    (k) => { lang = k; drawLang(); toast(k === 'de' ? 'Sprache: Deutsch' : 'Language: English'); }));
  drawLang();

  const sw = h('button.sw.is-on', { type: 'button', role: 'switch', 'aria-checked': 'true', 'aria-label': 'Originaltitel bevorzugen' });
  sw.addEventListener('click', () => { const on = sw.classList.toggle('is-on'); sw.setAttribute('aria-checked', String(on)); });

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {}, h('h1.ptitle', {}, 'Setup'), h('p.psub', {}, 'Konto, Sprache, Sicherung.')),

    h('section', {}, sec('Konto'),
      h('div.card.card__pad.fx', {},
        h('span.iconbtn', { style: { width: '52px', height: '52px', color: 'var(--cy-text)', boxShadow: 'var(--edge-cy)' } }, icon('person', { size: 26, filled: true })),
        h('div', {},
          h('div.row__t', {}, D.PROFILE.name),
          h('div.row__s', {}, D.PROFILE.email),
          h('div.row__s', {}, `${D.PROFILE.devices} GERÄTE · SYNC ${D.PROFILE.lastSync.toUpperCase()}`)))),

    h('section', {}, sec('Sprache'),
      h('div.card.card__pad', {},
        h('p.sm.mut', { style: { marginBottom: '11px' } }, 'Serientitel bleiben international — AniList liefert keine deutschen Titel.'),
        langBox)),

    h('section', {}, sec('Anzeige'),
      h('div.card.card__pad.fx', {},
        icon('film', { size: 21, filled: true, cls: 'mut' }),
        h('div.row__b', {}, h('div.row__t', {}, 'Originaltitel bevorzugen'), h('div.row__s', {}, 'ROMAJI STATT INTERNATIONALEM TITEL')),
        sw)),

    h('section', {}, sec('Sicherung'),
      h('div.card.card__pad.fx.fw', {},
        btn('Exportieren', { variant: 'ghost', ico: 'down_tray', onClick: () => toast('Export erstellt (Entwurf)') }),
        btn('Importieren', { variant: 'ghost', ico: 'up_tray', onClick: () => toast('Import gestartet (Entwurf)') }),
        h('span.sm.mut', {}, 'Letzte Sicherung: heute, 08:14'))),

    h('section', {}, sec('Gefahrenzone'),
      h('div.danger', {},
        h('div.row__t', {}, 'Deck leeren'),
        h('p.sm.mut', { style: { margin: '5px 0 13px' } }, 'Löscht alle Karten auf allen Geräten. Es gibt keinen Papierkorb.'),
        h('div.fx.fw', {},
          btn('Alles löschen', { variant: 'pk', ico: 'trash', onClick: () => openRemove(D.LIBRARY[0]) }),
          btn('Abmelden', { variant: 'ghost', ico: 'exit', onClick: () => toast('Abgemeldet (Entwurf)') })))));
}

/* ======================================================= Suche + Aufnahme == */

let findOpen = false;

function openFind() {
  if (findOpen) return;
  findOpen = true;
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) close(); } });
  const close = () => { findOpen = false; scrim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  const results = h('div.sheet__b');
  const input = h('input', { type: 'search', placeholder: 'Titel, Studio oder Genre …', 'aria-label': 'Suche', autocomplete: 'off', spellcheck: 'false' });

  const draw = (q) => {
    clear(results);
    const term = q.trim();
    const hits = term ? D.searchMedia(term) : D.SEARCH_RECENT;
    results.appendChild(h('p.sm.mut', { style: { margin: '8px 0 13px' } }, term ? `${hits.length} Treffer` : 'Zuletzt gesucht'));
    if (!hits.length) { results.appendChild(empty('Nichts gefunden', 'Anderer Begriff?')); return; }
    const grid = h('div.grid-cards');
    for (const [i, m] of hits.entries()) {
      const box = fannedCard(m, i);
      const add = box.querySelector('.btn:not(:disabled)');
      if (add) add.addEventListener('click', close, { once: true });
      grid.appendChild(box);
    }
    results.appendChild(grid);
  };
  input.addEventListener('input', () => draw(input.value));
  draw('');

  scrim.appendChild(h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Suche' },
    h('div.find__in', {}, icon('find', { size: 20, cls: 'mut' }), input,
      h('button.iconbtn.iconbtn--sm', { type: 'button', 'aria-label': 'Schließen', onclick: close }, icon('x', { size: 16 }))),
    results));
  document.body.appendChild(scrim);
  input.focus();
}

/**
 * Aufnahme-Flow. Der Franchise-Zeitstrahl ist hier der Stapel selbst: beim
 * Durchklicken stehen die Angaben DIESER Staffel neben denen des GANZEN
 * Franchise — wie im `AddPanel` der echten App.
 */
function openAdd(media) {
  const seasons = D.franchiseOf(media.id);
  const labels = D.timelineLabels(seasons);
  const facts = D.franchiseFacts(seasons);

  let mode = 'watching';
  let pick = Math.max(0, seasons.findIndex((s) => D.isReleased(s)));
  let episode = 1;
  let cutoff = null;

  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  const body = h('div.sheet__b');
  const foot = h('div.sheet__f');

  const render = () => {
    clear(body); clear(foot);

    body.appendChild(segmented([
      { key: 'watching', label: 'Schaue ich' },
      { key: 'completed', label: 'Schon geschaut' },
      { key: 'planned', label: 'Nur vormerken' },
    ], mode, (k) => { mode = k; render(); }));

    body.appendChild(h('p.psub', { style: { marginBottom: '13px' } }, {
      watching: 'Bei welcher Karte bist du — und bei welcher Folge?',
      completed: 'Bis wohin hast du geschaut? Mit „Abschneiden ab" fliegt alles danach aus dem Eintrag.',
      planned: 'Der ganze Stapel landet im Fächer.',
    }[mode]));

    if (mode === 'completed' && cutoff !== null) {
      body.appendChild(h('div.fx', { style: { marginBottom: '11px' } },
        dot('pk', `abgeschnitten ab ${labels[cutoff]}`),
        btn('Zurücknehmen', { variant: 'ghost', sm: true, onClick: () => { cutoff = null; render(); } })));
    }

    const tl = h('div.tl');
    seasons.forEach((s, i) => {
      const released = D.isReleased(s);
      const excluded = cutoff !== null && i > cutoff;
      const selected = mode === 'completed' ? i <= pick && !excluded : i === pick;
      tl.appendChild(h('button.tl__i' + (selected ? '.is-on' : '') + (excluded || (!released && mode !== 'planned') ? '.is-off' : ''), {
        type: 'button',
        disabled: (!released && mode !== 'planned') || excluded || null,
        onclick: () => { pick = i; episode = 1; render(); },
      },
        h('span.tl__k', {}, labels[i], released ? (selected ? icon('check', { size: 13 }) : null) : icon('clock', { size: 13 })),
        art(s),
        h('span.tl__t', {}, s.title),
        h('span.tl__m', {}, [s.episodes ? `${s.episodes} F` : 'offen', D.seasonTag(s)].filter(Boolean).join(' · '))));
    });
    body.appendChild(tl);

    if (mode === 'completed') {
      body.appendChild(h('div.fx.fw', { style: { gap: '8px', marginBottom: '14px' } },
        h('span.sm.mut', {}, 'Abschneiden ab:'),
        ...seasons.map((s, i) => btn(labels[i], { variant: 'ghost', sm: true, onClick: () => { cutoff = i; if (pick > i) pick = i; render(); } }))));
    }

    if (mode === 'watching') {
      const max = seasons[pick]?.episodes ?? null;
      const val = h('span.step__v.mono', {}, h('span', {}, String(episode)), h('small', {}, ` /${max ?? '?'}`));
      body.appendChild(h('div', { style: { margin: '14px 0' } },
        h('p.sm.mut', { style: { marginBottom: '9px' } }, 'Bei welcher Folge?'),
        h('div.step', {},
          h('button.step__b', { type: 'button', 'aria-label': 'Weniger', onclick: () => { episode = Math.max(1, episode - 1); val.firstChild.textContent = String(episode); } }, icon('minus', { size: 17 })),
          val,
          h('button.step__b', { type: 'button', 'aria-label': 'Mehr', onclick: () => { episode = max ? Math.min(max, episode + 1) : episode + 1; val.firstChild.textContent = String(episode); } }, icon('plus', { size: 17 })))));
    }

    body.appendChild(h('div.two', { style: { marginTop: '14px' } },
      seasonFacts(seasons[pick], labels[pick]),
      franchiseBox(facts)));

    foot.append(
      btn('Ins Deck', {
        variant: 'solid', ico: 'check',
        onClick: () => {
          const cut = cutoff !== null ? seasons.slice(0, cutoff + 1) : seasons;
          let entry;
          if (mode === 'planned') entry = D.addFranchise({ seasons: cut, status: 'planned' });
          else if (mode === 'completed') entry = D.addFranchise({ seasons: cut, status: 'watching', watchedThrough: pick + 1, currentEpisode: cut[Math.min(pick, cut.length - 1)]?.episodes ?? 0 });
          else entry = D.addFranchise({ seasons: cut, status: 'watching', watchedThrough: pick, currentEpisode: episode });
          scrim.remove();
          toast(`${seasons[0].title} → ${PILE[entry.status]}`);
          refresh();
        },
      }),
      btn('Abbrechen', { variant: 'ghost', onClick: () => scrim.remove() }),
      h('span.sm.mut.push.hide-s', {}, `${facts.parts} Teile · ${facts.episodes} Folgen · ${facts.hours} Std`));
  };

  const sheet = h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Aufnehmen' },
    h('div.sheet__h', {},
      h('span.kana', {}, 'つぎ'),
      h('span', {}, 'Karte ins Deck legen'),
      h('button.iconbtn.iconbtn--sm.push', { type: 'button', 'aria-label': 'Schließen', onclick: () => scrim.remove() }, icon('x', { size: 16 }))),
    body, foot);
  render();
  scrim.appendChild(sheet);
  document.body.appendChild(scrim);
  sheet.querySelector('button')?.focus();
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
    }, iconPair(n.ico, { size: 23, active: n.key === active }), h('span.tabbar__l', {}, n.label))));
}

function rail(active) {
  return h('aside.rail', {},
    h('div.rail__brand', {},
      h('img', { src: '/assets/logo.png', alt: '', width: 30, height: 30, style: { borderRadius: '9px' } }),
      h('span.brand__w', {}, 'Tsugi')),
    h('button.findbtn', { type: 'button', onclick: openFind },
      icon('find', { size: 18 }), h('span', {}, 'Suchen'), h('kbd', {}, 'Strg K')),
    h('div', { style: { height: '12px' } }),
    ...NAV.map((n) => h('a.rail__i' + (n.key === active ? '.is-on' : ''), {
      href: `#/${n.key}`, 'aria-current': n.key === active ? 'page' : null,
    }, iconPair(n.ico, { size: 21, active: n.key === active }), h('span', {}, n.label))),
    h('div.rail__foot', {},
      h('a.sm.mut', { href: '/index.html' }, '← Showroom'),
      h('p.sm.mut', { style: { marginTop: '6px' } }, 'V4 „Deck" — Entwurf, keine echten Daten.')));
}

function head(active) {
  const t = NAV.find((n) => n.key === active)?.label ?? 'Tsugi';
  return h('header.topbar', {},
    active === 'home'
      ? h('span.brand', {}, h('img', { src: '/assets/logo.png', alt: 'Tsugi' }), h('span.brand__w', {}, 'Tsugi'))
      : h('a.iconbtn.iconbtn--sm', { href: '#/home', 'aria-label': 'Zurück' }, icon('left', { size: 17 })),
    h('span.topbar__title', {}, active === 'home' ? '' : t),
    h('button.iconbtn.iconbtn--sm', { type: 'button', 'aria-label': 'Suchen', onclick: openFind }, icon('find', { size: 17 })));
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
root.append(h('a.skip.btn.btn--solid', { href: '#inhalt' }, 'Zum Inhalt springen'), shell);

startRouter({
  mount: wrap,
  fallback: 'home',
  onChange: (k) => {
    clear(headSlot).appendChild(head(k));
    shell.firstChild.replaceWith(rail(k));
    document.querySelector('.tabbar')?.remove();
    document.body.appendChild(tabbar(k));
    document.title = `Tsugi V4 „Deck" — ${NAV.find((n) => n.key === k)?.label ?? k}`;
  },
});

setInterval(() => {
  for (const el of document.querySelectorAll('[data-airing]')) {
    el.textContent = D.countdownShort(Number(el.dataset.airing));
  }
}, 30000);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openFind(); }
});
