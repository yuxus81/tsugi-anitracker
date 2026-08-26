import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/kit';
import {
  authErrorMessage,
  sendPasswordReset,
  signIn,
  signUp,
  updatePassword,
  useAuth,
} from '@/store/auth';
import { useT } from '@/i18n';

/**
 * DAS TOR.
 *
 * Ohne Konto gibt es die App nicht zu sehen — seit dem Umstieg auf
 * Supabase-Sync braucht Tsugi eine echte Anmeldung (Mehrgeräte-Betrieb).
 *
 * Diese Seite hatte im V5-Entwurf KEINE Vorlage; sie ist hier in derselben
 * Sprache entworfen: das Gerät als Platte auf dunklem Grund, versenkte
 * Felder, ein Knopf mit Lichtkante, ein Schalter statt einer Ankreuzbox.
 *
 * Der Sonderfall `passwordRecovery` (Klick auf den Link aus der E-Mail)
 * zeigt statt Anmelden/Registrieren direkt das Formular für ein neues
 * Passwort — dort ist eine E-Mail-Eingabe nur ein Umweg.
 */

type Mode = 'login' | 'signup' | 'forgot' | 'forgotSent';

export function AuthScreen() {
  const t = useT();
  const passwordRecovery = useAuth((s) => s.passwordRecovery);

  return (
    <div className="gate">
      <div className="gate__plate">
        <header className="gate__head">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            width={54}
            height={54}
            className="gate__logo"
          />
          <h1 className="gate__title">
            Tsugi <span className="gate__title-dim">Anitracker</span>
          </h1>
          <p className="sub gate__tagline">{t('authTagline')}</p>
        </header>

        {passwordRecovery ? <RecoveryForm /> : <LoginForm />}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type={type}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Ein echter Schalter statt einer Ankreuzbox — dieselbe Sprache wie sonst. */
function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="switchrow"
      data-st="watching"
      onClick={() => onChange(!checked)}
    >
      <span className="switchrow__label">{label}</span>
      <span className={`switch${checked ? ' is-on' : ''}`} aria-hidden />
    </button>
  );
}

function LoginForm() {
  const t = useT();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await sendPasswordReset(email);
        setMode('forgotSent');
      } else if (mode === 'signup') {
        await signUp({ email, password }, remember);
      } else {
        await signIn({ email, password }, remember);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'forgotSent') {
    return (
      <div className="gate__done">
        <span className="gate__seal" aria-hidden>
          <Icon name="check" size={22} filled />
        </span>
        <p className="sub">{t('authResetSent', { email })}</p>
        <Button variant="quiet" wide onClick={() => setMode('login')}>
          {t('authBackToLogin')}
        </Button>
      </div>
    );
  }

  const primaer =
    mode === 'forgot' ? t('authSendReset') : mode === 'signup' ? t('authSignUp') : t('authLogIn');

  return (
    <form className="gate__form" onSubmit={(e) => void submit(e)}>
      <Field
        label={t('authEmail')}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />

      {mode !== 'forgot' && (
        <Field
          label={t('authPassword')}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
      )}

      {mode === 'login' && (
        <>
          <Switch label={t('authRemember')} checked={remember} onChange={setRemember} />
          <button type="button" className="linkish" onClick={() => setMode('forgot')}>
            {t('authForgot')}
          </button>
        </>
      )}

      {/* `role="alert"` liest ein Screenreader von selbst vor — ohne das
          bliebe ein Anmeldefehler für Blinde unsichtbar. */}
      {error && (
        <p className="gate__error" role="alert">
          {error}
        </p>
      )}

      {/* Ein echtes `submit`: die Eingabetaste im Feld muss abschicken.
          `Button` aus dem Baukasten ist bewusst immer `type="button"`. */}
      <button type="submit" className="btn btn--primary btn--wide" disabled={busy} aria-busy={busy}>
        <Icon name={mode === 'forgot' ? 'globe' : 'check'} size={18} filled />
        <span>{primaer}</span>
      </button>

      {mode === 'forgot' ? (
        <Button variant="quiet" wide onClick={() => setMode('login')}>
          {t('authBackToLogin')}
        </Button>
      ) : (
        <p className="gate__switch muted">
          {mode === 'signup' ? t('authHaveAccount') : t('authNoAccount')}{' '}
          <button
            type="button"
            className="linkish"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup' ? t('authLogIn') : t('authSignUp')}
          </button>
        </p>
      )}
    </form>
  );
}

/** Nach dem Klick auf den Zurücksetzen-Link aus der E-Mail. */
function RecoveryForm() {
  const t = useT();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="gate__done">
        <span className="gate__seal" aria-hidden>
          <Icon name="check" size={22} filled />
        </span>
        <p className="sub">{t('authPasswordUpdated')}</p>
      </div>
    );
  }

  return (
    <form className="gate__form" onSubmit={(e) => void submit(e)}>
      <p className="sub">{t('authNewPasswordHint')}</p>
      <Field
        label={t('authNewPassword')}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      {error && (
        <p className="gate__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--wide" disabled={busy} aria-busy={busy}>
        <Icon name="check" size={18} filled />
        <span>{t('authSetPassword')}</span>
      </button>
    </form>
  );
}
