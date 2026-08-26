import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { HomePage } from '@/pages/HomePage';
import { useLibrary, type LibraryEntry, type WatchStatus } from '@/store/library';
import { useSearchOverlay } from '@/components/searchStore';
import { entry, resetIds, season } from '@/test/factories';

/**
 * Integrationstest der Startseite: echter Store, echte Karten, nur die
 * Netzwerkschicht ist gefälscht. Geprüft wird, was der Nutzer sieht und
 * anfassen kann — nicht, wie es intern zusammengesetzt ist.
 */

vi.mock('@/api/anilist', async (orig) => ({
  ...(await orig<typeof import('@/api/anilist')>()),
  fetchManyByIds: vi.fn(async () => []),
}));

function zeige() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
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

let id = 100;
function mach(status: WatchStatus, titel: string, over: Partial<LibraryEntry> = {}): LibraryEntry {
  id += 1;
  return entry({
    rootId: id,
    status,
    seasons: [season({ id, title: titel, episodes: 12 })],
    ...over,
  });
}

beforeEach(() => {
  resetIds();
  id = 100;
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: true, username: 'Yunus' });
  useSearchOverlay.setState({ isOpen: false });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Begrüßung', () => {
  test('grüßt abends anders als morgens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 26, 8, 0));
    const morgens = zeige().container.textContent ?? '';

    vi.setSystemTime(new Date(2026, 7, 26, 21, 0));
    const abends = zeige().container.textContent ?? '';

    expect(morgens.slice(0, 40)).not.toBe(abends.slice(0, 40));
  });
});

describe('Leere Bibliothek', () => {
  test('sagt, dass noch nichts da ist, und bietet einen Weg an', () => {
    lege();
    zeige();

    expect(screen.getByRole('button', { name: /such/i })).toBeInTheDocument();
  });

  test('zeigt keine leere Frontplatte', () => {
    lege();
    const { container } = zeige();

    expect(container.querySelector('.hero')).toBeNull();
  });
});

describe('Die laufende Serie als Frontplatte', () => {
  test('zeigt den Titel der laufenden Serie groß', () => {
    lege(mach('watching', 'Frieren', { progress: 4 }));
    const { container } = zeige();

    expect(within(container.querySelector('.hero') as HTMLElement).getByText('Frieren')).toBeInTheDocument();
  });

  test('bietet den Sprung zur nächsten Episode an', () => {
    lege(mach('watching', 'Frieren', { progress: 4 }));
    const { container } = zeige();
    const hero = container.querySelector('.hero') as HTMLElement;

    expect(within(hero).getByRole('button', { name: /Episode 5/i })).toBeInTheDocument();
  });

  test('zählt die Episode wirklich hoch', async () => {
    const user = userEvent.setup();
    const e = mach('watching', 'Frieren', { progress: 4 });
    lege(e);
    const { container } = zeige();
    const hero = container.querySelector('.hero') as HTMLElement;

    await user.click(within(hero).getByRole('button', { name: /Episode 5/i }));

    expect(useLibrary.getState().entries[e.rootId].progress).toBe(5);
  });

  test('die Karte im Panel bietet dieselbe Aktion an — beide zählen dasselbe hoch', () => {
    // Frontplatte UND Karte tragen den Weiter-Knopf. Das ist Absicht: oben
    // die große Geste, unten der schnelle Griff in der Liste.
    lege(mach('watching', 'Frieren', { progress: 4 }));
    zeige();

    expect(screen.getAllByRole('button', { name: /Episode 5/i })).toHaveLength(2);
  });
});

describe('Zwischen laufenden Serien blättern', () => {
  test('zeigt die Pfeile nur, wenn es mehr als eine laufende Serie gibt', () => {
    lege(mach('watching', 'Eine einzige'));
    zeige();

    expect(screen.queryByRole('button', { name: /nächste serie/i })).not.toBeInTheDocument();
  });

  test('zeigt die Pfeile bei zwei laufenden Serien', () => {
    lege(mach('watching', 'Erste'), mach('watching', 'Zweite'));
    zeige();

    expect(screen.getByRole('button', { name: /nächste serie/i })).toBeInTheDocument();
  });

  test('blättert vorwärts zur nächsten Serie', async () => {
    const user = userEvent.setup();
    lege(mach('watching', 'Erste', { updatedAt: 2000 }), mach('watching', 'Zweite', { updatedAt: 1000 }));
    const { container } = zeige();
    const hero = () => container.querySelector('.hero') as HTMLElement;
    expect(within(hero()).getByText('Erste')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /nächste serie/i }));

    expect(within(hero()).getByText('Zweite')).toBeInTheDocument();
  });

  test('blättert rückwärts', async () => {
    const user = userEvent.setup();
    lege(mach('watching', 'Erste', { updatedAt: 2000 }), mach('watching', 'Zweite', { updatedAt: 1000 }));
    const { container } = zeige();

    await user.click(screen.getByRole('button', { name: /vorherige serie/i }));

    // Rückwärts vom ersten Eintrag läuft um auf den letzten.
    expect(within(container.querySelector('.hero') as HTMLElement).getByText('Zweite')).toBeInTheDocument();
  });

  test('läuft am Ende wieder auf den Anfang um, statt hängen zu bleiben', async () => {
    const user = userEvent.setup();
    lege(mach('watching', 'Erste', { updatedAt: 2000 }), mach('watching', 'Zweite', { updatedAt: 1000 }));
    const { container } = zeige();

    await user.click(screen.getByRole('button', { name: /nächste serie/i }));
    await user.click(screen.getByRole('button', { name: /nächste serie/i }));

    expect(within(container.querySelector('.hero') as HTMLElement).getByText('Erste')).toBeInTheDocument();
  });

  test('zeigt an, an welcher Stelle man ist', () => {
    lege(mach('watching', 'Erste'), mach('watching', 'Zweite'), mach('watching', 'Dritte'));
    zeige();

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });
});

