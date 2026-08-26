import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSettings } from '@/i18n';

/**
 * DIE LETZTE GRENZE.
 *
 * Wirft irgendetwas beim Rendern, reißt React ohne diese Grenze den ganzen
 * Baum ab — auf dem Handy ohne Konsole eine Sackgasse, aus der auch ein
 * Neustart nicht herausführt, solange der auslösende Eintrag im Speicher
 * liegt. Genau deshalb muss der Ausweg hier funktionieren, wenn sonst nichts
 * mehr funktioniert.
 */

function Bombe(): never {
  throw new Error('Kaputter Datensatz');
}

/** React meldet gefangene Fehler zusätzlich auf der Konsole — hier nur Lärm. */
let konsole: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  konsole = vi.spyOn(console, 'error').mockImplementation(() => {});
  useSettings.setState({ lang: 'de' });
});

afterEach(() => {
  konsole.mockRestore();
  vi.unstubAllGlobals();
});

describe('Wenn nichts schiefgeht', () => {
  test('reicht sie ihre Kinder unverändert durch', () => {
    render(
      <ErrorBoundary>
        <p>Alles heil</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Alles heil')).toBeInTheDocument();
  });
});

describe('Wenn beim Rendern etwas wirft', () => {
  test('zeigt sie eine Meldung statt einer weißen Seite', () => {
    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Da ist etwas schiefgelaufen')).toBeInTheDocument();
  });

  test('beruhigt: die Bibliothek liegt im Konto, nicht nur auf dem Gerät', () => {
    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Bibliothek ist sicher/i)).toBeInTheDocument();
  });

  test('nennt den technischen Grund — sonst ist der Fehler nicht meldbar', () => {
    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Kaputter Datensatz')).toBeInTheDocument();
  });

  test('schreibt den Fehler zusätzlich in die Konsole', () => {
    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    expect(konsole).toHaveBeenCalledWith(
      'Tsugi: Render-Fehler abgefangen',
      expect.any(Error),
      expect.anything(),
    );
  });

  test('spricht Englisch, wenn die App auf Englisch steht', () => {
    useSettings.setState({ lang: 'en' });
    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('Die beiden Auswege', () => {
  test('„Neu laden" lädt die Seite neu', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Neu laden' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('leert auf Wunsch NUR den lokalen Zwischenspeicher, nie die Cloud', async () => {
    const reload = vi.fn();
    const deleteDatabase = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    vi.stubGlobal('indexedDB', { ...globalThis.indexedDB, deleteDatabase });

    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Zwischenspeicher/i }));

    expect(deleteDatabase).toHaveBeenCalledWith('tsugi');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('lädt auch dann neu, wenn das Löschen des Zwischenspeichers scheitert', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    vi.stubGlobal('indexedDB', {
      deleteDatabase: () => {
        throw new Error('gesperrt');
      },
    });

    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Zwischenspeicher/i }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('V5-Sprache', () => {
  test('benutzt keine Tailwind-Klassen aus dem alten Design mehr', () => {
    const { container } = render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    // `font-display` (Fraunces) gibt es seit Etappe 2 nicht mehr, `press` und
    // `rounded-ctl` gehören zum abgelösten Design. Eine Klasse, die es nicht
    // gibt, färbt nichts — sie fällt nur nicht auf.
    expect(container.innerHTML).not.toMatch(/font-display|\bpress\b|rounded-ctl|bg-surface/);
  });

  test('steht auf der Platte des Gerät-Designs', () => {
    const { container } = render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>,
    );
    expect(container.querySelector('.gate__plate')).not.toBeNull();
  });
});
