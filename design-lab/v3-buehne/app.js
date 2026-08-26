/**
 * V3 „BÜHNE" — sieben Bildschirme.
 *
 * Leitgedanke: Das Artwork trägt alles. Die Akzentfarbe wird aus dem Cover
 * gezogen, vor dem man gerade steht (`media.color` von AniList) — die App
 * hat keine eigene Lieblingsfarbe. Jeder Status ist eine eigene
 * Inszenierung: auf der Bühne, hinter dem Vorhang, im Dunkeln, abgespielt,
 * im Foyer.
 */

import { h, clear, num, clamp, reducedMotion, finePointer } from '../shared/dom.js';
import { defineScreens, startRouter, go, refresh } from '../shared/router.js';
import * as D from '../shared/mock.js';
import { icon, iconPair } from './icons.js';

/* ============================================================== Zustand ==== */

const state = {
  panel: 'watching',
  libTab: 'watching',
  genre: null,
  detailId: D.DETAIL_ENTRY.rootId,
  detailSeason: null,
};

const NAV = [
  { key: 'home', label: 'Bühne', ico: 'stage' },
  { key: 'bibliothek', label: 'Sammlung', ico: 'collection' },
  { key: 'entdecken', label: 'Entdecken', ico: 'spark' },
  { key: 'statistik', label: 'Verlauf', ico: 'pulse' },
  { key: 'einstellungen', label: 'Profil', ico: 'person' },
];

/** Wie die Status hier heißen — jede Inszenierung hat ihren eigenen Namen. */
const SCENE = {
  watching: 'Auf der Bühne',
  nextup: 'Hinter dem Vorhang',
  planned: 'Im Foyer',
  continuation: 'Noch dunkel',
  completed: 'Abgespielt',
};

/* =============================================================== Helfer ==== */

function toast(text) {
  document.querySelector('.toast')?.remove();
  const t = h('div.toast', { role: 'status' }, icon('check', { size: 19, filled: true }), h('span', {}, text));
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/** Setzt die Titelfarbe auf ein Element — das ist der rote Faden von V3. */
function tint(el, media) {
  if (media?.color) el.style.setProperty('--c', media.color);
  return el;
}

/**
 * Cover mit Parallaxe: der Rahmen steht, das Bild bewegt sich darin.
 * Nur mit echter Maus — auf Touch gäbe es keinen Auslöser.
 */
function art(media, { wide = false, cls = '' } = {}) {
  const box = h('span.art' + (wide ? '.art--wide' : '') + (cls ? '.' + cls : ''), {});
  const src = wide ? (media?.banner ?? media?.cover) : media?.cover;
  if (src) box.appendChild(h('img', { src, alt: '', loading: 'lazy', decoding: 'async' }));
  if (finePointer() && !reducedMotion()) {
    let raf = 0;
    box.addEventListener('pointermove', (ev) => {
      const r = box.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width - 0.5) * -10;
      const py = ((ev.clientY - r.top) / r.height - 0.5) * -10;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        box.style.setProperty('--px', `${px.toFixed(1)}px`);
        box.style.setProperty('--py', `${py.toFixed(1)}px`);
      });
    });
    box.addEventListener('pointerleave', () => {
      box.style.setProperty('--px', '0px');
      box.style.setProperty('--py', '0px');
    });
  }
  return box;
}

function pill(label, opts = {}) {
  const { variant = '', ico = null, onClick = null, sm = false, disabled = false, wide = false, filled = false } = opts;
  const b = h('button.pill' + (variant ? `.pill--${variant}` : '') + (sm ? '.pill--sm' : '') + (wide ? '.pill--wide' : ''),
    { type: 'button', disabled: disabled || null, onclick: onClick || undefined });
  if (ico) b.appendChild(icon(ico, { size: sm ? 18 : 20, filled }));
  if (label) b.appendChild(h('span', {}, label));
  return b;
}

function circ(name, label, opts = {}) {
  const { onClick = null, sm = false, filled = false } = opts;
  return h('button.circ' + (sm ? '.circ--sm' : ''),
    { type: 'button', 'aria-label': label, title: label, onclick: onClick || undefined },
    icon(name, { size: sm ? 18 : 22, filled }));
}

function mark(kind, text) {
  const cls = { watching: 'on', nextup: 'ready', continuation: 'dark', completed: 'done', planned: '' }[kind] ?? '';
  return h('span.mark' + (cls ? `.mark--${cls}` : ''), {}, h('i'), text);
}

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

function arc(pct, size = 46) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const bar = h('circle.b', {
    cx: size / 2, cy: size / 2, r, 'stroke-width': 3,
    'stroke-dasharray': c.toFixed(1),
    'stroke-dashoffset': (c - clamp(pct, 0, 1) * c).toFixed(1),
  });
  const svg = h('svg.arc', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true', style: { transform: 'rotate(-90deg)' } },
    h('circle.t', { cx: size / 2, cy: size / 2, r, 'stroke-width': 3 }), bar);
  svg._set = (p) => bar.setAttribute('stroke-dashoffset', (c - clamp(p, 0, 1) * c).toFixed(1));
  return svg;
}

const openDetail = (entry) => () => { state.detailId = entry.rootId; state.detailSeason = null; };

/* ================================ INSZENIERUNG 1: auf der Bühne (watching) = */

