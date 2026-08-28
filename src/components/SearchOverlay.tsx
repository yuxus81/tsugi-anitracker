import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchAnime } from '@/api/anilist';
import { useT } from '@/i18n';
import { useSearchOverlay } from './searchStore';
import { Btn, SectionHead } from './ui';
import { Icon } from './icons';
import { PosterCard } from './PosterCard';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Befehlspalette (V5 `.pal`). `/` oder ⌘/Ctrl+K öffnet; Esc schließt, Enter öffnet den ersten Treffer. */
export function SearchOverlay() {
  const { isOpen, close } = useSearchOverlay();
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term.trim(), 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const t = useT();

  const q = useQuery({
    queryKey: ['search', debounced],
    enabled: isOpen && debounced.length >= 2,
    queryFn: ({ signal }) => searchAnime(debounced, signal),
  });
  const results = q.data ?? [];

  useEffect(() => {
    if (isOpen) {
      setTerm('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && results[0]) {
      close();
      navigate(`/anime/${results[0].id}`);
    }
  };

  return createPortal(
    <>
      <div className="scrim" onPointerDown={close} />
      <div className="pal" role="dialog" aria-modal="true" aria-label={t('search')} onKeyDown={onKey}>
        <div className="pal__bar">
          <label className="pal__field">
            <Icon name="search" size={18} />
            <input
              ref={inputRef}
              className="pal__input"
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <Btn variant="quiet" sm onClick={close}>
            {t('cancel')}
          </Btn>
        </div>

        <div className="pal__list">
          {debounced.length < 2 ? (
            <p className="muted" style={{ padding: '26px 8px', textAlign: 'center' }}>
              {t('searchMinChars')}
            </p>
          ) : q.isLoading ? (
            <div className="grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skel" style={{ aspectRatio: '2 / 3', borderRadius: 'var(--r-2)' }} />
              ))}
            </div>
          ) : q.isError ? (
            <p className="muted" style={{ padding: '26px 8px', textAlign: 'center' }}>
              {t('searchError')}
            </p>
          ) : results.length === 0 ? (
            <p className="muted" style={{ padding: '26px 8px', textAlign: 'center' }}>
              {t('searchEmpty', { q: debounced })}
            </p>
          ) : (
            <>
              <SectionHead title={t('searchHits', { n: results.length })} tone="watching" />
              <div className="grid">
                {results.map((m) => (
                  <PosterCard key={m.id} media={m} onNavigate={close} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
