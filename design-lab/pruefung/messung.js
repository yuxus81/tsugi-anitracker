/**
 * Messskript für die Design-Entwürfe.
 *
 * Prüft je Bildschirm: waagerechtes Scrollen, Elemente unter der Tab-Bar,
 * Touchziel-Größe, und ob jedes Bedienelement per elementFromPoint wirklich
 * erreichbar ist. WICHTIG: Die Zahl der geprüften Elemente wird MITGEZÄHLT
 * und mitgemeldet — ein Prüfwerkzeug, das nichts anfasst, meldet sonst
 * fröhlich „alles gut".
 */
(() => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  const CTRL = 'button, a[href], input, select, textarea, [role="tab"], [role="switch"]';
  // Liegt ein Dialog über der Seite, zählt NUR sein Inhalt: alles dahinter ist
  // absichtlich verdeckt, und das als Befund zu melden wäre schlicht falsch.
  const modal = document.querySelector('.scrim [role="dialog"], [role="dialog"][aria-modal="true"]');
  const scope = modal ?? document;
  const controls = [...scope.querySelectorAll(CTRL)]
    .filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

  const bar = document.querySelector('.tabbar');
  const barTop = bar && getComputedStyle(bar).display !== 'none'
    ? bar.getBoundingClientRect().top : Infinity;

  const res = {
    viewport: `${vw}x${vh}`,
    scrollWidth: document.documentElement.scrollWidth,
    horizontalScroll: document.documentElement.scrollWidth > vw + 1,
    checkedControls: 0,      // <- Prüfanzahl, nicht optional
    checkedOverflow: 0,
    tooSmall: [],
    covered: [],
    underTabbar: [],
    overflowing: [],
    blurryTilt: [],
  };

  // 1) Waagerechtes Scrollen: jedes Element gegen die Fensterbreite.
  for (const el of document.querySelectorAll('body *')) {
    res.checkedOverflow++;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'fixed') continue;
    // Elemente in einem eigenen waagerechten Scroller dürfen breiter sein.
    // Ein Element darf breiter als das Fenster sein, wenn ein Vorfahr es
    // abschneidet oder scrollt (Poster-Reihe, Zeitleiste, Lichtschleier).
    // Die Ausnahme läuft BEWUSST nur bis body, nicht darüber hinaus.
    let p = el.parentElement, clipped = false, hops = 0;
    while (p && p !== document.body && hops++ < 14) {
      const pcs = getComputedStyle(p);
      if (['auto', 'scroll', 'hidden', 'clip'].includes(pcs.overflowX)) { clipped = true; break; }
      p = p.parentElement;
    }
    if (clipped) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
      res.overflowing.push(`${el.tagName}.${String(el.className.baseVal ?? el.className).slice(0, 34)} → ${Math.round(r.right)}`);
    }
  }

  // 2) Bedienelemente: Größe, Erreichbarkeit, Lage zur Tab-Bar.
  //    JEDES Element wird vorher in die Bildmitte gescrollt — sonst prüft
  //    elementFromPoint nur das, was zufällig gerade oben steht, und ein
  //    Werkzeug, das die Hälfte nicht anfasst, meldet trotzdem „alles gut".
  for (const el of controls) {
    res.checkedControls++;
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    const label = `${el.tagName}.${String(el.className.baseVal ?? el.className).slice(0, 30)}"${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22)}"`;

    // Fließtext-Links (display:inline) sind KEINE Touchziele im Sinne der
    // Regel — sie stehen mitten im Satz. Alles andere muss 44 px treffen.
    const inline = getComputedStyle(el).display === 'inline';
    if (!inline && (r.height < 43 || r.width < 32)) {
      // Manche Elemente bleiben optisch flach, ziehen ihr Trefferfeld aber
      // über ein Pseudoelement auf 44 px auf. Das zählt — also nachfassen:
      // trifft man das Element 20 px über und unter der Mitte immer noch?
      const mx = r.left + r.width / 2;
      const upper = document.elementFromPoint(mx, r.top + r.height / 2 - 20);
      const lower = document.elementFromPoint(mx, r.top + r.height / 2 + 20);
      const padded = upper && lower && el.contains(upper) === el.contains(lower) && (el === upper || el.contains(upper)) && (el === lower || el.contains(lower));
      if (!padded) res.tooSmall.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }

    // Erreichbarkeit prüfen — aber nur für das, was gerade WIRKLICH im
    // freien Sichtfeld liegt. Was unterhalb der Tab-Bar steht, ist nicht
    // „verdeckt", sondern schlicht noch nicht hochgescrollt.
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx >= 0 && cx <= vw && cy >= 0 && cy < Math.min(vh, barTop) - 1) {
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || (!el.contains(hit) && !hit.contains(el))) {
        res.covered.push(`${label} verdeckt von ${hit ? hit.tagName + '.' + String(hit.className.baseVal ?? hit.className).slice(0, 24) : 'nichts'}`);
      }
    }
  }

  // Ob am Ende der Seite noch etwas unter der Tab-Bar klemmt, entscheidet
  // NICHT die Scrollposition, sondern der untere Innenabstand des Inhalts.
  if (bar) {
    const barH = bar.getBoundingClientRect().height;
    const main = document.querySelector('.main');
    const padBottom = main ? parseFloat(getComputedStyle(main).paddingBottom) : 0;
    if (padBottom < barH + 6) {
      res.underTabbar.push(`Inhalt endet ${Math.round(padBottom)} px über dem Rand, Tab-Bar ist ${Math.round(barH)} px hoch`);
    }
  }

  // 3) Geneigte Flächen dürfen nicht unscharf werden:
  //    translateZ/will-change auf transformierten Elementen ist die bekannte Falle.
  for (const el of document.querySelectorAll('.tiltable, .fanned .art, .loaded, .tl__i, .art, .cover')) {
    const cs = getComputedStyle(el);
    if (cs.willChange !== 'auto' && cs.transform !== 'none') {
      res.blurryTilt.push(`${el.tagName}.${String(el.className).slice(0, 26)} will-change:${cs.willChange}`);
    }
  }

  res.ok = !res.horizontalScroll && !res.overflowing.length && !res.covered.length
    && !res.underTabbar.length && !res.tooSmall.length && !res.blurryTilt.length;
  return res;
})();