function onStage(entry) {
  const s = D.currentSeason(entry);
  const total = s?.episodes ?? 0;
  const ring = arc(D.seasonPct(entry), 46);
  const meta = h('div.onstage__m', {}, metaText(entry));

  const card = tint(h('article.onstage', {}), s);
  card.append(
    h('a.glowbox', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block' } }, art(s)),
    h('div', { style: { minWidth: 0 } },
      mark('watching', `${SCENE.watching} · Folge ${entry.progress}${total ? ` von ${total}` : ''}`),
      h('a.onstage__t', { href: '#/detail', onclick: openDetail(entry), style: { display: 'block', marginTop: '4px' } }, D.entryTitle(entry)),
      meta,
      h('div.onstage__acts', {},
        pill('Folge sehen', {
          variant: 'go', ico: 'play', filled: true,
          onClick: () => {
            if (total && entry.progress >= total) { toast('Staffel ist durch'); return; }
            D.bumpProgress(entry.rootId, +1);
            ring._set(D.seasonPct(entry));
            meta.textContent = metaText(entry);
          },
        }),
        pill('Abgespielt', { variant: 'soft', ico: 'check', sm: true, onClick: () => { D.setStatus(entry.rootId, 'completed'); toast(`${D.entryTitle(entry)} abgespielt`); refresh(); } }),
        circ('dots', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) }))),
    h('div', { class: 'hide-s', style: { marginLeft: 'auto' } }, ring));
  return card;
}

function metaText(entry) {
  const s = D.currentSeason(entry);
  const bits = [];
  if (entry.seasons.length > 1) bits.push(`Staffel ${D.seasonNo(entry)} von ${entry.seasons.length}`);
  if (s?.studio) bits.push(s.studio);
  if (s?.airStatus === 'RELEASING' && s.nextAiring) bits.push(`nächste Folge ${D.weekdayTime(s.nextAiring.airingAt)}`);
  else if (D.seasonTag(s)) bits.push(D.seasonTag(s));
  return bits.join(' · ');
}

/* ============================ INSZENIERUNG 2: hinter dem Vorhang (nextup) == */

function behindCurtain(entry) {
  const s = D.currentSeason(entry);
  const box = tint(h('div', { style: { minWidth: 0 } }), s);
  const shot = h('span.glowbox', { style: { display: 'block', position: 'relative' } }, art(s));
  shot.appendChild(h('span.behind__badge', {}, icon('curtain', { size: 14, filled: true }), 'bereit'));
  /* EIN Anker um Cover, Titel und Zeile — ein 18-px-Titellink wäre auf dem
     Handy nicht zu treffen, und das Cover ist ohnehin der eigentliche Eintrag. */
  box.append(h('a.poster.behind', { href: '#/detail', onclick: openDetail(entry) },
    shot,
    h('span.poster__t', {}, D.entryTitle(entry)),
    h('span.poster__m', {}, [entry.seasons.length > 1 ? `Staffel ${D.seasonNo(entry)}` : null, s?.episodes ? `${s.episodes} Folgen` : null].filter(Boolean).join(' · '))),
    h('div.fx', { style: { marginTop: '10px', gap: '8px' } },
      pill('Vorhang auf', { variant: 'go', ico: 'play', filled: true, sm: true, onClick: () => { D.setStatus(entry.rootId, 'watching'); toast(`${D.entryTitle(entry)} läuft`); refresh(); } }),
      circ('dots', 'Weitere Aktionen', { sm: true, onClick: () => openRemove(entry) })));
  return box;
}

/* ================================= INSZENIERUNG 3: im Dunkeln (continuation) */

function inTheDark(entry) {
  const s = D.currentSeason(entry);
  const air = s?.nextAiring;
  const shot = h('span', { style: { display: 'block', position: 'relative' } }, art(s));
  shot.appendChild(h('span.dark__when', {},
    icon('clock', { size: 15 }),
    h('span', {}, entry.releaseNote ?? D.releaseLabel(s) ?? 'Termin offen'),
    air ? h('span.dark__cd', { dataset: { airing: String(air.airingAt) } }, D.countdownShort(air.airingAt)) : null));
  return tint(h('a.poster.dark', { href: '#/detail', onclick: openDetail(entry) },
    shot,
    h('span.poster__t', {}, D.entryTitle(entry)),
    h('span.poster__m', {}, 'Angekündigt — Licht noch aus')), s);
}

/* ============================== INSZENIERUNG 4: abgespielt (completed) ===== */

function played(entry) {
  const s = D.currentSeason(entry) ?? entry.seasons[0];
  const shot = h('span', { style: { display: 'block', position: 'relative' } }, art(s));
  shot.appendChild(h('span.played__seal', {}, icon('check', { size: 19, filled: true })));
  shot.appendChild(h('span.played__credits', {},
    h('span', {}, `${entry.seasons.length} ${entry.seasons.length === 1 ? 'Teil' : 'Teile'}`),
    h('b', {}, `${D.watchedEpisodes(entry)} Folgen`)));
  return tint(h('a.poster.played', { href: '#/detail', onclick: openDetail(entry) },
    shot,
    h('span.poster__t', {}, D.entryTitle(entry)),
    h('span.poster__m', {}, `${Math.round(D.watchedEpisodes(entry) * D.meanDuration(entry) / 60)} Stunden`),
    h('span.poster__rule', { style: { display: 'block' } })), s);
}

/* ================================= INSZENIERUNG 5: Foyer (planned/discover) = */

