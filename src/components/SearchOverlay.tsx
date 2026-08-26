import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchAnime } from '@/api/anilist';
import { bestTitle, cover, formatLabel, seasonLabel } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Button, SectionHead } from '@/components/kit';
import { findEntryFor, useLibrary } from '@/store/library';
import { useSettings, useT } from '@/i18n';
import { useEscape } from '@/components/overlays';
import { useSearchOverlay } from './searchStore';

/**
 * DIE BEFEHLSPALETTE.
 *
 * `/` oder Strg/Cmd+K öffnet sie überall. Sie ist der einzige Weg, neue
 * Titel in die Bibliothek zu bekommen — deshalb muss sie mit der Tastatur
 * ALLEIN vollständig bedienbar sein: tippen, ↑/↓, Enter, Escape.
 *
 * Sie liegt bewusst oben am Rand und nicht mittig: auf dem Handy steht sie
 * damit direkt unter der Tastatur-freien Fläche, und die Trefferliste wächst
 * nach unten weg, statt sich um die Mitte herum zu verschieben.
 */

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function SearchOverlay() {
  const { isOpen, close } = useSearchOverlay();
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const gewartet = useDebounced(term.trim(), 300);
  const feld = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const entries = useLibrary((s) => s.entries);
  const t = useT();
  const lang = useSettings((s) => s.lang);

  const q = useQuery({
    queryKey: ['search', gewartet],
    // Ab zwei Zeichen: ein einzelner Buchstabe trifft praktisch alles und
    // kostet nur einen Rundlauf.
    enabled: isOpen && gewartet.length >= 2,
    queryFn: ({ signal }) => searchAnime(gewartet, signal),
  });

  const treffer = q.data ?? [];

  // Escape schließt immer — auch wenn der Fokus die Palette verlassen hat.
  useEscape(close);

  useEffect(() => {
    if (!isOpen) return;
    setTerm('');
    setCursor(0);
    // Erst nach dem Zeichnen — vorher gibt es das Feld noch nicht.
    const id = requestAnimationFrame(() => feld.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => setCursor(0), [treffer.length]);

  // Der Inhalt dahinter darf nicht mitscrollen, solange die Palette liegt.
  useEffect(() => {
    if (!isOpen) return;
    const wurzel = document.documentElement;
    const vorher = Number(wurzel.dataset.sheetOpen ?? '0');
    wurzel.dataset.sheetOpen = String(vorher + 1);
    return () => {
      const jetzt = Number(wurzel.dataset.sheetOpen ?? '1') - 1;
      if (jetzt > 0) wurzel.dataset.sheetOpen = String(jetzt);
      else delete wurzel.dataset.sheetOpen;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const oeffne = (id: number) => {
    close();
    navigate(`/anime/${id}`);
  };

  // Pfeile und Enter gelten nur im Feld — Escape dagegen überall, siehe
  // `useEscape` weiter oben in der Komponente.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Kein Umlaufen: vom ersten Treffer ans Listenende zu springen sieht
      // bei vielen Treffern wie ein Fehler aus.
      setCursor((c) => Math.min(c + 1, treffer.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === 'Enter' && treffer[cursor]) oeffne(treffer[cursor].id);
  };

  return createPortal(
    <>
      <div className="scrim" onClick={close} />
      <div className="pal" role="dialog" aria-modal="true" aria-label={t('search')} onKeyDown={onKey}>
        <div className="pal__bar">
          <label className="pal__field">
            <Icon name="search" size={18} />
            <input
              ref={feld}
              type="search"
              className="pal__input"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <Button variant="quiet" size="sm" onClick={close}>
            {t('cancel')}
          </Button>
        </div>

        <div className="pal__list">
          {gewartet.length < 2 ? (
            <p className="muted pal__note">{t('searchMinChars')}</p>
          ) : q.isLoading ? (
            <div className="grid" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="skel skel--poster" />
                  <div className="skel skel--line" />
                </div>
              ))}
            </div>
          ) : q.isError ? (
            <p className="muted pal__note">{t('searchError')}</p>
          ) : treffer.length === 0 ? (
            <p className="muted pal__note">{t('searchEmpty', { q: gewartet })}</p>
          ) : (
            <>
              <SectionHead title={t('searchHits', { n: treffer.length })} />
              <ul className="grid" role="listbox" aria-label={t('search')}>
                {treffer.map((m, i) => {
                  const drin = findEntryFor(entries, m.id);
                  return (
                    <li
                      key={m.id}
                      role="option"
                      aria-selected={i === cursor}
                      data-testid={`hit-${m.id}`}
                      className={`palhit${i === cursor ? ' is-on' : ''}`}
                      data-st={drin?.status ?? 'watching'}
                      onPointerEnter={() => setCursor(i)}
                    >
                      <button type="button" className="card card--uniform" onClick={() => oeffne(m.id)}>
                        <span className="card__art">
                          {cover(m) && <img src={cover(m)!} alt="" loading="lazy" />}
                          {drin && <span className="palhit__mark">{t('inArchive')}</span>}
                        </span>
                        <span className="card__meta">
                          <span className="card__title">{bestTitle(m)}</span>
                          <span className="card__sub">
                            {[m.format ? formatLabel(m.format, lang) : null, seasonLabel(m, lang)]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
