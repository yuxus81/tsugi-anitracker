import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { MediaDetail } from '@/api/types';
import { DetailPage } from '@/pages/DetailPage';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { entry, mediaCard, resetIds, season } from '@/test/factories';

/**
 * DIE DETAILSEITE.
 *
 * Sie ist der einzige Ort, an dem ein Franchise VOLLSTÄNDIG sichtbar wird —
 * mit allen Staffeln auf einem Zeitstrahl, mit Fortschritt, Wertung und dem
 * Weg wieder heraus (entfernen). Alles Gefährliche steht unten und allein.
 */

const { fetchDetail, fetchFranchise } = vi.hoisted(() => ({
  fetchDetail: vi.fn(),
  fetchFranchise: vi.fn(),
}));

vi.mock('@/api/anilist', async (orig) => ({
  ...(await orig<typeof import('@/api/anilist')>()),
  fetchDetail,
  fetchFranchise,
}));

function detail(over: Partial<MediaDetail> = {}): MediaDetail {
  return {
    ...mediaCard({ id: 1 }),
    bannerImage: 'https://example.test/banner.jpg',
    description: 'Ein Text über die Serie.',
    studios: { nodes: [{ name: 'Studio Test', isAnimationStudio: true }] },
    endDate: null,
    trailer: null,
    relations: { edges: [] },
    recommendations: { nodes: [] },
    ...over,
  } as MediaDetail;
}