function foyer(mediaOrEntry) {
  const entry = mediaOrEntry.seasons ? mediaOrEntry : null;
  const m = entry ? D.currentSeason(entry) : mediaOrEntry;
  const box = tint(h('div', { style: { minWidth: 0 } }), m);
  box.append(h('a.poster', { href: '#/detail', onclick: entry ? openDetail(entry) : undefined },
    h('span.glowbox', { style: { display: 'block' } }, art(m)),
    h('span.poster__t', {}, m?.title ?? '—'),
    h('span.poster__m', {}, [D.FORMAT_LABEL[m?.format], D.seasonTag(m), m?.episodes ? `${m.episodes} Folgen` : null].filter(Boolean).join(' · ')),
    h('span.poster__rule', { style: { display: 'block' } })));
  if (!entry) {
    const inLib = D.entryForMedia(m.id);
    box.appendChild(h('div', { style: { marginTop: '10px' } },
      inLib ? pill('In der Sammlung', { variant: 'quiet', ico: 'check', sm: true, disabled: true })
        : pill('Aufnehmen', { variant: 'soft', ico: 'plus', sm: true, onClick: () => openAdd(m) })));
  }
  return box;
}

/* ================================================================ Bühne ==== */

function screenHome() {
  const counts = {
    watching: D.byStatus('watching').length,
    nextup: D.byStatus('nextup').length,
    planned: D.byStatus('planned').length,
  };

  const body = h('div.stack');
  if (state.panel === 'watching') {
    const l = D.byStatus('watching');
    body.appendChild(l.length ? h('div.stack', {}, ...l.map(onStage)) : empty('Die Bühne ist leer', 'Was du gerade schaust, steht hier im Licht.'));
  } else if (state.panel === 'nextup') {
    const l = D.byStatus('nextup');
    body.appendChild(l.length ? h('div.grid-art', {}, ...l.map(behindCurtain)) : empty('Kein Vorhang', 'Sobald eine neue Staffel bereitliegt, wartet sie hier.'));
  } else {
    body.appendChild(roller());
    body.appendChild(h('div.grid-art', {}, ...D.byStatus('planned').map(foyer)));
  }

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {},
      h('h1.ptitle', {}, 'Heute ', h('em', {}, 'auf der Bühne')),
      h('p.psub', {}, `${D.LIBRARY.length} Titel in der Sammlung · ${num(D.stats().episodes)} Folgen gesehen`)),
    segmented([
      { key: 'watching', label: SCENE.watching, count: counts.watching },
      { key: 'nextup', label: SCENE.nextup, count: counts.nextup },
      { key: 'planned', label: SCENE.planned, count: counts.planned },
    ], state.panel, (k) => { state.panel = k; refresh(); }),
    body,
    upcomingList());
}

function roller() {
  const pool = D.ROLL_POOL.length ? D.ROLL_POOL : D.LIBRARY;
  const face = h('span.row__c', {}, art(D.currentSeason(pool[0])));
  const name = h('span.row__b', {},
    h('span.row__t', {}, 'Zufall aus dem Foyer'),
    h('span.row__s', {}, 'Ein Titel, keine Ausreden.'));
  const card = tint(h('div.card', { style: { padding: '10px' } }), D.currentSeason(pool[0]));
  card.appendChild(h('div.row', {}, face, name,
    pill('Würfeln', {
      variant: 'soft', ico: 'dice', sm: true,
      onClick: (ev) => {
        const b = ev.currentTarget;
        if (b.dataset.busy) return;
        b.dataset.busy = '1';
        const steps = reducedMotion() ? 1 : 13;
        let i = 0;
        const tick = () => {
          const p = pool[Math.floor(Math.random() * pool.length)];
          const s = D.currentSeason(p);
          tint(card, s);
          face.replaceChildren(art(s));
          name.replaceChildren(h('span.row__t', {}, D.entryTitle(p)), h('span.row__s', {}, SCENE[p.status]));
          if (++i < steps) setTimeout(tick, 58 + i * 13);
          else { delete b.dataset.busy; toast(`Gewürfelt: ${D.entryTitle(p)}`); }
        };
        tick();
      },
    })));
  return card;
}

function upcomingList() {
  if (!D.SIMULCAST.length) return null;
  const list = h('div.list');
  for (const { entry, season } of D.SIMULCAST.slice(0, 7)) {
    const row = tint(h('a.row', { href: '#/detail', onclick: openDetail(entry) }), season);
    row.append(
      h('span.row__c', {}, art(season)),
      h('span.row__b', {},
        h('span.row__t', {}, D.entryTitle(entry)),
        h('span.row__s', {}, `Folge ${season.nextAiring.episode} · ${D.weekdayTime(season.nextAiring.airingAt)}`)),
      h('span.row__n', { dataset: { airing: String(season.nextAiring.airingAt) } }, D.countdownShort(season.nextAiring.airingAt)));
    list.appendChild(row);
  }
  return h('section', {}, sec('Als Nächstes im Programm', { count: D.SIMULCAST.length }), list);
}

function empty(t, s) {
  return h('div.empty', {}, icon('curtain', { size: 30 }), h('div.empty__t', {}, t), h('div.empty__s', {}, s));
}

/* ============================================================ Sammlung ===== */

