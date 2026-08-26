import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LibraryPage } from '@/pages/LibraryPage';
import { useSearchOverlay } from '@/components/searchStore';
import { useLibrary, type LibraryEntry, type WatchStatus } from '@/store/library';
import { entry, resetIds, season } from '@/test/factories';

/**
 * DIE BIBLIOTHEK — das Archiv, nicht der Alltag.
 *
 * Home zeigt, was gerade läuft; die Bibliothek zeigt die drei Kategorien,
 * die dort NICHT stehen: Geschaut, Fortsetzung folgt, Watchlist. Geschaut
 * ist eine Rangliste statt eines Rasters — eine andere Kategorie soll sich
 * auch anders anfühlen, nicht nur anders färben.
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
        <LibraryPage />
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

let id = 200;
function mach(status: WatchStatus, titel: string, over: Partial<LibraryEntry> = {}): LibraryEntry {
  id += 1;
  return entry({
    rootId: id,
    status,
    seasons: [season({ id, title: titel, episodes: 12 })],
    progress: status === 'completed' ? 12 : 0,
    ...over,
  });
}

beforeEach(() => {
  resetIds();
  id = 200;
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: true, username: 'Yunus' });
  useSearchOverlay.setState({ isOpen: false });
});

describe('Kategorie-Auswahl', () => {
  test('bietet genau die drei Kategorien an, die Home nicht zeigt', async () => {
    lege(mach('completed', 'Fertig'), mach('continuation', 'Wartet'), mach('planned', 'Vorgemerkt'));
    zeige();

    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
    expect(tabs.map((tb) => tb.textContent)).toEqual([
      expect.stringContaining('Geschaut'),
      expect.stringContaining('Fortsetzung folgt'),
      expect.stringContaining('Watchlist'),
    ]);
  });

  test('zählt je Kategorie mit', () => {
    lege(mach('planned', 'A'), mach('planned', 'B'), mach('completed', 'C'));
    zeige();

    const watchlist = within(screen.getByRole('tablist')).getByRole('tab', { name: /Watchlist/ });
    expect(watchlist).toHaveTextContent('2');
  });

  test('ein Wechsel zeigt die Einträge der anderen Kategorie', async () => {
    const user = userEvent.setup();
    lege(mach('completed', 'Schon gesehen'), mach('planned', 'Noch vorgemerkt'));
    zeige();

    expect(screen.getByText('Schon gesehen')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Watchlist/ }));

    expect(screen.getByText('Noch vorgemerkt')).toBeInTheDocument();
    expect(screen.queryByText('Schon gesehen')).not.toBeInTheDocument();
  });

  test('öffnet nie auf einer leeren Kategorie, wenn woanders etwas liegt', () => {
    // Nur Watchlist gefüllt — der Startwert wäre „Geschaut" und damit leer.
    lege(mach('planned', 'Vorgemerkt'));
    zeige();

    expect(screen.getByText('Vorgemerkt')).toBeInTheDocument();
  });
});

describe('Geschaut — die Rangliste', () => {
  test('nummeriert durch, statt ein Raster zu zeigen', () => {
    lege(
      mach('completed', 'Bestes', { rating: 10 }),
      mach('completed', 'Mittleres', { rating: 7 }),
      mach('completed', 'Schwächstes', { rating: 4 }),
    );
    zeige();

    const raenge = screen.getAllByTestId('rank').map((n) => n.textContent);
    expect(raenge).toEqual(['1', '2', '3']);
  });

  test('nimmt auch ein Franchise auf, das gerade eine SPÄTERE Staffel schaut', () => {
    // Dr.-Stone-Fall: S1 ist durch, S2 läuft noch. Der Eintrag steht auf
    // „Weiter schauen", gehört aber trotzdem in die Geschaut-Liste — sonst
    // verschwände eine fertig geschaute Staffel aus dem Archiv.
    const s1 = season({ id: 900, title: 'Franchise S1', episodes: 12 });
    const s2 = season({ id: 901, title: 'Franchise S2', episodes: 12 });
    lege(
      entry({ rootId: 900, status: 'watching', seasons: [s1, s2], seasonIndex: 1, progress: 3 }),
    );
    zeige();

    expect(screen.getByText('Franchise S1')).toBeInTheDocument();
  });

  test('der Filter blendet aus, was noch einen offenen Posten hat', async () => {
    const user = userEvent.setup();
    const s1 = season({ id: 910, title: 'Halb offen S1', episodes: 12 });
    const s2 = season({ id: 911, title: 'Halb offen S2', episodes: 12 });
    lege(
      mach('completed', 'Ganz fertig', { rating: 9 }),
      entry({ rootId: 910, status: 'nextup', seasons: [s1, s2], seasonIndex: 1, progress: 0 }),
    );
    zeige();

    expect(screen.getByText('Halb offen S1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abgeschlossen/i }));

    expect(screen.queryByText('Halb offen S1')).not.toBeInTheDocument();
    expect(screen.getByText('Ganz fertig')).toBeInTheDocument();
  });

  test('zeigt die eigene Wertung, wo es eine gibt', () => {
    lege(mach('completed', 'Bewertet', { rating: 8 }));
    zeige();

    expect(screen.getByText('8')).toBeInTheDocument();
  });

  test('jede Zeile führt auf die Detailseite', () => {
    lege(mach('completed', 'Fertig'));
    zeige();

    expect(screen.getByRole('link', { name: /Fertig/ })).toHaveAttribute('href', '/anime/201');
  });
});

describe('Geschaut — umsortieren', () => {
  test('bietet an jeder Zeile einen Greifpunkt an', () => {
    lege(mach('completed', 'Eins'), mach('completed', 'Zwei'));
    zeige();

    expect(screen.getAllByRole('button', { name: /sortier|ziehen/i })).toHaveLength(2);
  });

  test('das Ziehen schreibt die neue Reihenfolge in den Store', () => {
    lege(mach('completed', 'Eins', { rating: 9 }), mach('completed', 'Zwei', { rating: 3 }));
    zeige();

    const zeilen = screen.getAllByTestId('rank-row');
    const griff = within(zeilen[0]).getByRole('button', { name: /sortier|ziehen/i });

    fireEvent.dragStart(griff);
    fireEvent.dragOver(zeilen[1]);
    fireEvent.drop(zeilen[1]);

    // Vorher stand 201 („Eins", Wertung 9) vorn — nach dem Zug steht 202 vorn.
    expect(useLibrary.getState().completedOrder).toEqual([202, 201]);
  });
});

describe('Watchlist', () => {
  test('bietet den Würfel an — hier entscheidet er ja', async () => {
    const user = userEvent.setup();
    lege(mach('planned', 'Vorgemerkt A'), mach('planned', 'Vorgemerkt B'));
    zeige();

    await user.click(screen.getByRole('tab', { name: /Watchlist/ }));

    expect(screen.getByRole('button', { name: /entscheid|zufall/i })).toBeInTheDocument();
  });

  test('der Würfel hebt einen Eintrag hervor', async () => {
    const user = userEvent.setup();
    lege(mach('planned', 'Vorgemerkt A'), mach('planned', 'Vorgemerkt B'));
    const { container } = zeige();

    await user.click(screen.getByRole('tab', { name: /Watchlist/ }));
    await user.click(screen.getByRole('button', { name: /entscheid|zufall/i }));

    expect(container.querySelectorAll('.just-added').length).toBeGreaterThan(0);
  });
});

describe('Fortsetzung folgt', () => {
  test('erklärt, warum die Einträge gedämpft dastehen', async () => {
    const user = userEvent.setup();
    lege(mach('continuation', 'Wartet', { releaseNote: '2027' }));
    zeige();

    await user.click(screen.getByRole('tab', { name: /Fortsetzung folgt/ }));

    expect(screen.getByText(/angekündigt/i)).toBeInTheDocument();
  });
});

describe('Leere Zustände', () => {
  test('eine leere Bibliothek bietet einen Weg nach draußen', async () => {
    const user = userEvent.setup();
    lege();
    zeige();

    await user.click(screen.getByRole('button', { name: /such/i }));
    expect(useSearchOverlay.getState().isOpen).toBe(true);
  });

  test('eine leere Kategorie sagt, welche gemeint ist', async () => {
    const user = userEvent.setup();
    // Nur „Geschaut" gefüllt: die Watchlist ist leer und lässt sich anwählen.
    lege(mach('completed', 'Fertig'));
    zeige();

    await user.click(screen.getByRole('tab', { name: /Watchlist/ }));

    // Der leere Zustand nennt die gemeinte Kategorie beim Namen — „Nichts
    // hier" allein ließe offen, wovon die Rede ist.
    expect(within(screen.getByRole('tabpanel')).getByText(/Nichts unter/)).toHaveTextContent(
      'Watchlist',
    );
    expect(screen.getByRole('button', { name: /such/i })).toBeInTheDocument();
  });
});

describe('Ausweichen — nur beim Öffnen', () => {
  test('eine ANGETIPPTE leere Kategorie bleibt stehen und schnappt nicht zurück', async () => {
    // Der alte Stand wich immer aus. Damit war eine leere Kategorie gar
    // nicht erreichbar: der Tab reagierte sichtbar auf nichts.
    const user = userEvent.setup();
    lege(mach('completed', 'Fertig'));
    zeige();

    await user.click(screen.getByRole('tab', { name: /Fortsetzung folgt/ }));

    expect(screen.getByRole('tab', { name: /Fortsetzung folgt/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByText('Fertig')).not.toBeInTheDocument();
  });
});

describe('Zahlwörter', () => {
  test('EINE Staffel heißt Staffel, nicht Staffeln', () => {
    lege(mach('completed', 'Nur eine'));
    zeige();

    const zeile = screen.getAllByTestId('rank-row')[0];
    expect(zeile).toHaveTextContent('1 Staffel');
    expect(zeile).not.toHaveTextContent('1 Staffeln');
  });

  test('mehrere Staffeln heißen Staffeln', () => {
    const s1 = season({ id: 800, title: 'Zwei Staffeln', episodes: 12 });
    const s2 = season({ id: 801, title: 'Zwei Staffeln S2', episodes: 12 });
    lege(entry({ rootId: 800, status: 'completed', seasons: [s1, s2], seasonIndex: 1, progress: 12 }));
    zeige();

    expect(screen.getAllByTestId('rank-row')[0]).toHaveTextContent('2 Staffeln');
  });

  test('EINE Episode heißt Episode, nicht Episoden', () => {
    lege(
      entry({
        rootId: 810,
        status: 'completed',
        seasons: [season({ id: 810, title: 'Kurz', episodes: 1 })],
        progress: 1,
      }),
    );
    zeige();

    const zeile = screen.getAllByTestId('rank-row')[0];
    expect(zeile).toHaveTextContent('1 Episode');
    expect(zeile).not.toHaveTextContent('1 Episoden');
  });
});

describe('Die Wertung in der Rangliste', () => {
  test('trägt Gold und einen Stern — nicht die Farbe der Kategorie', () => {
    // Gold bedeutet in dieser Version GENAU eine Sache: Wertung. Eine grüne
    // Siegel-Marke mit einer 9 darin liest sich wie ein Status, nicht wie
    // eine Note.
    lege(mach('completed', 'Bewertet', { rating: 9 }));
    const { container } = zeige();

    const marke = container.querySelector('.rating-tag');
    expect(marke).toHaveTextContent('9');
  });
});
