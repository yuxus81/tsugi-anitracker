import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthScreen } from '@/components/AuthScreen';
import { useAuth } from '@/store/auth';

/**
 * DAS TOR.
 *
 * Ohne Konto gibt es die App nicht zu sehen — seit dem Umstieg auf
 * Supabase-Sync braucht Tsugi eine echte Anmeldung. Diese Seite hatte im
 * Entwurf keine Vorlage; sie ist in der V5-Sprache entworfen.
 *
 * Geprüft wird, dass keiner der drei Wege (Anmelden, Registrieren, Passwort
 * vergessen) in eine Sackgasse führt, und dass Fehler beim Namen genannt
 * werden statt in einem stummen Formular zu enden.
 */

const { signIn, signUp, sendPasswordReset, updatePassword } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('@/store/auth', async (orig) => ({
  ...(await orig<typeof import('@/store/auth')>()),
  signIn,
  signUp,
  sendPasswordReset,
  updatePassword,
}));

beforeEach(() => {
  vi.clearAllMocks();
  signIn.mockResolvedValue(undefined);
  signUp.mockResolvedValue(undefined);
  sendPasswordReset.mockResolvedValue(undefined);
  updatePassword.mockResolvedValue(undefined);
  useAuth.setState({ passwordRecovery: false });
});

describe('Anmelden', () => {
  test('schickt E-Mail und Passwort ab', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(screen.getByLabelText(/e-mail/i), 'test@example.test');
    await user.type(screen.getByLabelText(/passwort/i), 'geheim123');
    await user.click(screen.getByRole('button', { name: /^anmelden$/i }));

    expect(signIn).toHaveBeenCalledWith(
      { email: 'test@example.test', password: 'geheim123' },
      true,
    );
  });

  test('„angemeldet bleiben" lässt sich abwählen', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole('switch', { name: /angemeldet bleiben/i }));
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.test');
    await user.type(screen.getByLabelText(/passwort/i), 'geheim123');
    await user.click(screen.getByRole('button', { name: /^anmelden$/i }));

    expect(signIn).toHaveBeenCalledWith(expect.anything(), false);
  });

  test('nennt den Fehler, statt stumm zu bleiben', async () => {
    signIn.mockRejectedValue(new Error('Invalid login credentials'));
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.test');
    await user.type(screen.getByLabelText(/passwort/i), 'falsch');
    await user.click(screen.getByRole('button', { name: /^anmelden$/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  test('während des Absendens ist der Knopf gesperrt', async () => {
    // Ohne das schickt ein ungeduldiger Doppelklick zwei Anmeldungen los.
    let loesen: () => void = () => {};
    signIn.mockImplementation(() => new Promise<void>((r) => (loesen = r)));
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.test');
    await user.type(screen.getByLabelText(/passwort/i), 'geheim123');
    await user.click(screen.getByRole('button', { name: /^anmelden$/i }));

    expect(screen.getByRole('button', { name: /^anmelden$/i })).toBeDisabled();
    loesen();
  });
});

describe('Registrieren', () => {
  test('ist von der Anmeldung aus erreichbar und wieder zurück', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole('button', { name: /konto erstellen/i }));
    expect(screen.getByRole('button', { name: /^konto erstellen$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^anmelden$/i }));
    expect(screen.getByRole('button', { name: /^anmelden$/i })).toBeInTheDocument();
  });

  test('legt das Konto an', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole('button', { name: /konto erstellen/i }));
    await user.type(screen.getByLabelText(/e-mail/i), 'neu@example.test');
    await user.type(screen.getByLabelText(/passwort/i), 'geheim123');
    await user.click(screen.getByRole('button', { name: /^konto erstellen$/i }));

    expect(signUp).toHaveBeenCalled();
  });
});

describe('Passwort vergessen', () => {
  test('verlangt kein Passwort', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole('button', { name: /passwort vergessen/i }));

    expect(screen.queryByLabelText(/passwort/i)).not.toBeInTheDocument();
  });

  test('bestätigt den Versand und führt zurück', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole('button', { name: /passwort vergessen/i }));
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.test');
    await user.click(screen.getByRole('button', { name: /link senden/i }));

    expect(await screen.findByText(/a@b.test/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /zurück zum login/i }));
    expect(screen.getByRole('button', { name: /^anmelden$/i })).toBeInTheDocument();
  });
});

describe('Neues Passwort setzen', () => {
  test('zeigt nach dem Klick auf den Reset-Link das passende Formular', () => {
    useAuth.setState({ passwordRecovery: true });
    render(<AuthScreen />);

    expect(screen.getByRole('button', { name: /passwort setzen/i })).toBeInTheDocument();
    // Kein Anmelde-Umweg mehr — hier geht es nur noch um das neue Passwort.
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });

  test('setzt das neue Passwort', async () => {
    useAuth.setState({ passwordRecovery: true });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(screen.getByLabelText(/passwort/i), 'neuesgeheim1');
    await user.click(screen.getByRole('button', { name: /passwort setzen/i }));

    expect(updatePassword).toHaveBeenCalledWith('neuesgeheim1');
  });
});
