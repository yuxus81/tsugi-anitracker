import { useState, type FormEvent } from 'react';
import {
  authErrorMessage,
  sendPasswordReset,
  signIn,
  signUp,
  updatePassword,
  useAuth,
} from '@/store/auth';
import { useT } from '@/i18n';
import { IconCheck } from '@/components/icons';

type Mode = 'login' | 'signup' | 'forgot' | 'forgotSent';

/**
 * Login-Gate: Tsugi braucht seit dem Umstieg auf Supabase-Sync ein echtes
 * Konto (Multi-Device), also gibt es ohne Session keine App zu sehen. Ein
 * Sonderfall wird separat behandelt: `passwordRecovery` (Klick auf den
 * Reset-Link) zeigt statt Login/Signup ein „neues Passwort setzen“-Formular.
 */
export function AuthScreen() {
  const t = useT();
  const passwordRecovery = useAuth((s) => s.passwordRecovery);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            width={52}
            height={52}
            className="h-13 w-13 rounded-card shadow-glow-purple"
          />
          <h1 className="mt-4 font-display text-[26px] font-semibold tracking-tight text-ink">
            Tsugi
            <span className="ml-1.5 text-ink-dim">Anitracker</span>
          </h1>
          <p className="mt-1.5 max-w-[32ch] text-sm text-ink-dim">{t('authTagline')}</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
          {passwordRecovery ? <RecoveryForm /> : <LoginForm />}
        </div>
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
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-dim">{label}</span>
      <input
        type={type}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-ctl border border-line bg-raised px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-150 focus:border-accent"
      />
    </label>
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
      <div className="py-2 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent/15 text-accent">
          <IconCheck className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-dim">{t('authResetSent', { email })}</p>
        <button
          type="button"
          onClick={() => setMode('login')}
          className="mt-4 text-sm font-semibold text-accent hover:opacity-80"
        >
          {t('authBackToLogin')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <Field label={t('authEmail')} type="email" value={email} onChange={setEmail} autoComplete="email" />
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
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2 text-ink-dim">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            {t('authRemember')}
          </label>
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="font-medium text-ink-dim hover:text-accent"
          >
            {t('authForgot')}
          </button>
        </div>
      )}

      {error && <p className="text-[13px] leading-5 text-rose">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-ctl bg-accent py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110 disabled:opacity-50"
      >
        {mode === 'forgot' ? t('authSendReset') : mode === 'signup' ? t('authSignUp') : t('authLogIn')}
      </button>

      {mode === 'forgot' ? (
        <button
          type="button"
          onClick={() => setMode('login')}
          className="block w-full text-center text-[13px] font-medium text-ink-dim hover:text-ink"
        >
          {t('authBackToLogin')}
        </button>
      ) : (
        <p className="text-center text-[13px] text-ink-dim">
          {mode === 'signup' ? t('authHaveAccount') : t('authNoAccount')}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="font-semibold text-accent hover:opacity-80"
          >
            {mode === 'signup' ? t('authLogIn') : t('authSignUp')}
          </button>
        </p>
      )}
    </form>
  );
}

/** Nach Klick auf den Passwort-Reset-Link aus der E-Mail. */
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
      <div className="py-2 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent/15 text-accent">
          <IconCheck className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm text-ink-dim">{t('authPasswordUpdated')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <p className="text-sm text-ink-dim">{t('authNewPasswordHint')}</p>
      <Field
        label={t('authNewPassword')}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      {error && <p className="text-[13px] leading-5 text-rose">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-ctl bg-accent py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110 disabled:opacity-50"
      >
        {t('authSetPassword')}
      </button>
    </form>
  );
}
