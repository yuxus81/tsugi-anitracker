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
import { Btn } from '@/components/ui';
import { Icon } from '@/components/icons';

type Mode = 'login' | 'signup' | 'forgot' | 'forgotSent';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 'var(--r-1)',
  background: 'var(--bg)',
  boxShadow: 'inset 0 0 0 1px var(--line-2)',
  border: 0,
  color: 'var(--ink)',
  padding: '11px 13px',
  fontSize: 15,
  outline: 'none',
};

/** Login-Gate. Ohne Session gibt es keine App zu sehen (Multi-Device-Sync). */
export function AuthScreen() {
  const t = useT();
  const passwordRecovery = useAuth((s) => s.passwordRecovery);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28 }}>
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            width={52}
            height={52}
            style={{ borderRadius: 'var(--r-3)', boxShadow: '0 0 0 1px rgba(255,255,255,.1), 0 8px 24px -6px rgba(138,43,226,.7)' }}
          />
          <h1 className="h-sec" style={{ marginTop: 14, fontSize: 22 }}>
            Tsugi <span style={{ color: 'var(--ink-3)' }}>Anitracker</span>
          </h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: '32ch' }}>
            {t('authTagline')}
          </p>
        </div>
        <div className="tile">{passwordRecovery ? <RecoveryForm /> : <LoginForm />}</div>
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
    <label style={{ display: 'block' }}>
      <span className="muted" style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
        {label}
      </span>
      <input
        type={type}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
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
      <div style={{ padding: '8px 0', textAlign: 'center' }}>
        <div
          data-st="watching"
          style={{ margin: '0 auto', display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--tone-bg)', color: 'var(--tone-t)' }}
        >
          <Icon name="check" size={20} filled />
        </div>
        <p className="sub" style={{ marginTop: 12 }}>
          {t('authResetSent', { email })}
        </p>
        <button type="button" onClick={() => setMode('login')} style={{ marginTop: 16, color: 'var(--cy-t)', fontWeight: 600 }}>
          {t('authBackToLogin')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: 'grid', gap: 16 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            {t('authRemember')}
          </label>
          <button type="button" onClick={() => setMode('forgot')} style={{ color: 'var(--ink-2)' }}>
            {t('authForgot')}
          </button>
        </div>
      )}

      {error && <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--pk-t)' }}>{error}</p>}

      <Btn variant="primary" wide type="submit" disabled={busy} loading={busy}>
        {mode === 'forgot' ? t('authSendReset') : mode === 'signup' ? t('authSignUp') : t('authLogIn')}
      </Btn>

      {mode === 'forgot' ? (
        <button type="button" onClick={() => setMode('login')} className="muted" style={{ textAlign: 'center' }}>
          {t('authBackToLogin')}
        </button>
      ) : (
        <p className="muted" style={{ textAlign: 'center' }}>
          {mode === 'signup' ? t('authHaveAccount') : t('authNoAccount')}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            style={{ color: 'var(--cy-t)', fontWeight: 600 }}
          >
            {mode === 'signup' ? t('authLogIn') : t('authSignUp')}
          </button>
        </p>
      )}
    </form>
  );
}

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
      <div style={{ padding: '8px 0', textAlign: 'center' }}>
        <div
          data-st="watching"
          style={{ margin: '0 auto', display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--tone-bg)', color: 'var(--tone-t)' }}
        >
          <Icon name="check" size={20} filled />
        </div>
        <p className="sub" style={{ marginTop: 12 }}>
          {t('authPasswordUpdated')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: 'grid', gap: 16 }}>
      <p className="sub">{t('authNewPasswordHint')}</p>
      <Field
        label={t('authNewPassword')}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      {error && <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--pk-t)' }}>{error}</p>}
      <Btn variant="primary" wide type="submit" disabled={busy} loading={busy}>
        {t('authSetPassword')}
      </Btn>
    </form>
  );
}