function screenLibrary() {
  const tabs = D.STATUS_ORDER.map((s) => ({ key: s, label: SCENE[s], count: D.byStatus(s).length }));
  const l = D.byStatus(state.libTab);
  const body = h('div.stack');

  if (!l.length) body.appendChild(empty('Nichts hier', 'Diese Bühne ist gerade leer.'));
  else if (state.libTab === 'watching') body.appendChild(h('div.stack', {}, ...l.map(onStage)));
  else if (state.libTab === 'nextup') body.appendChild(h('div.grid-art', {}, ...l.map(behindCurtain)));
  else if (state.libTab === 'continuation') body.appendChild(h('div.grid-art', {}, ...l.map(inTheDark)));
  else if (state.libTab === 'completed') body.appendChild(h('div.grid-art', {}, ...l.map(played)));
  else body.appendChild(h('div.grid-art', {}, ...l.map(foyer)));

  const note = {
    watching: 'Was gerade im Licht steht.',
    nextup: 'Liegt bereit — der Vorhang ist noch zu.',
    planned: 'Das Foyer: gesehen werden will es, geplant ist es noch nicht.',
    continuation: 'Angekündigt, aber noch dunkel.',
    completed: 'Abgespielt — mit Abspann und Siegel.',
  }[state.libTab];

  return h('div.screen.stack', {},
    h('div', {}, h('h1.ptitle', {}, 'Sammlung'), h('p.psub', {}, note)),
    segmented(tabs, state.libTab, (k) => { state.libTab = k; refresh(); }),
    body);
}

/* =========================================================== Entdecken ===== */

function screenDiscover() {
  const chips = h('div.seg', {},
    h('button.seg__b' + (state.genre === null ? '.is-on' : ''), { type: 'button', onclick: () => { state.genre = null; refresh(); } }, h('span', {}, 'Alle')),
    ...D.GENRES.map((g) => h('button.seg__b' + (state.genre === g ? '.is-on' : ''), {
      type: 'button', onclick: () => { state.genre = g; refresh(); },
    }, h('span', {}, D.GENRE_LABEL[g] ?? g))));

  const body = h('div.stack--lg', { class: 'stack' });
  if (state.genre === null) {
    body.appendChild(spotlight(D.DISCOVER.spotlight));
    for (const r of D.DISCOVER.rows) body.appendChild(artRow(r.title, r.items));
  } else {
    body.appendChild(genreStage(state.genre));
    for (const r of D.genreRows(state.genre)) body.appendChild(artRow(r.title, r.items));
  }

  return h('div.screen.stack', {},
    h('div', {}, h('h1.ptitle', {}, 'Entdecken'), h('p.psub', {}, 'Was gerade läuft, was kommt, was du übersehen hast.')),
    chips, body);
}

function spotlight(m) {
  const wrap = tint(h('section', { style: { position: 'relative' } }), m);
  const bg = h('div', { style: { position: 'absolute', inset: '0', borderRadius: 'var(--r-3)', overflow: 'hidden' } });
  if (m.banner) bg.appendChild(h('img', { src: m.banner, alt: '', loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'cover', opacity: '.5' } }));
  bg.appendChild(h('div', { style: { position: 'absolute', inset: '0', background: 'linear-gradient(100deg, var(--bg) 16%, rgba(19,19,22,.42))' } }));
  wrap.append(bg, h('div', {
    style: { position: 'relative', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '18px', padding: '20px', alignItems: 'end' },
  },
    h('span.glowbox', { style: { display: 'block' } }, art(m)),
    h('div', { style: { minWidth: 0 } },
      mark('watching', 'Im Scheinwerfer'),
      h('h3', { class: 'onstage__t', style: { marginTop: '8px' } }, m.title),
      h('p.psub', { style: { marginTop: '6px' } }, [D.FORMAT_LABEL[m.format], D.seasonTag(m), m.studio, m.score ? `${m.score} %` : null].filter(Boolean).join(' · ')),
      h('div.acts', { style: { marginTop: '14px' } },
        pill('Aufnehmen', { variant: 'go', ico: 'plus', onClick: () => openAdd(m) }),
        pill('Ansehen', { variant: 'quiet', ico: 'arrow', onClick: () => { const e = D.entryForMedia(m.id); if (e) { state.detailId = e.rootId; state.detailSeason = null; } go('detail'); } })))));
  return wrap;
}

function genreStage(g) {
  const box = h('div.card', { style: { position: 'relative', overflow: 'hidden' } });
  if (!reducedMotion()) {
    const layer = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
    for (let i = 0; i < 18; i++) {
      const s = 2 + Math.random() * 4;
      layer.appendChild(h('span', {
        style: {
          position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          width: `${s}px`, height: `${s}px`, borderRadius: '50%',
          background: 'var(--c)', opacity: String(0.1 + Math.random() * 0.35),
          animation: `motes ${10 + Math.random() * 10}s linear ${(-Math.random() * 12).toFixed(1)}s infinite`,
        },
      }));
    }
    box.appendChild(layer);
  }
  box.appendChild(h('div', { style: { position: 'relative' } },
    mark('watching', 'Genre'),
    h('h2.ptitle', { style: { fontSize: 'clamp(30px,8vw,52px)' } }, D.GENRE_LABEL[g] ?? g),
    h('p.psub', {}, `${D.LIBRARY.filter((e) => e.genres.includes(g)).length} davon stehen schon in deiner Sammlung.`)));
  return box;
}

