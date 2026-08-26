import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SearchOverlay } from '@/components/SearchOverlay';
import { useSearchOverlay } from '@/components/searchStore';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { entry, mediaCard, resetIds, season } from '@/test/factories';

/**
 * DIE BEFEHLSPALETTE.
 *
 * `/` oder Strg/Cmd+K öffnet sie überall. Sie ist der einzige Weg, neue
 * Titel in die Bibliothek zu bekommen — entsprechend muss sie mit der
 * Tastatur allein vollständig bedienbar sein.
 */

const { searchAnime } = vi.hoisted(() => ({ searchAnime: vi.fn() }));

vi.mock('@/api/anilist', async (orig) => ({
  ...(await orig<typeof import('@/api/anilist')>()),
  searchAnime,
}));

function zeige() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <SearchOverlay />
        <Routes>
          <Route path="/" element={<p>Start</p>} />
          <Route path="/anime/:id" element={<p>Detailseite</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function lege(...eintraege: LibraryEntry[]) {
  useLibrary.setState({
    entries: Object.fromEntries(eintraege.map((e) => [e.rootId, e])),
    hydrated: true,
  });
}

beforeEach(() => {
  resetIds();
  vi.clearAllMocks();
  searchAnime.mockResolvedValue([mediaCard({ id: 11 }), mediaCard({ id: 12 })]);
  lege();
  useSearchOverlay.setState({ isOpen: true });
});

describe('Öffnen und Schließen', () => {
  test('zeigt sich nur, wenn sie geöffnet wurde', () => {
    useSearchOverlay.setState({ isOpen: false });
    zeige();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('nimmt den Fokus, damit man sofort tippen kann', async () => {
    zeige();

    await waitFor(() => expect(screen.getByRole('searchbox')).toHaveFocus());
  });

  test('Escape schließt', async () => {
    const user = userEvent.setup();
    zeige();

    await user.keyboard('{Escape}');

    expect(useSearchOverlay.getState().isOpen).toBe(false);
  });

  test('ein Klick auf die Fläche daneben schließt', async () => {
    const user = userEvent.setup();
    zeige();

    await user.click(document.querySelector('.scrim')!);

    expect(useSearchOverlay.getState().isOpen).toBe(false);
  });
});

describe('Suchen', () => {
  test('fragt erst ab zwei Zeichen — ein Buchstabe trifft alles', async () => {
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'a');

    // Wartezeit abgelaufen lassen, dann darf trotzdem nichts geschickt sein.
    await new Promise((r) => setTimeout(r, 400));
    expect(searchAnime).not.toHaveBeenCalled();
  });

  test('zeigt Treffer als Katalog-Karten', async () => {
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'frieren');

    expect(await screen.findByText('English 11')).toBeInTheDocument();
    expect(screen.getByText('English 12')).toBeInTheDocument();
  });

  test('sagt es, wenn nichts gefunden wurde — und was gesucht wurde', async () => {
    searchAnime.mockResolvedValue([]);
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'gibtsnicht');

    expect(await screen.findByText(/gibtsnicht/)).toBeInTheDocument();
  });

  test('meldet einen Netzfehler, statt leer dazustehen', async () => {
    searchAnime.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'frieren');

    expect(await screen.findByText(/fehlgeschlagen|fehler|nicht/i)).toBeInTheDocument();
  });
});

describe('Mit der Tastatur allein', () => {
  test('Enter öffnet den ersten Treffer', async () => {
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'frieren');
    await screen.findByText('English 11');
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Detailseite')).toBeInTheDocument();
    expect(useSearchOverlay.getState().isOpen).toBe(false);
  });

  test('Pfeil runter wandert zum nächsten Treffer', async () => {
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'frieren');
    await screen.findByText('English 11');
    await user.keyboard('{ArrowDown}');

    expect(screen.getByTestId('hit-12')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('hit-11')).toHaveAttribute('aria-selected', 'false');
  });

  test('Pfeil hoch am Anfang bleibt am Anfang stehen', async () => {
    // Kein Umlaufen: sonst springt man vom ersten Treffer ans Listenende,
    // was bei 14 Treffern wie ein Fehler aussieht.
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'frieren');
    await screen.findByText('English 11');
    await user.keyboard('{ArrowUp}');

    expect(screen.getByTestId('hit-11')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Was schon im Archiv liegt', () => {
  test('ist als solches markiert', async () => {
    lege(entry({ rootId: 11, status: 'watching', seasons: [season({ id: 11 })] }));
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByRole('searchbox'), 'frieren');
    await screen.findByText('English 11');

    expect(screen.getByTestId('hit-11')).toHaveTextContent(/archiv/i);
  });
});
