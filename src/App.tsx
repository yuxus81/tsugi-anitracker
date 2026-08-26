import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useLibrary } from '@/store/library';
import { useAuth } from '@/store/auth';
import { useToasts } from '@/store/toast';
import { useStartupScan } from '@/lib/scan';
import { AuthScreen } from '@/components/AuthScreen';
import { AppFrame } from '@/components/AppFrame';
import { Icon } from '@/components/Icon';
import { HomePage } from '@/pages/HomePage';
import { SearchOverlay } from '@/components/SearchOverlay';

// Home lädt sofort (erste Ansicht nach dem Start), der Rest erst beim
// Aufrufen — das nimmt spürbar Gewicht aus dem ersten Laden auf Mobilfunk.
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const DetailPage = lazy(() => import('@/pages/DetailPage').then((m) => ({ default: m.DetailPage })));
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

/**
 * Meldungen. Sie tragen die Farbrolle der Kategorie, um die es geht —
 * dieselbe Farbe wie Karte, Auswahlleiste und Schimmer oben.
 */
function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <>
      {toasts.map((t) => (
        <div key={t.id} role="status" className="toast" data-st={t.kind === 'error' ? 'planned' : 'watching'}>
          <span className="toast__ico" aria-hidden>
            <Icon name={t.kind === 'error' ? 'info' : 'check'} size={17} filled />
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </>
  );
}

/**
 * Platzhalter, solange eine nachgeladene Seite unterwegs ist. Bewusst die
 * gleiche Skelett-Sprache wie in den Seiten selbst — kein Spinner mitten im
 * Inhalt.
 */
function RouteSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="skel" style={{ height: 36, width: 210 }} />
      <div className="skel" style={{ height: 16, width: 290, marginTop: 12 }} />
      <div className="grid" style={{ marginTop: 28 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skel" style={{ aspectRatio: '2 / 3', width: '100%' }} />
        ))}
      </div>
    </div>
  );
}

/** Beim Bildschirmwechsel neu aufbauen, damit der Übergang überblendet. */
function ViewFrame() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="view-enter">
      <Suspense fallback={<RouteSkeleton />}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/entdecken" element={<DiscoverPage />} />
          <Route path="/bibliothek" element={<LibraryPage />} />
          <Route path="/anime/:id" element={<DetailPage />} />
          <Route path="/statistik" element={<StatsPage />} />
          <Route path="/einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export function App() {
  const authInit = useAuth((s) => s.init);
  const authReady = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);

  const hydrate = useLibrary((s) => s.hydrate);
  const syncFromRemote = useLibrary((s) => s.syncFromRemote);
  const resetLocal = useLibrary((s) => s.resetLocal);

  useEffect(() => {
    authInit();
  }, [authInit]);

  // Sofortiges Zeichnen aus dem lokalen Cache, unabhängig vom Login-Status.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Sobald der Login-Status feststeht: mit Supabase abgleichen bzw. lokal leeren.
  useEffect(() => {
    if (!authReady) return;
    if (user) void syncFromRemote(user.id);
    else resetLocal();
  }, [authReady, user, syncFromRemote, resetLocal]);

  // Update-Scan: einmal pro App-Öffnung nach neuen Staffeln/Ankündigungen
  // schauen. Muss als Hook unbedingt aufgerufen werden (Rules of Hooks) —
  // scan.ts wartet selbst auf `hydrated` und pusht nur bei angemeldetem Nutzer.
  useStartupScan();

  if (!authReady) {
    return (
      <div className="bootscreen">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          width={40}
          height={40}
          className="bootscreen__logo"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <HashRouter>
      <AppFrame>
        <ViewFrame />
      </AppFrame>
      <SearchOverlay />
      <Toasts />
    </HashRouter>
  );
}
