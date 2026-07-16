import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchAnime } from '@/api/anilist';
import { bestTitle, cover, FORMAT_LABEL, seasonLabel } from '@/api/types';
import { useLibrary } from '@/store/library';
import { useSearchOverlay } from './searchStore';
import { IconSearch, IconX } from './icons';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * Command-palette style search. `/` or Cmd/Ctrl+K opens it anywhere; results
 * navigate to the detail page. Keyboard: ↑/↓ to move, Enter to open, Esc closes.
 */
export function SearchOverlay() {
  const { isOpen, close } = useSearchOverlay();
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const debounced = useDebounced(term.trim(), 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const entries = useLibrary((s) => s.entries);

  const q = useQuery({
    queryKey: ['search', debounced],
    enabled: isOpen && debounced.length >= 2,
    queryFn: ({ signal }) => searchAnime(debounced, signal),
  });

  const results = q.data ?? [];

  useEffect(() => {
    if (isOpen) {
      setTerm('');
      setCursor(0);
      // Focus after the dialog paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => setCursor(0), [results.length]);

  if (!isOpen) return null;

  const go = (id: number) => {
    close();
    navigate(`/anime/${id}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === 'Enter' && results[cursor]) go(results[cursor].id);
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center bg-bg/80 p-4 pt-[12vh] backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Anime suchen"
        className="w-full max-w-xl overflow-hidden rounded-card border border-line bg-surface shadow-2xl"
        onKeyDown={onKey}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <IconSearch className="h-5 w-5 shrink-0 text-ink-dim" />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Anime oder Film suchen …"
            className="w-full bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-dim"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Suche schließen"
            className="rounded p-1 text-ink-dim transition-colors duration-150 hover:text-ink"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {debounced.length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-dim">
              Tippe mindestens zwei Zeichen.
            </p>
          ) : q.isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-14 w-full" />
              ))}
            </div>
          ) : q.isError ? (
            <p className="px-4 py-8 text-center text-sm text-ink-dim">
              Suche gerade nicht möglich — gleich nochmal versuchen.
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-dim">
              Nichts gefunden für „{debounced}“.
            </p>
          ) : (
            <ul>
              {results.map((m, i) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => go(m.id)}
                    onPointerEnter={() => setCursor(i)}
                    className={`flex w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors duration-100 ${
                      i === cursor ? 'bg-raised' : ''
                    }`}
                  >
                    <span className="h-14 w-10 shrink-0 overflow-hidden rounded bg-raised">
                      {cover(m) && (
                        <img src={cover(m)!} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {bestTitle(m)}
                      </span>
                      <span className="block text-xs text-ink-dim">
                        {[m.format ? FORMAT_LABEL[m.format] : null, seasonLabel(m)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {entries[m.id] && (
                      <span className="ml-auto shrink-0 rounded-full bg-jade-deep/40 px-2 py-0.5 text-[11px] font-medium text-jade">
                        im Archiv
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