function artRow(title, items) {
  if (!items?.length) return document.createTextNode('');
  return h('section', {}, sec(title, { count: items.length }),
    h('div.row-scroll.no-bar.row-art', {}, ...items.map((m) => foyer(m))));
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
    const item = tint(h('button.tl__i' + (i === shownIdx ? '.is-on' : '') + (done ? '.is-off' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(i === shownIdx),
      onclick: () => { state.detailSeason = i; refresh(); },
    }), s);
    item.append(
      h('span.tl__k', {}, labels[i], D.isReleased(s) ? (done ? icon('check', { size: 14, filled: true }) : null) : icon('clock', { size: 14 })),
      art(s),
      h('span.tl__t', {}, s.title),
      h('span.tl__m', {}, [s.episodes ? `${s.episodes} Folgen` : 'offen', D.seasonTag(s)].filter(Boolean).join(' · ')));
    tl.appendChild(item);
  });

  const valEl = h('span.step__v', {}, h('span', {}, String(entry.progress)), h('small', {}, ` / ${total || '?'}`));
  const setVal = (n) => {
    entry.progress = clamp(n, 0, total || 999);
    valEl.firstChild.textContent = String(entry.progress);
    valEl.classList.remove('grow'); void valEl.offsetWidth; valEl.classList.add('grow');
  };

  const page = tint(h('div.screen', {}), cur);
  page.append(
    h('div.hero', {},
      D.entryBanner(entry) ? h('div.hero__bg', {}, h('img', { src: D.entryBanner(entry), alt: '' })) : null,
      h('div.hero__in', {},
        h('span.glowbox', { style: { display: 'block' } }, art(cur)),
        h('div', { style: { minWidth: 0 } },
          mark(entry.status, SCENE[entry.status]),
          h('h1.hero__t', { style: { marginTop: '8px' } }, D.entryTitle(entry)),
          h('p.hero__m', {}, [cur?.studio, D.seasonTag(cur), cur?.episodes ? `${cur.episodes} Folgen` : null, cur?.score ? `${cur.score} %` : null].filter(Boolean).join(' · '))))),

    h('div.stack--lg', { class: 'stack', style: { paddingTop: '20px' } },
      h('div.acts', {},
        pill('Weiter sehen', { variant: 'go', ico: 'play', filled: true, onClick: () => { D.setStatus(entry.rootId, 'watching'); toast('Vorhang auf'); refresh(); } }),
        pill('Bühne wechseln', { variant: 'quiet', ico: 'layers', onClick: () => openStatus(entry) }),
        circ('trash', 'Entfernen', { onClick: () => openRemove(entry) })),

      h('section', {},
        sec('Fortschritt'),
        h('div.card.fx.fw', { style: { gap: '20px' } },
          h('div.step', {},
            h('button.step__b', { type: 'button', 'aria-label': 'Eine Folge zurück', onclick: () => setVal(entry.progress - 1) }, icon('minus', { size: 19 })),
            valEl,
            h('button.step__b', { type: 'button', 'aria-label': 'Eine Folge weiter', onclick: () => setVal(entry.progress + 1) }, icon('plus', { size: 19 }))),
          h('div', {},
            h('div.row__t', {}, `Staffel ${D.seasonNo(entry)} von ${seasons.length}`),
            h('div.row__s', {}, `${D.watchedEpisodes(entry)} Folgen insgesamt · ${Math.round(D.watchedEpisodes(entry) * D.meanDuration(entry) / 60)} Stunden`)),
          h('div.push.hide-s', {}, arc(D.seasonPct(entry), 56)))),

      h('section', {},
        sec('Zeitstrahl', { count: seasons.length }),
        tl,
        h('div.two', {}, seasonFacts(shown, labels[shownIdx]), franchiseBox(facts))),

      h('section', {},
        sec('Inhalt'),
        h('p.dim', { style: { fontSize: '15px', lineHeight: '1.65' } }, shown?.synopsis || 'Keine Beschreibung hinterlegt.')),

      artRow('Vielleicht auch', D.DETAIL_EXTRAS.recommendations)));
  return page;
}

function seasonFacts(s, label) {
  if (!s) return document.createTextNode('');
  return h('div.card', {},
    h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '10px' } }, `Diese ${label ?? 'Staffel'}`),
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
  return h('div.card', {},
    h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '10px' } }, 'Ganzes Franchise'),
    h('div.facts', {},
      fact('Teile', `${f.parts} · ${f.released} erschienen, ${f.upcoming} offen`),
      fact('Folgen gesamt', String(f.episodes)),
      fact('Laufzeit gesamt', `${f.hours} Stunden`),
      fact('Zeitraum', f.span),
      fact('Ø Wertung', f.score ? `${f.score} %` : '—'),
      fact('Studios', f.studios.join(', ') || '—'),
      fact('Genres', f.genres.join(', ') || '—')));
}

function fact(k, v) { return h('div.fact', {}, h('b', {}, k), h('span', {}, v)); }

function openStatus(entry) {
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  scrim.appendChild(h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bühne wechseln' },
    h('h3', {}, 'Wohin damit?'),
    h('p', {}, D.entryTitle(entry)),
    h('div.stack--sm', { class: 'stack', style: { marginTop: '16px' } },
      ...D.STATUS_ORDER.map((s) => h('button.pill' + (entry.status === s ? '.pill--soft' : '.pill--quiet'), {
        type: 'button', style: { justifyContent: 'flex-start' },
        onclick: () => { D.setStatus(entry.rootId, s); scrim.remove(); toast(SCENE[s]); refresh(); },
      }, h('span', {}, SCENE[s])))),
    h('div.dialog__a', {}, pill('Abbrechen', { variant: 'quiet', onClick: () => scrim.remove() }))));
  document.body.appendChild(scrim);
  scrim.querySelector('button')?.focus();
}

