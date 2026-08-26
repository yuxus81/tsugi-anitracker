import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DiscoverData, GenreData } from '@/api/anilist';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { useLibrary } from '@/store/library';
import { mediaCard, resetIds } from '@/test/factories';

/**
 * ENTDECKEN — der Katalog.
 *
 * Alles hier gehört (noch) nicht dem Nutzer. Deshalb tragen die Karten die
 * einheitliche Katalog-Bauform: keine eigenen Bewegungen, keine
 * Spoiler-Marken. Nur die Genre-Leiste färbt den Bildschirm — das ist die
 * V5-Art, „du bist gerade im Fantasy-Regal" zu sagen.
 */

const { fetchDiscover, fetchGenre } = vi.hoisted(() => ({
  fetchDiscover: vi.fn(),
  fetchGenre: vi.fn(),
}));

vi.mock('@/api/anilist', async (orig) => ({
  ...(await orig<typeof import('@/api/anilist')>()),
  fetchDiscover,
  fetchGenre,
}));

function seite(media: ReturnType<typeof mediaCard>[]) {
  return { pageInfo: { hasNextPage: false }, media };
}

function katalog(over: Partial<DiscoverData> = {}): DiscoverData {
  return {
    trending: seite([mediaCard({ id: 1 }), mediaCard({ id: 2 })]),
    season: seite([mediaCard({ id: 3 })]),
    upcoming: seite([mediaCard({ id: 4 })]),
    top: seite([mediaCard({ id: 5 })]),
    movies: seite([mediaCard({ id: 6, format: 'MOVIE' })]),
    ...over,
  } as DiscoverData;
}

function genreDaten(): GenreData {
  return {
    popular: seite([mediaCard({ id: 20 })]),
    best: seite([mediaCard({ id: 21 })]),
    fresh: seite([mediaCard({ id: 22 })]),
  } as GenreData;
}

function zeige() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetIds();
  vi.clearAllMocks();
  fetchDiscover.mockResolvedValue(katalog());
  fetchGenre.mockResolvedValue(genreDaten());
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: true });
});

describe('Bühne', () => {
  test('stellt den meistbesprochenen Titel groß heraus', async () => {
    zeige();

    const spot = await screen.findByTestId('spotlight');
    expect(within(spot).getByRole('link', { name: /English 1/ })).toHaveAttribute(
      'href',
      '/anime/1',
    );
  });

  test('der herausgestellte Titel steht nicht zusätzlich in der Reihe darunter', async () => {
    // Sonst sähe man denselben Titel zweimal direkt untereinander.
    zeige();
    await screen.findByTestId('spotlight');

    expect(screen.getAllByRole('link', { name: /English 1/ })).toHaveLength(1);
  });
});

describe('Regale', () => {
  test('zeigt alle fünf Reihen des Katalogs', async () => {
    zeige();

    await screen.findByTestId('spotlight');
    for (const titel of [
      /im trend/i,
      /diese season/i,
      /nächste season/i,
      /bestbewertet/i,
      /filme/i,
    ]) {
      expect(screen.getByRole('heading', { name: titel })).toBeInTheDocument();
    }
  });

  test('eine leere Reihe wird gar nicht erst gezeigt', async () => {
    fetchDiscover.mockResolvedValue(katalog({ movies: seite([]) }));
    zeige();

    await screen.findByTestId('spotlight');
    expect(screen.queryByRole('heading', { name: /filme/i })).not.toBeInTheDocument();
  });
});

describe('Genre-Filter', () => {
  test('bietet Genres zum Filtern an, nicht als Tabs', async () => {
    // Es sind Schalter, keine Tabs: es gibt kein zugehöriges Panel, und
    // Pfeiltasten-Navigation gibt es auch nicht.
    zeige();
    await screen.findByTestId('spotlight');

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /genre/i })).toBeInTheDocument();
  });

  test('ein Genre lädt die Genre-Reihen nach', async () => {
    const user = userEvent.setup();
    zeige();
    await screen.findByTestId('spotlight');

    await user.click(screen.getByRole('button', { name: 'Fantasy' }));

    await waitFor(() => expect(fetchGenre).toHaveBeenCalledWith('Fantasy', expect.anything()));
    expect(await screen.findByRole('heading', { name: /beliebt/i })).toBeInTheDocument();
  });

  test('dasselbe Genre nochmal angetippt schaltet zurück auf alles', async () => {
    const user = userEvent.setup();
    zeige();
    await screen.findByTestId('spotlight');

    await user.click(screen.getByRole('button', { name: 'Fantasy' }));
    await screen.findByRole('heading', { name: /beliebt/i });
    await user.click(screen.getByRole('button', { name: 'Fantasy' }));

    expect(await screen.findByTestId('spotlight')).toBeInTheDocument();
  });

  test('das aktive Genre ist auch ohne Farbe erkennbar', async () => {
    const user = userEvent.setup();
    zeige();
    await screen.findByTestId('spotlight');

    await user.click(screen.getByRole('button', { name: 'Fantasy' }));

    expect(screen.getByRole('button', { name: 'Fantasy' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('„Alles" ist der Weg zurück', async () => {
    const user = userEvent.setup();
    zeige();
    await screen.findByTestId('spotlight');

    await user.click(screen.getByRole('button', { name: 'Drama' }));
    await screen.findByRole('heading', { name: /beliebt/i });
    await user.click(screen.getByRole('button', { name: /^alles$/i }));

    expect(await screen.findByTestId('spotlight')).toBeInTheDocument();
  });
});

describe('Wenn das Netz nicht mitspielt', () => {
  test('sagt es und bietet einen zweiten Versuch an', async () => {
    fetchDiscover.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    zeige();

    const nochmal = await screen.findByRole('button', { name: /erneut|nochmal/i });
    fetchDiscover.mockResolvedValue(katalog());
    await user.click(nochmal);

    expect(await screen.findByTestId('spotlight')).toBeInTheDocument();
  });
});
