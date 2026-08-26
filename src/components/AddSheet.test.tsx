import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AddSheet } from '@/components/AddSheet';
import { useLibrary, type SeasonSnap } from '@/store/library';
import { announcedSeason, resetIds, season } from '@/test/factories';

/**
 * DER AUFNAHME-WEG.
 *
 * Zwei Schritte, und der zweite kommt nur, wenn er etwas zu klären hat:
 *
 *  1. In welche Kategorie?
 *  2. Wie weit bist du? — nur bei „Weiter schauen" und „Geschaut". Wer etwas
 *     nur vormerkt, hat nichts zu beantworten.
 *
 * Im zweiten Schritt steckt die SCHERE: alles nach dem Schnitt gehört gar
 * nicht erst zum Eintrag. Ohne sie gilt ein Franchise nie als fertig,
 * solange irgendwo noch eine Staffel gelistet ist, die man nie sehen will.
 */

function zeige(seasons: SeasonSnap[], onDone = vi.fn()) {
  render(
    <AddSheet
      seasons={seasons}
      genres={['Action']}
      onClose={() => {}}
      onDone={onDone}
    />,
  );
  return onDone;
}

/** Der eine Eintrag, der nach dem Aufnehmen im Store steht. */
function angelegt() {
  return Object.values(useLibrary.getState().entries)[0];
}

beforeEach(() => {
  resetIds();
  useLibrary.setState({ entries: {}, completedOrder: [], hydrated: true });
});

describe('Schritt 1 — die Kategorie', () => {
  test('fragt zuerst nach der Kategorie', () => {
    zeige([season({ id: 1 })]);

    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  test('Watchlist braucht keinen zweiten Schritt', async () => {
    const user = userEvent.setup();
    const fertig = zeige([season({ id: 1 }), season({ id: 2 })]);

    await user.click(screen.getAllByRole('radio').find((r) => r.dataset.st === 'planned')!);

    await waitFor(() => expect(angelegt()?.status).toBe('planned'));
    expect(fertig).toHaveBeenCalled();
  });

  test('„Fortsetzung folgt" ebenso wenig', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1 }), announcedSeason({ id: 2 })]);

    await user.click(screen.getAllByRole('radio').find((r) => r.dataset.st === 'continuation')!);

    await waitFor(() => expect(angelegt()).toBeDefined());
  });
});

describe('Schritt 2 — „Weiter schauen"', () => {
  async function bisZuSchritt2(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole('radio').find((r) => r.dataset.st === 'watching')!);
  }

  test('fragt, bei welcher Staffel man ist', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1 }), season({ id: 2 }), season({ id: 3 })]);

    await bisZuSchritt2(user);

    expect(screen.getAllByTestId('season-row')).toHaveLength(3);
  });

  test('eine angekündigte Staffel lässt sich nicht als laufend wählen', async () => {
    // Man kann nicht bei etwas sein, das es noch nicht gibt.
    const user = userEvent.setup();
    zeige([season({ id: 1 }), announcedSeason({ id: 2 })]);

    await bisZuSchritt2(user);

    const zeilen = screen.getAllByTestId('season-row');
    expect(within(zeilen[1]).getByRole('radio')).toBeDisabled();
  });

  test('merkt sich Staffel UND Folge', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1, episodes: 12 }), season({ id: 2, episodes: 12 })]);

    await bisZuSchritt2(user);
    await user.click(within(screen.getAllByTestId('season-row')[1]).getByRole('radio'));
    // Zweimal weiter: Folge 3.
    await user.click(screen.getByRole('button', { name: /eine .* weiter/i }));
    await user.click(screen.getByRole('button', { name: /eine .* weiter/i }));
    await user.click(screen.getByRole('button', { name: /übernehmen|fertig|hinzufügen/i }));

    await waitFor(() => {
      const e = angelegt();
      expect(e.seasonIndex).toBe(1);
      expect(e.progress).toBe(3);
    });
  });

  test('der Weg zurück zur Kategorie steht offen', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1 }), season({ id: 2 })]);

    await bisZuSchritt2(user);
    // Genau „Zurück" — der Stepper hat ein „Eine Episode zurück" daneben.
    await user.click(screen.getByRole('button', { name: /^zurück$/i }));

    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });
});