function openRemove(entry) {
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) scrim.remove(); } });
  scrim.appendChild(h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Entfernen' },
    h('h3', {}, 'Aus der Sammlung nehmen?'),
    h('p', {}, `„${D.entryTitle(entry)}" verschwindet samt Fortschritt. Das lässt sich nicht rückgängig machen.`),
    h('div.dialog__a', {},
      pill('Behalten', { variant: 'quiet', onClick: () => scrim.remove() }),
      pill('Entfernen', { variant: 'warn', ico: 'trash', onClick: () => { D.removeEntry(entry.rootId); scrim.remove(); toast('Entfernt'); go('bibliothek'); refresh(); } }))));
  document.body.appendChild(scrim);
  scrim.querySelector('button')?.focus();
}

/* ============================================================== Verlauf ==== */

function screenStats() {
  const st = D.stats();
  const maxG = Math.max(...st.genres.map((g) => g.value), 1);
  const maxY = Math.max(...st.years.map((y) => y.value), 1);
  const totalStatus = st.perStatus.reduce((a, b) => a + b.count, 0) || 1;

  return h('div.screen.stack--lg', { class: 'stack' },
    h('div', {}, h('h1.ptitle', {}, 'Dein ', h('em', {}, 'Verlauf')), h('p.psub', {}, 'Was durch dein Wohnzimmer gelaufen ist.')),

    h('div.tiles', {},
      tile(num(st.episodes), 'Folgen gesehen'),
      tile(num(st.hours), 'Stunden'),
      tile(String(st.total), 'Titel'),
      tile(st.days >= 1 ? st.days.toFixed(1) : String(st.hours), st.days >= 1 ? 'Tage am Stück' : 'Stunden')),

    h('section', {},
      sec('Wo alles steht'),
      h('div.card', {},
        h('div', { style: { display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', gap: '2px' } },
          ...st.perStatus.filter((r) => r.count).map((r) => h('div', {
            title: `${SCENE[r.status]}: ${r.count}`,
            style: {
              width: `${(r.count / totalStatus) * 100}%`,
              background: { watching: 'var(--c)', nextup: '#86c8a4', planned: 'var(--raised-3)', continuation: '#8f8b96', completed: 'var(--ink-3)' }[r.status],
            },
          }))),
        h('div.fx.fw', { style: { marginTop: '16px', gap: '18px' } },
          ...st.perStatus.filter((r) => r.count).map((r) => h('span.fx', { style: { gap: '8px' } },
            h('i', { style: { width: '9px', height: '9px', borderRadius: '50%', display: 'block', background: { watching: 'var(--c)', nextup: '#86c8a4', planned: 'var(--raised-3)', continuation: '#8f8b96', completed: 'var(--ink-3)' }[r.status] } }),
            h('span.sm', {}, `${SCENE[r.status]} · ${r.count}`)))))),

    h('section', {},
      sec('Genres'),
      h('div.card.bars', { class: 'bars' }, ...st.genres.map((g) => h('div.bar', {},
        h('span.mut', {}, g.label),
        h('span.bar__t', {}, h('i.bar__f', { style: { width: `${(g.value / maxG) * 100}%`, display: 'block' } })),
        h('span.bar__n', {}, String(g.value)))))),

    h('section', {},
      sec('Nach Jahr'),
      h('div.card', {}, h('div.cols', {}, ...st.years.map((y) => h('div.col', {},
        h('div.col__b', { style: { height: `${(y.value / maxY) * 100}%` }, title: `${y.value}` }),
        h('div.col__l', {}, String(y.year).slice(2))))))),

    h('section', {},
      sec('Die dicken Brocken'),
      h('div.list', {}, ...st.longest.map((e) => {
        const row = tint(h('a.row', { href: '#/detail', onclick: openDetail(e) }), D.currentSeason(e));
        row.append(
          h('span.row__c', {}, art(D.currentSeason(e))),
          h('span.row__b', {}, h('span.row__t', {}, D.entryTitle(e)), h('span.row__s', {}, `${D.watchedEpisodes(e)} Folgen`)),
          h('span.row__n', {}, `${Math.round(D.watchedEpisodes(e) * D.meanDuration(e) / 60)} h`));
        return row;
      }))));
}

function tile(v, l) { return h('div.tile', {}, h('div.tile__v', {}, v), h('div.tile__l', {}, l)); }

/* =============================================================== Profil ==== */

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
    h('div', {}, h('h1.ptitle', {}, 'Profil'), h('p.psub', {}, 'Konto, Sprache, Sicherung.')),

    h('section', {}, sec('Konto'),
      h('div.card.fx', {},
        h('span.circ', { style: { width: '56px', height: '56px', background: 'var(--c-soft)', color: 'var(--c-text)' } }, icon('person', { size: 28, filled: true })),
        h('div', {},
          h('div.row__t', {}, D.PROFILE.name),
          h('div.row__s', {}, D.PROFILE.email),
          h('div.row__s', {}, `${D.PROFILE.since} · ${D.PROFILE.devices} Geräte · Sync ${D.PROFILE.lastSync}`)))),

    h('section', {}, sec('Sprache'),
      h('div.card', {},
        h('p.sm.mut', { style: { marginBottom: '12px' } }, 'Serientitel bleiben in beiden Sprachen international — AniList liefert keine deutschen Titel.'),
        langBox)),

    h('section', {}, sec('Anzeige'),
      h('div.card', {},
        h('div.fx', {},
          icon('film', { size: 22, filled: true, cls: 'mut' }),
          h('div.row__b', {}, h('div.row__t', {}, 'Originaltitel bevorzugen'), h('div.row__s', {}, 'Romaji statt internationalem Titel')),
          sw))),

    h('section', {}, sec('Sicherung'),
      h('div.card.fx.fw', {},
        pill('Exportieren', { variant: 'quiet', ico: 'down_tray', onClick: () => toast('Export erstellt (Entwurf)') }),
        pill('Importieren', { variant: 'quiet', ico: 'up_tray', onClick: () => toast('Import gestartet (Entwurf)') }),
        h('span.sm.mut', {}, 'Letzte Sicherung: heute, 08:14'))),

    h('section', {}, sec('Gefahrenzone'),
      h('div.danger', {},
        h('div.row__t', {}, 'Sammlung leeren'),
        h('p.sm.mut', { style: { margin: '6px 0 14px' } }, 'Löscht alle Einträge auf allen Geräten. Es gibt keinen Papierkorb.'),
        h('div.fx.fw', {},
          pill('Alles löschen', { variant: 'warn', ico: 'trash', onClick: () => openRemove(D.LIBRARY[0]) }),
          pill('Abmelden', { variant: 'quiet', ico: 'exit', onClick: () => toast('Abgemeldet (Entwurf)') })))));
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
    results.appendChild(h('p.sm.mut', { style: { margin: '8px 0 14px' } }, term ? `${hits.length} Treffer` : 'Zuletzt gesucht'));
    if (!hits.length) { results.appendChild(empty('Nichts gefunden', 'Anderer Begriff?')); return; }
    const grid = h('div.grid-art');
    for (const m of hits) grid.appendChild(foyerWithAdd(m, close));
    results.appendChild(grid);
  };
  input.addEventListener('input', () => draw(input.value));
  draw('');

  scrim.appendChild(h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Suche' },
    h('div.find__in', {}, icon('find', { size: 22, cls: 'mut' }), input,
      h('button.circ.circ--sm', { type: 'button', 'aria-label': 'Schließen', onclick: close }, icon('x', { size: 17 }))),
    results));
  document.body.appendChild(scrim);
  input.focus();
}

