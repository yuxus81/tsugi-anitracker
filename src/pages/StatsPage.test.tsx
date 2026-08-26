import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { StatsPage } from '@/pages/StatsPage';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { entry, resetIds, season } from '@/test/factories';

/**
 * STATISTIK — das Archiv in Zahlen.
 *
 * Alles hier wird aus dem AKTUELLEN Zustand gerechnet, nie aus etwas
 * Vorgebackenem: sonst zeigte die Seite nach dem Hinzufügen eines Titels
 * Fantasiewerte. Kein einziger Netzwerkaufruf.
 *
 * Die Zahlen sind der Punkt der Seite — deshalb prüfen die Tests Zahlen,
 * nicht Balkenbreiten.
 */

function zeige() {
  return render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>,
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
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: true });
});

/** Ein Eintrag mit genau `folgen` gesehenen Episoden à `dauer` Minuten. */
function gesehen(id: number, folgen: number, over: Partial<LibraryEntry> = {}): LibraryEntry {
  return entry({
    rootId: id,
    status: 'completed',
    seasons: [season({ id, episodes: folgen, duration: 24 })],
    progress: folgen,
    ...over,
  });
}

describe('Kennzahlen', () => {
  test('zählt die Einträge', () => {
    lege(gesehen(1, 12), gesehen(2, 12), gesehen(3, 12));
    zeige();

    expect(screen.getByTestId('stat-total')).toHaveTextContent('3');
  });

  test('zählt die gesehenen Episoden über alle Einträge', () => {
    lege(gesehen(1, 12), gesehen(2, 13));
    zeige();

    expect(screen.getByTestId('stat-episodes')).toHaveTextContent('25');
  });

  test('rechnet die Sehzeit aus Folgen mal Laufzeit', () => {
    // 50 Folgen à 24 Minuten = 1200 Minuten = 20 Stunden.
    lege(gesehen(1, 50));
    zeige();

    expect(screen.getByTestId('stat-watchtime')).toHaveTextContent('20');
  });

  test('bildet den Schnitt nur über das, was auch bewertet ist', () => {
    // 8 und 6 ergeben 7,0 — der unbewertete Dritte darf nicht als 0 zählen.
    lege(gesehen(1, 12, { rating: 8 }), gesehen(2, 12, { rating: 6 }), gesehen(3, 12));
    zeige();

    expect(screen.getByTestId('stat-rating')).toHaveTextContent('7');
  });

  test('ohne eine einzige Wertung steht dort ein Strich, keine 0', () => {
    lege(gesehen(1, 12));
    zeige();

    expect(screen.getByTestId('stat-rating')).toHaveTextContent('—');
  });
});

describe('Verteilung über die Kategorien', () => {
  test('nennt jede Kategorie mit ihrer Zahl — nicht nur mit Farbe', () => {
    lege(
      gesehen(1, 12, { status: 'completed' }),
      gesehen(2, 12, { status: 'completed' }),
      entry({ rootId: 3, status: 'planned', seasons: [season({ id: 3 })] }),
    );
    zeige();

    const block = screen.getByTestId('status-spread');
    expect(within(block).getByText('Geschaut').closest('.barrow')).toHaveTextContent('2');
    expect(within(block).getByText('Watchlist').closest('.barrow')).toHaveTextContent('1');
  });

  test('jede Kategoriezeile trägt ihre eigene Farbrolle', () => {
    lege(gesehen(1, 12));
    const { container } = zeige();

    const zeilen = container.querySelectorAll('[data-testid="status-spread"] .barrow');
    const rollen = [...zeilen].map((z) => z.getAttribute('data-st'));
    expect(new Set(rollen).size).toBe(zeilen.length);
  });
});

describe('Genres', () => {
  test('zeigt die häufigsten Genres mit ihrer Anzahl', () => {
    lege(
      gesehen(1, 12, { genres: ['Action', 'Drama'] }),
      gesehen(2, 12, { genres: ['Action'] }),
    );
    zeige();

    const block = screen.getByTestId('genre-spread');
    expect(within(block).getByText('Action').closest('.barrow')).toHaveTextContent('2');
    expect(within(block).getByText('Drama').closest('.barrow')).toHaveTextContent('1');
  });

  test('das häufigste Genre steht oben', () => {
    lege(
      gesehen(1, 12, { genres: ['Drama'] }),
      gesehen(2, 12, { genres: ['Action'] }),
      gesehen(3, 12, { genres: ['Action'] }),
    );
    zeige();

    const namen = within(screen.getByTestId('genre-spread'))
      .getAllByTestId('bar-key')
      .map((n) => n.textContent);
    expect(namen[0]).toBe('Action');
  });
});

