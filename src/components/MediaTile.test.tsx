import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { MediaTile } from '@/components/MediaTile';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { entry, mediaCard, resetIds, season } from '@/test/factories';

/**
 * DIE KATALOG-KARTE — Entdecken, Suche, Empfehlungen.
 *
 * Bewusst eine andere Bauform als die eigene Karte: kein Fortschritt, kein
 * Weiter-Knopf, kein Countdown, und für alle dieselbe Bewegung. Im Katalog
 * stehen viele Titel mit verschiedenem Status nebeneinander — fünf
 * verschiedene Bewegungen wirkten dort unruhig.
 */

function zeige(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
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
  lege();
});

describe('Katalog-Karte', () => {
  test('führt auf die Detailseite des Titels', () => {
    const m = mediaCard({ id: 42 });
    zeige(<MediaTile media={m} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/anime/42');
  });

  test('zeigt Titel und eine Zeile Herkunft', () => {
    const m = mediaCard({ id: 7, season: 'SPRING', seasonYear: 2024, format: 'TV' });
    zeige(<MediaTile media={m} />);

    expect(screen.getByText('English 7')).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  test('trägt immer dieselbe Bewegung, egal welchen Status der Titel hat', () => {
    const s = season({ id: 5 });
    lege(entry({ rootId: 5, status: 'completed', seasons: [s] }));
    zeige(<MediaTile media={mediaCard({ id: 5 })} />);

    expect(screen.getByRole('link')).toHaveClass('card--uniform');
  });

  test('markiert, was schon in der Bibliothek liegt', () => {
    const s = season({ id: 9 });
    lege(entry({ rootId: 9, status: 'watching', seasons: [s] }));
    zeige(<MediaTile media={mediaCard({ id: 9 })} />);

    // Nur ein Zeichen, aber mit Namen: im Katalog zählt „das hast du schon",
    // nicht die genaue Kategorie. Die volle Beschriftung passte neben der
    // Wertung ohnehin nicht auf die 152 px breite Karte — sie lief unter
    // die Wertungs-Marke und war abgeschnitten.
    expect(screen.getByLabelText('Weiter schauen')).toBeInTheDocument();
  });

  test('die Marke drängt sich nicht mit der Wertung auf denselben Platz', () => {
    const s = season({ id: 9 });
    lege(entry({ rootId: 9, status: 'watching', seasons: [s] }));
    const { container } = zeige(<MediaTile media={mediaCard({ id: 9, averageScore: 86 })} />);

    // Beide sind da — aber die Besitz-Marke ist ein Zeichen, keine Pille
    // mit Fließtext.
    expect(container.querySelector('.card__owned')).toBeInTheDocument();
    expect(container.querySelector('.score')).toHaveTextContent('8.6');
    expect(container.querySelector('.card__owned')?.textContent).toBe('');
  });

  test('verrät NICHT, dass eine Fortsetzung angekündigt ist', () => {
    // Das wäre ein Spoiler für einen Titel, um den es an dieser Stelle gar
    // nicht geht — etwa „Frieren" unter „Bestbewertet". Die Information
    // steht weiterhin im Franchise-Zeitstrahl der Detailseite.
    const s = season({ id: 11 });
    lege(entry({ rootId: 11, status: 'continuation', seasons: [s] }));
    zeige(<MediaTile media={mediaCard({ id: 11 })} />);

    expect(screen.queryByText('Fortsetzung folgt')).not.toBeInTheDocument();
  });

  test('zeigt die Wertung der Gemeinschaft, wenn es eine gibt', () => {
    zeige(<MediaTile media={mediaCard({ id: 3, averageScore: 86 })} />);

    expect(screen.getByText('8.6')).toBeInTheDocument();
  });

  test('ohne Wertung steht dort auch keine', () => {
    zeige(<MediaTile media={mediaCard({ id: 4, averageScore: null })} />);

    expect(screen.queryByText(/\d\.\d/)).not.toBeInTheDocument();
  });
});