function foyerWithAdd(m, close) {
  const box = tint(h('div.poster', {}), m);
  const inLib = D.entryForMedia(m.id);
  box.append(
    h('span.glowbox', { style: { display: 'block' } }, art(m)),
    h('span.poster__t', { style: { display: 'block' } }, m.title),
    h('span.poster__m', {}, [D.FORMAT_LABEL[m.format], D.seasonTag(m), m.studio].filter(Boolean).join(' · ')),
    h('div', { style: { marginTop: '10px' } },
      inLib ? pill('Schon dabei', { variant: 'quiet', ico: 'check', sm: true, disabled: true })
        : pill('Aufnehmen', { variant: 'go', ico: 'plus', sm: true, onClick: () => { close?.(); openAdd(m); } })));
  return box;
}

/**
 * Aufnahme-Flow. Beim Durchklicken durch den Zeitstrahl stehen unten die
 * Angaben DIESER Staffel und daneben die des GANZEN Franchise — genau wie
 * im `AddPanel` der echten App.
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
      { key: 'watching', label: 'Schaue ich gerade' },
      { key: 'completed', label: 'Habe ich geschaut' },
      { key: 'planned', label: 'Nur vormerken' },
    ], mode, (k) => { mode = k; render(); }));

    body.appendChild(h('p.psub', { style: { marginBottom: '14px' } }, {
      watching: 'Bei welcher Staffel bist du — und bei welcher Folge?',
      completed: 'Bis wohin hast du geschaut? Mit „Abschneiden ab" nimmst du alles heraus, was gar nicht zum Eintrag gehören soll.',
      planned: 'Der ganze Zeitstrahl landet im Foyer.',
    }[mode]));

    if (mode === 'completed' && cutoff !== null) {
      body.appendChild(h('div.fx', { style: { marginBottom: '12px' } },
        h('span.mark.mark--dark', {}, h('i'), `abgeschnitten ab ${labels[cutoff]}`),
        pill('Zurücknehmen', { variant: 'quiet', sm: true, onClick: () => { cutoff = null; render(); } })));
    }

    const tl = h('div.tl');
    seasons.forEach((s, i) => {
      const released = D.isReleased(s);
      const excluded = cutoff !== null && i > cutoff;
      const selected = mode === 'completed' ? i <= pick && !excluded : i === pick;
      const item = tint(h('button.tl__i' + (selected ? '.is-on' : '') + (excluded || (!released && mode !== 'planned') ? '.is-off' : ''), {
        type: 'button',
        disabled: (!released && mode !== 'planned') || excluded || null,
        onclick: () => { pick = i; episode = 1; render(); },
      }), s);
      item.append(
        h('span.tl__k', {}, labels[i], released ? (selected ? icon('check', { size: 14, filled: true }) : null) : icon('clock', { size: 14 })),
        art(s),
        h('span.tl__t', {}, s.title),
        h('span.tl__m', {}, [s.episodes ? `${s.episodes} Folgen` : 'offen', D.seasonTag(s)].filter(Boolean).join(' · ')));
      tl.appendChild(item);
    });
    body.appendChild(tl);

    if (mode === 'completed') {
      body.appendChild(h('div.fx.fw', { style: { gap: '8px', marginBottom: '16px' } },
        h('span.sm.mut', {}, 'Abschneiden ab:'),
        ...seasons.map((s, i) => pill(labels[i], { variant: 'quiet', sm: true, onClick: () => { cutoff = i; if (pick > i) pick = i; render(); } }))));
    }

    if (mode === 'watching') {
      const max = seasons[pick]?.episodes ?? null;
      const val = h('span.step__v', {}, h('span', {}, String(episode)), h('small', {}, ` / ${max ?? '?'}`));
      body.appendChild(h('div', { style: { margin: '16px 0' } },
        h('p.sm.mut', { style: { marginBottom: '10px' } }, 'Bei welcher Folge?'),
        h('div.step', {},
          h('button.step__b', { type: 'button', 'aria-label': 'Weniger', onclick: () => { episode = Math.max(1, episode - 1); val.firstChild.textContent = String(episode); } }, icon('minus', { size: 18 })),
          val,
          h('button.step__b', { type: 'button', 'aria-label': 'Mehr', onclick: () => { episode = max ? Math.min(max, episode + 1) : episode + 1; val.firstChild.textContent = String(episode); } }, icon('plus', { size: 18 })))));
    }

    body.appendChild(h('div.two', { style: { marginTop: '16px' } },
      seasonFacts(seasons[pick], labels[pick]),
      franchiseBox(facts)));

    foot.append(
      pill('Aufnehmen', {
        variant: 'go', ico: 'check',
        onClick: () => {
          const cut = cutoff !== null ? seasons.slice(0, cutoff + 1) : seasons;
          let entry;
          if (mode === 'planned') entry = D.addFranchise({ seasons: cut, status: 'planned' });
          else if (mode === 'completed') entry = D.addFranchise({ seasons: cut, status: 'watching', watchedThrough: pick + 1, currentEpisode: cut[Math.min(pick, cut.length - 1)]?.episodes ?? 0 });
          else entry = D.addFranchise({ seasons: cut, status: 'watching', watchedThrough: pick, currentEpisode: episode });
          scrim.remove();
          toast(`${seasons[0].title} → ${SCENE[entry.status]}`);
          refresh();
        },
      }),
      pill('Abbrechen', { variant: 'quiet', onClick: () => scrim.remove() }),
      h('span.sm.mut.push.hide-s', {}, `${facts.parts} Teile · ${facts.episodes} Folgen · ${facts.hours} Std`));
  };

  const sheet = tint(h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Aufnehmen' }), media);
  sheet.append(
    h('div.sheet__h', {},
      h('span', {}, 'In die Sammlung'),
      h('button.circ.circ--sm.push', { type: 'button', 'aria-label': 'Schließen', onclick: () => scrim.remove() }, icon('x', { size: 17 }))),
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
    }, iconPair(n.ico, { size: 26, active: n.key === active }), h('span.tabbar__l', {}, n.label))));
}

function rail(active) {
  return h('aside.rail', {},
    h('div.rail__brand', {},
      h('img', { src: '/assets/logo.png', alt: '', width: 32, height: 32, style: { borderRadius: '9px' } }),
      h('div', {},
        h('div.brand__w', {}, 'Tsugi'),
        /* つぎ genau EINMAL: als Signatur unter dem Namen. */
        h('div.kana', { title: 'つぎ — als Nächstes' }, 'つぎ'))),
    h('button.findbtn', { type: 'button', onclick: openFind },
      icon('find', { size: 20 }), h('span', {}, 'Suchen'), h('kbd', {}, 'Strg K')),
    h('div', { style: { height: '14px' } }),
    ...NAV.map((n) => h('a.rail__i' + (n.key === active ? '.is-on' : ''), {
      href: `#/${n.key}`, 'aria-current': n.key === active ? 'page' : null,
    }, iconPair(n.ico, { size: 23, active: n.key === active }), h('span', {}, n.label))),
    h('div.rail__foot', {},
      h('a.sm.mut', { href: '/index.html' }, '← Showroom'),
      h('p.sm.mut', { style: { marginTop: '6px' } }, 'V3 „Bühne" — Entwurf, keine echten Daten.')));
}

