import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { setSessionPersistence, supabase } from '@/lib/supabase';
import { useSettings } from '@/i18n';

/**
 * Auth-Zustand für Tsugi. Multi-Device-Sync (siehe store/library.ts) braucht
 * echte Nutzerkonten statt nur lokalem Speicher — dasselbe Supabase-Projekt
 * wie die alte App, aber eigene Tabellen (`tsugi_*`), siehe
 * supabase/migrations/0001_tsugi_schema.sql.
 */
interface AuthState {
  session: Session | null;
  user: User | null;
  /** Wurde die initiale Session einmal geprüft? Verhindert ein Aufblitzen des
   *  Login-Screens, während `getSession()` noch läuft. */
  ready: boolean;
  /** Kam der letzte Auth-Event von einem Passwort-Reset-Link? */
  passwordRecovery: boolean;
  init: () => void;
}

let initialized = false;

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  ready: false,
  passwordRecovery: false,

  init: () => {
    if (initialized) return;
    initialized = true;

    void supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true });
    });

    supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: session?.user ?? null,
        ready: true,
        passwordRecovery: event === 'PASSWORD_RECOVERY',
      });
    });
  },
}));

// ---- Auth-Aktionen ---------------------------------------------------------------

export interface Credentials {
  email: string;
  password: string;
}

export async function signIn({ email, password }: Credentials, remember: boolean) {
  setSessionPersistence(remember);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp({ email, password }: Credentials, remember: boolean) {
  setSessionPersistence(remember);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Freundliche, zweisprachige Meldungen für die erwartbaren Supabase-Auth-Fehler. */
export function authErrorMessage(err: unknown): string {
  const lang = useSettings.getState().lang;
  const msg = (err as { message?: string })?.message ?? '';
  const de = lang === 'de';
  if (/invalid login credentials/i.test(msg)) {
    return de ? 'E-Mail oder Passwort ist falsch.' : 'Email or password is incorrect.';
  }
  if (/user already registered/i.test(msg)) {
    return de ? 'Diese E-Mail ist bereits registriert.' : 'This email is already registered.';
  }
  if (/email not confirmed/i.test(msg)) {
    return de ? 'Bitte bestätige zuerst deine E-Mail.' : 'Please confirm your email first.';
  }
  if (/password should be at least/i.test(msg)) {
    return de ? 'Das Passwort ist zu kurz (mind. 6 Zeichen).' : 'Password is too short (min. 6 characters).';
  }
  if (/rate limit|too many/i.test(msg)) {
    return de ? 'Zu viele Versuche. Bitte kurz warten.' : 'Too many attempts. Please wait a moment.';
  }
  if (/unable to validate email|invalid email/i.test(msg)) {
    return de ? 'Ungültige E-Mail-Adresse.' : 'Invalid email address.';
  }
  return msg || (de ? 'Unbekannter Fehler. Bitte erneut versuchen.' : 'Unknown error. Please try again.');
}
