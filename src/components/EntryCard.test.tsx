import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EntryCard } from '@/components/EntryCard';
import { useLibrary, type LibraryEntry, type WatchStatus } from '@/store/library';
import { announcedSeason, entry, resetIds, season } from '@/test/factories';

/**
 * EINE Bauform, FÜNF Charaktere. Der Unterschied steckt in der Behandlung
 * des Covers, im Zeichen darauf und in der Bewegung — daran erkennt man ohne
 * Überschrift, in welcher Kategorie man ist.
 *
 * Wichtigste Zusage: jede Kategorie ist auch im RUHEZUSTAND erkennbar.
 * Touch-Geräte haben kein Hover — dort ist der Ruhezustand der einzige
 * Zustand, den man je sieht.
 */

function zeige(e: LibraryEntry, props: Partial<Parameters<typeof EntryCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <EntryCard entry={e} {...props} />
    </MemoryRouter>,
  );
}

function eintrag(status: WatchStatus, over: Partial<LibraryEntry> = {}): LibraryEntry {
  return entry({ status, seasons: [season({ id: 1, title: 'Frieren', episodes: 12 })], ...over });
}

beforeEach(() => {
  resetIds();
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: true });
});

describe('Grundform', () => {
  test('führt zur Detailseite des Eintrags', () => {
    zeige(eintrag('watching', { rootId: 42, seasons: [season({ id: 42, title: 'Frieren' })] }));

    expect(screen.getByRole('link', { name: /Frieren/ })).toHaveAttribute('href', '/anime/42');
  });

  test('zeigt den Franchise-Titel', () => {
    zeige(eintrag('planned'));

    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });

  test('trägt die Farbrolle ihrer Kategorie', () => {
    const { container } = zeige(eintrag('completed'));

    expect(container.querySelector('.card')).toHaveAttribute('data-st', 'completed');
  });

  test('das Cover ist dekorativ — der Titel steht als Text daneben', () => {
    const { container } = zeige(eintrag('watching'));

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  test('kommt ohne Cover aus, statt ein kaputtes Bild zu zeigen', () => {
    const { container } = zeige(
      eintrag('watching', { seasons: [season({ id: 1, title: 'Ohne Bild', coverUrl: null })] }),
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Ohne Bild')).toBeInTheDocument();
  });
});

describe('Fünf Charaktere im Ruhezustand', () => {
  test('„Weiter schauen" zeigt einen Fortschrittsbalken auf dem Cover', () => {
    const { container } = zeige(eintrag('watching', { progress: 6 }));

    expect(container.querySelector('.card__prog')).toBeInTheDocument();
  });

  test('„Weiter schauen" hat einen Knopf für die nächste Folge', () => {
    zeige(eintrag('watching', { progress: 5 }));

    expect(screen.getByRole('button', { name: /Episode 6/ })).toBeInTheDocument();
  });

  test('„Noch zu schauen" trägt eine Marke — sonst wäre es auf dem Handy nicht erkennbar', () => {
    // Der Ausfahr-Effekt gibt es auf Touch nicht; ohne Marke wäre das die
    // einzige Kategorie ohne Ruhezustands-Zeichen.
    const { container } = zeige(eintrag('nextup'));

    expect(container.querySelector('.ready-badge')).toBeInTheDocument();
  });

  test('„Watchlist" trägt eine Fahne am oberen Rand', () => {
    const { container } = zeige(eintrag('planned'));

    expect(container.querySelector('.ribbon')).toBeInTheDocument();
  });

  test('„Fortsetzung folgt" trägt eine Wartemarke mit tickender Uhr', () => {
    const { container } = zeige(
      eintrag('continuation', {
        seasons: [season({ id: 1 }), announcedSeason({ id: 2 })],
        seasonIndex: 1,
        releaseNote: '2027',
      }),
    );

    expect(container.querySelector('.wait')).toBeInTheDocument();
    expect(container.querySelector('.tick')).toBeInTheDocument();
  });

  test('„Geschaut" trägt ein Siegel', () => {
    const { container } = zeige(eintrag('completed'));

    expect(container.querySelector('.seal-badge')).toBeInTheDocument();
  });

  test('jede Kategorie hat ein eigenes Ruhezustands-Zeichen — keine sieht aus wie die andere', () => {
    const zeichen = (['watching', 'nextup', 'planned', 'continuation', 'completed'] as const).map(
      (st) => {
        const { container } = zeige(
          eintrag(st, {
            seasons: [season({ id: 1 }), announcedSeason({ id: 2 })],
            seasonIndex: st === 'continuation' ? 1 : 0,
          }),
        );
        const art = container.querySelector('.card__art') as HTMLElement;
        return art.innerHTML;
      },
    );

    expect(new Set(zeichen).size).toBe(5);
  });
});

describe('Untertitel — jede Kategorie sagt etwas anderes', () => {
  test('„Weiter schauen" nennt Staffel und Stand', () => {
    const { container } = zeige(eintrag('watching', { progress: 4 }));

    expect(container.querySelector('.card__sub')).toHaveTextContent('4/12');
  });

  test('„Fortsetzung folgt" nennt den Termin', () => {
    const { container } = zeige(
      eintrag('continuation', {
        seasons: [season({ id: 1 }), announcedSeason({ id: 2 })],
        seasonIndex: 1,
        releaseNote: '2027',
      }),
    );

    expect(container.querySelector('.card__sub')).toHaveTextContent('2027');
  });

  test('„Geschaut" nennt Episodenzahl und Wertung', () => {
    const { container } = zeige(eintrag('completed', { progress: 12, rating: 9 }));

    expect(container.querySelector('.card__sub')).toHaveTextContent('9');
  });

  test('„Geschaut" ohne Wertung sagt das, statt „null/10" zu zeigen', () => {
    const { container } = zeige(eintrag('completed', { progress: 12, rating: null }));

    expect(container.querySelector('.card__sub')).not.toHaveTextContent('null');
  });
});

describe('Weiterzählen direkt von der Karte', () => {
  test('der Knopf zählt die Episode hoch', async () => {
    const user = userEvent.setup();
    const e = eintrag('watching', { rootId: 1, progress: 3 });
    useLibrary.setState({ entries: { 1: e } });
    zeige(e);

    await user.click(screen.getByRole('button', { name: /Episode 4/ }));

    expect(useLibrary.getState().entries[1].progress).toBe(4);
  });

  test('der Knopf navigiert nicht mit — man bleibt, wo man ist', async () => {
    // Die Karte ist ein Link; ohne stopPropagation landete jeder Klick auf
    // dem Knopf zusätzlich auf der Detailseite.
    const user = userEvent.setup();
    const e = eintrag('watching', { rootId: 1, progress: 3 });
    useLibrary.setState({ entries: { 1: e } });
    const onNavigate = vi.fn();
    render(
      <MemoryRouter>
        <div onClick={onNavigate}>
          <EntryCard entry={e} />
        </div>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Episode 4/ }));

    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe('Katalog-Bauform', () => {
  test('zeigt im Katalog keine „Fortsetzung folgt"-Marke — das wäre ein Spoiler', () => {
    // „Frieren" unter „Bestbewertet" darf nicht verraten, dass eine
    // Fortsetzung angekündigt ist. Die Info steht im Franchise-Zeitstrahl.
    const { container } = zeige(
      eintrag('continuation', {
        seasons: [season({ id: 1 }), announcedSeason({ id: 2 })],
        seasonIndex: 1,
      }),
      { uniform: true },
    );

    expect(container.querySelector('.wait')).toBeNull();
  });

  test('bewegt sich im Katalog für alle Kategorien gleich', () => {
    const { container } = zeige(eintrag('planned'), { uniform: true });

    expect(container.querySelector('.card')).toHaveClass('card--uniform');
  });

  test('zeigt in den eigenen Listen die volle Kategorie-Bauform', () => {
    const { container } = zeige(eintrag('planned'));

    expect(container.querySelector('.card')).not.toHaveClass('card--uniform');
  });
});

describe('Statusmarke', () => {
  test('kann die Kategorie zusätzlich benennen', () => {
    zeige(eintrag('planned'), { showTag: true });

    expect(screen.getByText(/watchlist/i)).toBeInTheDocument();
  });

  test('bleibt ohne Anforderung weg — die Bauform sagt es schon', () => {
    zeige(eintrag('planned'));

    expect(screen.queryByText(/^watchlist$/i)).not.toBeInTheDocument();
  });
});
