import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ConfirmDialog, Sheet, StatusPicker } from '@/components/overlays';
import { STATUS_ORDER } from '@/store/library';

/**
 * Die Ebenen über der Seite: Blatt, Bestätigung, Statuswahl.
 *
 * Geprüft wird das VERHALTEN, das man ohne Maus braucht — Escape schließt,
 * die Fläche daneben schließt, der Zurück-Weg ist immer erreichbar. Genau
 * das geht bei Overlays als Erstes verloren, und genau das sieht man auf
 * einem Screenshot nie.
 */

describe('Blatt', () => {
  test('trägt seinen Namen und zeigt seinen Inhalt', () => {
    render(
      <Sheet title="Hinzufügen" onClose={() => {}}>
        <p>Inhalt</p>
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Hinzufügen' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Inhalt')).toBeInTheDocument();
  });

  test('Escape schließt', async () => {
    const zu = vi.fn();
    render(
      <Sheet title="Hinzufügen" onClose={zu}>
        <p>Inhalt</p>
      </Sheet>,
    );

    await userEvent.keyboard('{Escape}');
    expect(zu).toHaveBeenCalledTimes(1);
  });

  test('ein Klick auf die Fläche daneben schließt', async () => {
    const zu = vi.fn();
    const { container } = render(
      <Sheet title="Hinzufügen" onClose={zu}>
        <p>Inhalt</p>
      </Sheet>,
    );

    const scrim = container.ownerDocument.querySelector('.scrim');
    expect(scrim).not.toBeNull();
    await userEvent.click(scrim!);
    expect(zu).toHaveBeenCalledTimes(1);
  });

  test('ein Klick INS Blatt schließt nicht', async () => {
    const zu = vi.fn();
    render(
      <Sheet title="Hinzufügen" onClose={zu}>
        <p>Inhalt</p>
      </Sheet>,
    );

    await userEvent.click(screen.getByText('Inhalt'));
    expect(zu).not.toHaveBeenCalled();
  });

  test('hat einen sichtbaren Schließen-Knopf', async () => {
    const zu = vi.fn();
    render(
      <Sheet title="Hinzufügen" onClose={zu}>
        <p>Inhalt</p>
      </Sheet>,
    );

    await userEvent.click(screen.getByRole('button', { name: /schließen/i }));
    expect(zu).toHaveBeenCalledTimes(1);
  });
});

describe('Bestätigung', () => {
  test('nennt Folge und Ausweg, bevor etwas verschwindet', () => {
    render(
      <ConfirmDialog
        title="Eintrag entfernen?"
        message="Fortschritt und Wertung gehen verloren."
        confirmLabel="Entfernen"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('Fortschritt und Wertung gehen verloren.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entfernen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
  });

  test('bestätigen löst genau einmal aus', async () => {
    const ja = vi.fn();
    render(
      <ConfirmDialog
        title="Eintrag entfernen?"
        confirmLabel="Entfernen"
        onConfirm={ja}
        onCancel={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Entfernen' }));
    expect(ja).toHaveBeenCalledTimes(1);
  });

  test('Escape bricht ab und bestätigt NICHT', async () => {
    const ja = vi.fn();
    const nein = vi.fn();
    render(
      <ConfirmDialog
        title="Eintrag entfernen?"
        confirmLabel="Entfernen"
        onConfirm={ja}
        onCancel={nein}
      />,
    );

    await userEvent.keyboard('{Escape}');
    expect(nein).toHaveBeenCalledTimes(1);
    expect(ja).not.toHaveBeenCalled();
  });
});

describe('Statuswahl', () => {
  test('bietet alle fünf Kategorien an — keine fehlt', () => {
    render(<StatusPicker current={null} onPick={() => {}} />);

    // Die Zahl selbst ist die Aussage: fällt später eine Kategorie dazu und
    // niemand ergänzt die Liste, ist dieser Test rot.
    expect(screen.getAllByRole('radio')).toHaveLength(STATUS_ORDER.length);
  });

  test('markiert die aktuelle Kategorie — und nur die', () => {
    render(<StatusPicker current="planned" onPick={() => {}} />);

    const gewaehlt = screen.getAllByRole('radio').filter((b) => b.getAttribute('aria-checked') === 'true');
    expect(gewaehlt).toHaveLength(1);
    expect(gewaehlt[0]).toHaveAttribute('data-st', 'planned');
  });

  test('ohne aktuelle Kategorie ist nichts markiert', () => {
    render(<StatusPicker current={null} onPick={() => {}} />);

    const gewaehlt = screen.getAllByRole('radio').filter((b) => b.getAttribute('aria-checked') === 'true');
    expect(gewaehlt).toHaveLength(0);
  });

  test('gibt die gewählte Kategorie weiter', async () => {
    const nimm = vi.fn();
    render(<StatusPicker current={null} onPick={nimm} />);

    const grün = screen.getAllByRole('radio').find((b) => b.getAttribute('data-st') === 'completed');
    await userEvent.click(grün!);
    expect(nimm).toHaveBeenCalledWith('completed');
  });

  test('jede Zeile erklärt in einem Satz, was die Kategorie bedeutet', () => {
    render(<StatusPicker current={null} onPick={() => {}} />);

    for (const zeile of screen.getAllByRole('radio')) {
      const hinweis = zeile.querySelector('.pickrow__s');
      expect(hinweis?.textContent?.trim().length ?? 0).toBeGreaterThan(10);
    }
  });
});