describe('Die drei Panels', () => {
  test('führt Weiter schauen, Noch zu schauen und Watchlist', () => {
    lege(mach('watching', 'A'));
    zeige();
    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(3);
  });

  test('zeigt die Einträge der gewählten Kategorie', () => {
    lege(mach('watching', 'Läuft'), mach('planned', 'Vorgemerkt'));
    const { container } = zeige();
    const panel = container.querySelector('.panel-body') as HTMLElement;

    expect(within(panel).getByText('Läuft')).toBeInTheDocument();
    expect(within(panel).queryByText('Vorgemerkt')).not.toBeInTheDocument();
  });

  test('wechselt die Kategorie beim Klick', async () => {
    const user = userEvent.setup();
    lege(mach('watching', 'Läuft'), mach('planned', 'Vorgemerkt'));
    zeige();

    await user.click(screen.getByRole('tab', { name: /watchlist/i }));

    expect(screen.getByText('Vorgemerkt')).toBeInTheDocument();
  });

  test('zeigt für eine leere Kategorie einen Hinweis statt einer weißen Fläche', async () => {
    const user = userEvent.setup();
    lege(mach('watching', 'Läuft'));
    const { container } = zeige();

    await user.click(screen.getByRole('tab', { name: /watchlist/i }));

    expect(container.querySelector('.empty')).toBeInTheDocument();
  });

  test('die Auswahlleiste bleibt auch in einer leeren Kategorie bedienbar', async () => {
    const user = userEvent.setup();
    lege(mach('watching', 'Läuft'));
    zeige();

    await user.click(screen.getByRole('tab', { name: /watchlist/i }));
    await user.click(screen.getByRole('tab', { name: /weiter schauen/i }));

    const panel = document.querySelector('.panel-body') as HTMLElement;
    expect(within(panel).getByText('Läuft')).toBeInTheDocument();
  });

  test('zählt, wie viele in jeder Kategorie liegen', () => {
    lege(mach('planned', 'A'), mach('planned', 'B'), mach('watching', 'C'));
    zeige();

    expect(screen.getByRole('tab', { name: /watchlist/i })).toHaveTextContent('2');
  });
});

describe('Watchlist-Deckel', () => {
  test('verlinkt in die Bibliothek, wenn die Watchlist länger ist als der Ausschnitt', async () => {
    const user = userEvent.setup();
    lege(...Array.from({ length: 25 }, (_, i) => mach('planned', `Titel ${i}`)));
    zeige();

    await user.click(screen.getByRole('tab', { name: /watchlist/i }));

    expect(screen.getByRole('link', { name: /bibliothek|alle/i })).toBeInTheDocument();
  });

  test('zeigt den Hinweis nicht bei einer kurzen Watchlist', async () => {
    const user = userEvent.setup();
    lege(mach('planned', 'Einer'));
    zeige();

    await user.click(screen.getByRole('tab', { name: /watchlist/i }));

    expect(screen.queryByRole('link', { name: /alle .* bibliothek/i })).not.toBeInTheDocument();
  });
});

describe('Zufallsroller', () => {
  test('steht bereit, wenn etwas auf der Watchlist liegt', async () => {
    const user = userEvent.setup();
    lege(mach('planned', 'A'), mach('planned', 'B'));
    zeige();

    await user.click(screen.getByRole('tab', { name: /watchlist/i }));

    expect(screen.getByRole('button', { name: /zufall|entscheid|würfel/i })).toBeInTheDocument();
  });
});

describe('Simulcast — bewusst behalten', () => {
  test('zeigt keinen Abschnitt, solange nichts ansteht', () => {
    lege(mach('watching', 'Frieren'));
    zeige();

    expect(screen.queryByText(/simulcast/i)).not.toBeInTheDocument();
  });
});