function head(active) {
  const t = NAV.find((n) => n.key === active)?.label ?? 'Tsugi';
  return h('header.topbar', {},
    active === 'home'
      ? h('span.brand', {}, h('img', { src: '/assets/logo.png', alt: 'Tsugi' }), h('span.brand__w', {}, 'Tsugi'))
      : h('a.circ.circ--sm', { href: '#/home', 'aria-label': 'Zurück' }, icon('left', { size: 18 })),
    h('span.topbar__title', {}, active === 'home' ? 'Tsugi' : t),
    h('button.circ.circ--sm', { type: 'button', 'aria-label': 'Suchen', onclick: openFind }, icon('find', { size: 18 })));
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
root.append(h('a.skip.pill.pill--go', { href: '#inhalt' }, 'Zum Inhalt springen'), shell);

startRouter({
  mount: wrap,
  fallback: 'home',
  onChange: (k) => {
    clear(headSlot).appendChild(head(k));
    shell.firstChild.replaceWith(rail(k));
    document.querySelector('.tabbar')?.remove();
    document.body.appendChild(tabbar(k));
    document.title = `Tsugi V3 „Bühne" — ${NAV.find((n) => n.key === k)?.label ?? k}`;
  },
});

window.addEventListener('scroll', () => {
  document.querySelector('.topbar')?.classList.toggle('is-stuck', window.scrollY > 40);
}, { passive: true });

setInterval(() => {
  for (const el of document.querySelectorAll('[data-airing]')) {
    el.textContent = D.countdownShort(Number(el.dataset.airing));
  }
}, 30000);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openFind(); }
});