describe('Schritt 2 — „Geschaut" mit Schere', () => {
  async function bisZuSchritt2(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole('radio').find((r) => r.dataset.st === 'completed')!);
  }

  test('fragt, bis wohin geschaut wurde', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1 }), season({ id: 2 }), season({ id: 3 })]);

    await bisZuSchritt2(user);

    expect(screen.getAllByTestId('season-row')).toHaveLength(3);
  });

  test('bis Staffel 2 geschaut heißt: Zeiger steht auf Staffel 3', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1 }), season({ id: 2 }), season({ id: 3 })]);

    await bisZuSchritt2(user);
    await user.click(within(screen.getAllByTestId('season-row')[1]).getByRole('radio'));
    await user.click(screen.getByRole('button', { name: /übernehmen|fertig|hinzufügen/i }));

    await waitFor(() => expect(angelegt().seasonIndex).toBe(2));
  });

  test('die Schere schneidet alles danach ab', async () => {
    // Wer Staffel 3 nie sehen will, hat nach Staffel 2 ein FERTIGES
    // Franchise — nicht eines, das ewig auf Staffel 3 wartet.
    const user = userEvent.setup();
    zeige([season({ id: 1 }), season({ id: 2 }), season({ id: 3 })]);

    await bisZuSchritt2(user);
    await user.click(within(screen.getAllByTestId('season-row')[1]).getByRole('radio'));
    await user.click(within(screen.getAllByTestId('season-row')[1]).getByRole('button', { name: /abschneiden|schere/i }));
    await user.click(screen.getByRole('button', { name: /übernehmen|fertig|hinzufügen/i }));

    await waitFor(() => {
      const e = angelegt();
      expect(e.seasons).toHaveLength(2);
      expect(e.status).toBe('completed');
    });
  });

  test('der Schnitt lässt sich zurücknehmen', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1 }), season({ id: 2 }), season({ id: 3 })]);

    await bisZuSchritt2(user);
    const schere = within(screen.getAllByTestId('season-row')[1]).getByRole('button', {
      name: /abschneiden|schere/i,
    });
    await user.click(schere);
    await user.click(schere);
    await user.click(within(screen.getAllByTestId('season-row')[2]).getByRole('radio'));
    await user.click(screen.getByRole('button', { name: /übernehmen|fertig|hinzufügen/i }));

    await waitFor(() => expect(angelegt().seasons).toHaveLength(3));
  });

  test('abgeschnittene Staffeln sind sichtbar als solche markiert', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1 }), season({ id: 2 }), season({ id: 3 })]);

    await bisZuSchritt2(user);
    await user.click(within(screen.getAllByTestId('season-row')[0]).getByRole('button', { name: /abschneiden|schere/i }));

    const zeilen = screen.getAllByTestId('season-row');
    expect(zeilen[1]).toHaveClass('is-cut');
    expect(zeilen[2]).toHaveClass('is-cut');
    expect(zeilen[0]).not.toHaveClass('is-cut');
  });
});

describe('Eine einzige Staffel', () => {
  test('„Geschaut" braucht keine Rückfrage — es gibt nichts zu wählen', async () => {
    const user = userEvent.setup();
    zeige([season({ id: 1, episodes: 12 })]);

    await user.click(screen.getAllByRole('radio').find((r) => r.dataset.st === 'completed')!);

    await waitFor(() => expect(angelegt()?.status).toBe('completed'));
  });

  test('„Weiter schauen" fragt trotzdem nach der Folge', async () => {
    // Die Staffel ist klar, die Folge nicht — und genau darum geht es.
    const user = userEvent.setup();
    zeige([season({ id: 1, episodes: 12 })]);

    await user.click(screen.getAllByRole('radio').find((r) => r.dataset.st === 'watching')!);

    expect(screen.getByRole('button', { name: /eine .* weiter/i })).toBeInTheDocument();
  });
});
