/**
 * DEV ONLY — fake signed-in user + demo library so every screen renders
 * during local design work, with zero traffic to the production database
 * (see .env.local: VITE_SUPABASE_URL points at a dead host).
 *
 * Active only when `import.meta.env.DEV && VITE_DEV_SEED === '1'`.
 * Not bundled in production builds (tree-shaken: the guard is statically false).
 */
import type { User } from '@supabase/supabase-js';
import { dbClear, dbPut } from '@/lib/db';
import { useAuth } from '@/store/auth';
import { useLibrary, type LibraryEntry } from '@/store/library';

export const DEV_SEED_ON =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SEED === '1';

export async function runDevSeed(): Promise<void> {
  if (!DEV_SEED_ON) return;

  // Dynamischer Import: in Produktions-Builds (Guard oben ist konstant false)
  // wird die Fixture-Datei so gar nicht erst mitgebündelt.
  const { default: fixtures } = await import('@/lib/devFixtures.json');
  const entries = fixtures as unknown as LibraryEntry[];

  await dbClear();
  for (const e of entries) await dbPut(e);

  const fakeUser = {
    id: 'dev-user-0000-0000-0000-000000000000',
    email: 'dev@tsugi.local',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as User;

  const session = { user: fakeUser, access_token: 'dev', refresh_token: 'dev' };
  const assert = () =>
    useAuth.setState({ user: fakeUser, session: session as never, ready: true });

  assert();
  // Win the race against supabase.auth.getSession().then() in auth.ts::init.
  queueMicrotask(assert);
  setTimeout(assert, 0);
  setTimeout(assert, 50);

  useLibrary.setState({
    entries: Object.fromEntries(entries.map((e) => [e.rootId, e])),
    hydrated: true,
    completedOrder: [],
    username: 'Yunus',
  });
}