describe('Wie du wertest', () => {
  test('zeigt für jede Stufe von 1 bis 10 eine Säule', () => {
    lege(gesehen(1, 12, { rating: 9 }));
    zeige();

    expect(within(screen.getByTestId('rating-spread')).getAllByTestId('spread-col')).toHaveLength(
      10,
    );
  });

  test('zählt, wie oft eine Stufe vergeben wurde', () => {
    lege(gesehen(1, 12, { rating: 9 }), gesehen(2, 12, { rating: 9 }));
    zeige();

    const neun = within(screen.getByTestId('rating-spread')).getAllByTestId('spread-col')[8];
    expect(neun).toHaveTextContent('2');
  });

  test('ohne jede Wertung fehlt der Abschnitt ganz', () => {
    lege(gesehen(1, 12));
    zeige();

    expect(screen.queryByTestId('rating-spread')).not.toBeInTheDocument();
  });
});

describe('Leeres Archiv', () => {
  test('erklärt, dass es noch nichts zu rechnen gibt', () => {
    lege();
    zeige();

    expect(screen.queryByTestId('stat-total')).not.toBeInTheDocument();
    expect(screen.getByText(/noch nichts|keine daten|leer/i)).toBeInTheDocument();
  });
});

describe('Nach Jahr', () => {
  test('zählt, aus welchen Jahren die Einträge stammen', () => {
    lege(
      entry({ rootId: 1, seasons: [season({ id: 1, seasonYear: 2023 })] }),
      entry({ rootId: 2, seasons: [season({ id: 2, seasonYear: 2024 })] }),
      entry({ rootId: 3, seasons: [season({ id: 3, seasonYear: 2024 })] }),
    );
    zeige();

    const block = screen.getByTestId('year-spread');
    expect(within(block).getByText('2024').closest('.barrow')).toHaveTextContent('2');
  });

  test('die Jahre laufen aufsteigend, nicht nach Häufigkeit', () => {
    // Eine Zeitachse, die nach Menge sortiert ist, ist keine Zeitachse mehr.
    lege(
      entry({ rootId: 1, seasons: [season({ id: 1, seasonYear: 2024 })] }),
      entry({ rootId: 2, seasons: [season({ id: 2, seasonYear: 2024 })] }),
      entry({ rootId: 3, seasons: [season({ id: 3, seasonYear: 2019 })] }),
    );
    zeige();

    const jahre = within(screen.getByTestId('year-spread'))
      .getAllByTestId('bar-key')
      .map((n) => n.textContent);
    expect(jahre).toEqual(['2019', '2024']);
  });

  test('bei nur einem Jahr lohnt der Abschnitt nicht', () => {
    lege(entry({ rootId: 1, seasons: [season({ id: 1, seasonYear: 2024 })] }));
    zeige();

    expect(screen.queryByTestId('year-spread')).not.toBeInTheDocument();
  });
});

describe('Wie weit du durch bist', () => {
  test('setzt gesehene Folgen ins Verhältnis zu den bekannten', () => {
    // 6 von 12 Folgen gesehen — die Hälfte.
    lege(
      entry({
        rootId: 1,
        status: 'watching',
        seasons: [season({ id: 1, episodes: 12 })],
        progress: 6,
      }),
    );
    zeige();

    expect(screen.getByTestId('stat-watchtime')).toHaveTextContent('50');
  });

  test('ohne bekannte Folgenzahl wird nichts erfunden', () => {
    lege(
      entry({
        rootId: 1,
        status: 'watching',
        seasons: [season({ id: 1, episodes: null, airStatus: 'RELEASING' })],
        progress: 3,
      }),
    );
    zeige();

    expect(screen.getByTestId('stat-watchtime')).not.toHaveTextContent('%');
  });
});
