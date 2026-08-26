import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsPage } from '@/pages/SettingsPage';
import { useSettings } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { entry, resetIds, season } from '@/test/factories';

/**
 * EINSTELLUNGEN — Konto, Sprache, Sicherung, Gefahrenzone.
 *
 * Die Seite ist die einzige, auf der man Daten UNWIDERRUFLICH verlieren
 * kann. Entsprechend liegt der Schwerpunkt der Tests nicht auf dem Aussehen,
 * sondern darauf, dass nichts ohne Rückfrage passiert und der Weg zurück
 * immer da ist.
 */

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock('@/store/auth', async (orig) => ({
  ...(await orig<typeof import('@/store/auth')>()),
  signOut,
}));

function zeige() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

function lege(...eintraege: LibraryEntry[]) {
  useLibrary.setState({
    entries: Object.fromEntries(eintraege.map((e) => [e.rootId, e])),
    hydrated: true,
  });
}

function mach(id: number): LibraryEntry {
  return entry({ rootId: id, seasons: [season({ id, title: `Titel ${id}` })] });
}

beforeEach(() => {
  resetIds();
  vi.clearAllMocks();
  useSettings.setState({ lang: 'de' });
  useLibrary.setState({
    entries: {},
    completedOrder: [],
    hydrated: true,
    username: null,
    usernameChangedAt: null,
  });
  useAuth.setState({ user: { id: 'u1', email: 'test@example.test' } as never });
});

describe('Profilname', () => {
  test('lässt sich setzen', async () => {
    const user = userEvent.setup();
    zeige();

    await user.type(screen.getByLabelText(/name/i), 'Yunus');
    await user.click(screen.getByRole('button', { name: /speichern/i }));

    expect(useLibrary.getState().username).toBe('Yunus');
  });

  test('speichert keinen leeren Namen', async () => {
    const user = userEvent.setup();
    zeige();

    // Ohne Eingabe muss der Knopf tot sein — ein leerer Name wäre eine
    // stille Löschung des vorhandenen.
    expect(screen.getByRole('button', { name: /speichern/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/name/i), '   ');
    expect(screen.getByRole('button', { name: /speichern/i })).toBeDisabled();
  });

  test('nach einer Änderung ist der Name für eine Weile gesperrt', () => {
    useLibrary.setState({ username: 'Yunus', usernameChangedAt: Date.now() });
    zeige();

    // Kein Eingabefeld mehr, sondern die Erklärung warum.
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tag/i)).toBeInTheDocument();
  });

  test('eine alte Änderung sperrt nicht mehr', () => {
    useLibrary.setState({
      username: 'Yunus',
      usernameChangedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });
    zeige();

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
});

describe('Sprache', () => {
  test('schaltet die Oberfläche um', async () => {
    const user = userEvent.setup();
    zeige();

    await user.click(screen.getByRole('tab', { name: /Englisch|English/ }));

    expect(useSettings.getState().lang).toBe('en');
  });

  test('die aktive Sprache ist auch ohne Farbe erkennbar', () => {
    zeige();

    expect(screen.getByRole('tab', { name: /Deutsch|German/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

describe('Sicherung', () => {
  test('ohne Einträge gibt es nichts zu exportieren', () => {
    lege();
    zeige();

    expect(screen.getByRole('button', { name: /^Exportieren/ })).toBeDisabled();
  });

  test('mit Einträgen ist der Export offen', () => {
    lege(mach(1));
    zeige();

    expect(screen.getByRole('button', { name: /^Exportieren/ })).toBeEnabled();
  });
});

describe('Gefahrenzone', () => {
  test('löscht nicht auf den ersten Klick', async () => {
    const user = userEvent.setup();
    lege(mach(1), mach(2));
    zeige();

    await user.click(screen.getByRole('button', { name: /^Archiv leeren/ }));

    // Erst kommt die Rückfrage — die Bibliothek steht noch.
    expect(Object.keys(useLibrary.getState().entries)).toHaveLength(2);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  test('die Rückfrage lässt sich folgenlos abbrechen', async () => {
    const user = userEvent.setup();
    lege(mach(1));
    zeige();

    await user.click(screen.getByRole('button', { name: /^Archiv leeren/ }));
    await user.click(screen.getByRole('button', { name: /abbrechen/i }));

    expect(Object.keys(useLibrary.getState().entries)).toHaveLength(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('erst die Bestätigung leert wirklich', async () => {
    const user = userEvent.setup();
    lege(mach(1), mach(2));
    zeige();

    await user.click(screen.getByRole('button', { name: /^Archiv leeren/ }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: /alles löschen|ja|entfernen/i }),
    );

    await waitFor(() => expect(Object.keys(useLibrary.getState().entries)).toHaveLength(0));
  });

  test('bei leerer Bibliothek gibt es nichts zu leeren', () => {
    lege();
    zeige();

    expect(screen.getByRole('button', { name: /^Archiv leeren/ })).toBeDisabled();
  });

  test('abmelden geht ohne Umweg', async () => {
    const user = userEvent.setup();
    zeige();

    await user.click(screen.getByRole('button', { name: /abmelden/i }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

describe('Konto', () => {
  test('zeigt, mit welchem Konto man angemeldet ist', () => {
    zeige();

    // Steht in der Kontokarte — und noch einmal als Hinweis an „Abmelden".
    const karte = document.querySelector('.account');
    expect(within(karte as HTMLElement).getByText('test@example.test')).toBeInTheDocument();
  });
});