function zeige(id = 1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/anime/${id}`]}>
        <Routes>
          <Route path="/anime/:id" element={<DetailPage />} />
          <Route path="/" element={<p>Start</p>} />
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
  fetchDetail.mockResolvedValue(detail());
  fetchFranchise.mockResolvedValue({ mainline: [mediaCard({ id: 1 })], extras: [] });
  lege();
});

describe('Kopf', () => {
  test('zeigt Titel und Eckdaten', async () => {
    zeige();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('English 1');
    // Season und Jahr stehen in der Kopfzeile — sie tauchen weiter unten in
    // den Fakten nochmal auf, deshalb hier gezielt der Kopf.
    expect(document.querySelector('.det__facts')).toHaveTextContent('2024');
  });

  test('bietet einen Weg zurück', async () => {
    zeige();

    expect(await screen.findByRole('button', { name: /zurück/i })).toBeInTheDocument();
  });

  test('meldet einen Netzfehler und bietet einen zweiten Versuch', async () => {
    fetchDetail.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    zeige();

    const nochmal = await screen.findByRole('button', { name: /erneut|nochmal/i });
    fetchDetail.mockResolvedValue(detail());
    await user.click(nochmal);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('English 1');
  });
});

describe('Noch nicht in der Bibliothek', () => {
  test('bietet an, den Titel aufzunehmen', async () => {
    zeige();

    expect(await screen.findByRole('button', { name: /hinzufügen/i })).toBeInTheDocument();
  });

  test('fragt beim Aufnehmen nach der Kategorie', async () => {
    const user = userEvent.setup();
    zeige();

    await user.click(await screen.findByRole('button', { name: /hinzufügen/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  test('die gewählte Kategorie landet wirklich im Archiv', async () => {
    const user = userEvent.setup();
    zeige();

    await user.click(await screen.findByRole('button', { name: /hinzufügen/i }));
    const watchlist = screen.getAllByRole('radio').find((r) => r.getAttribute('data-st') === 'planned');
    await user.click(watchlist!);

    await waitFor(() => {
      const e = Object.values(useLibrary.getState().entries)[0];
      expect(e?.status).toBe('planned');
    });
  });

  test('zeigt weder Fortschritt noch Wertung, solange nichts aufgenommen ist', async () => {
    zeige();
    await screen.findByRole('heading', { level: 1 });

    expect(screen.queryByRole('radiogroup', { name: /wertung/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
  });
});

describe('Schon in der Bibliothek', () => {
  function drin(over: Partial<LibraryEntry> = {}) {
    lege(
      entry({
        rootId: 1,
        status: 'watching',
        seasons: [season({ id: 1, title: 'English 1', episodes: 12 })],
        progress: 4,
        ...over,
      }),
    );
  }

  test('zeigt den Fortschritt der laufenden Staffel', async () => {
    drin();
    zeige();

    expect(await screen.findByTestId('progress')).toHaveTextContent('4');
    expect(screen.getByTestId('progress')).toHaveTextContent('12');
  });

  test('eine Episode weiter zählt hoch', async () => {
    drin();
    const user = userEvent.setup();
    zeige();

    await user.click(await screen.findByRole('button', { name: /eine .* weiter/i }));

    expect(useLibrary.getState().entries[1].progress).toBe(5);
  });

  test('die Wertung lässt sich setzen', async () => {
    drin();
    const user = userEvent.setup();
    zeige();

    const pips = await screen.findByRole('radiogroup', { name: /wertung/i });
    await user.click(within(pips).getAllByRole('radio')[7]);

    expect(useLibrary.getState().entries[1].rating).toBe(8);
  });

  test('der Status lässt sich wechseln', async () => {
    drin();
    const user = userEvent.setup();
    zeige();

    await user.click(await screen.findByRole('button', { name: /status ändern/i }));
    const fertig = screen.getAllByRole('radio').find((r) => r.getAttribute('data-st') === 'completed');
    await user.click(fertig!);

    await waitFor(() => expect(useLibrary.getState().entries[1].status).toBe('completed'));
  });

  test('entfernen fragt zurück, bevor etwas verschwindet', async () => {
    drin();
    const user = userEvent.setup();
    zeige();

    await user.click(await screen.findByRole('button', { name: /entfernen/i }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(useLibrary.getState().entries[1]).toBeDefined();
  });

  test('erst die Bestätigung entfernt wirklich', async () => {
    drin();
    const user = userEvent.setup();
    zeige();

    await user.click(await screen.findByRole('button', { name: /entfernen/i }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /entfernen|ja/i }));

    await waitFor(() => expect(useLibrary.getState().entries[1]).toBeUndefined());
  });
});

describe('Franchise-Zeitstrahl', () => {
  test('zeigt jede Staffel der Hauptlinie', async () => {
    fetchFranchise.mockResolvedValue({
      mainline: [mediaCard({ id: 1 }), mediaCard({ id: 2 }), mediaCard({ id: 3 })],
      extras: [],
    });
    zeige();

    const strahl = await screen.findByTestId('timeline');
    expect(within(strahl).getAllByRole('listitem')).toHaveLength(3);
  });

  test('markiert, wo man gerade ist', async () => {
    fetchFranchise.mockResolvedValue({
      mainline: [mediaCard({ id: 1 }), mediaCard({ id: 2 })],
      extras: [],
    });
    zeige();

    const strahl = await screen.findByTestId('timeline');
    expect(within(strahl).getByTestId('line-1')).toHaveClass('is-here');
    expect(within(strahl).getByTestId('line-2')).not.toHaveClass('is-here');
  });

  test('bei einer einzigen Staffel lohnt der Zeitstrahl nicht', async () => {
    zeige();
    await screen.findByRole('heading', { level: 1 });

    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
  });

  test('eine andere Staffel führt auf ihre eigene Seite', async () => {
    fetchFranchise.mockResolvedValue({
      mainline: [mediaCard({ id: 1 }), mediaCard({ id: 2 })],
      extras: [],
    });
    zeige();

    const strahl = await screen.findByTestId('timeline');
    expect(within(strahl).getByTestId('line-2').querySelector('a')).toHaveAttribute(
      'href',
      '/anime/2',
    );
  });
});

describe('Fakten und Text', () => {
  test('nennt Studio, Laufzeit und Ausstrahlungsstand', async () => {
    zeige();

    const fakten = await screen.findByTestId('facts');
    expect(fakten).toHaveTextContent('Studio Test');
    expect(fakten).toHaveTextContent('24');
  });

  test('zeigt die Inhaltsangabe ohne HTML-Reste', async () => {
    fetchDetail.mockResolvedValue(detail({ description: 'Erste Zeile.<br>Zweite <i>Zeile</i>.' }));
    zeige();

    const text = await screen.findByTestId('synopsis');
    expect(text.textContent).not.toMatch(/<|>/);
    expect(text).toHaveTextContent('Zweite Zeile.');
  });
});
