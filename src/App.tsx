import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useLibrary } from '@/store/library';
import { useAuth } from '@/store/auth';
import { useToasts } from '@/store/toast';
import { useTone } from '@/store/tone';
import { useStartupScan } from '@/lib/scan';
import { useT, type DictKey } from '@/i18n';
import { AuthScreen } from '@/components/AuthScreen';
import { HomePage } from '@/pages/HomePage';
import { SearchOverlay } from '@/components/SearchOverlay';
import { useSearchOverlay } from '@/components/searchStore';
import { Icon, IconPair, type IconName } from '@/components/icons';

// Home lädt sofort, der Rest erst beim Aufrufen.
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const DetailPage = lazy(() => import('@/pages/DetailPage').then((m) => ({ default: m.DetailPage })));
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

interface NavItem {
  to: string;
  label: DictKey;
  ico: IconName;
  end: boolean;
}

/** Reihenfolge wie im Entwurf: Bibliothek neben Home, Entdecken in der Mitte. */
const NAV: NavItem[] = [
  { to: '/', label: 'navHome', ico: 'home', end: true },
  { to: '/bibliothek', label: 'navLibrary', ico: 'stack', end: false },
  { to: '/entdecken', label: 'navDiscover', ico: 'compass', end: false },
  { to: '/statistik', label: 'navStats', ico: 'chart', end: false },
  { to: '/einstellungen', label: 'navSettings', ico: 'gear', end: false },
];

function navActive(to: string, end: boolean, pathname: string): boolean {
  if (end) return pathname === to;
  if (to === '/bibliothek' && pathname.startsWith('/anime/')) return true;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/* ---------------------------------------------------------------- Rahmen -- */

function TopBar({ scrolled, title }: { scrolled: boolean; title: string }) {
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  return (
    <header className={`topbar${scrolled ? ' is-scrolled' : ''}`}>
      <NavLink to="/" className="topbar__brand" aria-label="Tsugi — Home">
        <img
          className="topbar__logo"
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          width={30}
          height={30}
        />
        <span className="topbar__name">Tsugi</span>
      </NavLink>
      <span className="topbar__spacer">
        <span className="topbar__title">{title}</span>
      </span>
      <button type="button" className="iconbtn" aria-label={t('search')} title={t('search')} onClick={openSearch}>
        <Icon name="search" size={20} filled />
      </button>
    </header>
  );
}

function TabBar() {
  const { pathname } = useLocation();
  const t = useT();
  return (
    <nav className="tabbar" aria-label="Navigation">
      {NAV.map((n) => {
        const on = navActive(n.to, n.end, pathname);
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={`tab${on ? ' is-on' : ''}`}
            aria-current={on ? 'page' : undefined}
          >
            <span className="tab__cap" />
            <IconPair name={n.ico} size={24} active={on} />
            <span className="tab__label">{t(n.label)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function Rail() {
  const { pathname } = useLocation();
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  return (
    <aside className="rail" aria-label="Navigation">
      <NavLink to="/" className="rail__brand" aria-label="Tsugi — Home">
        <img className="rail__logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="" width={38} height={38} />
        <span>
          <span className="rail__name">Tsugi</span>
          <span className="rail__sub">Anitracker</span>
        </span>
      </NavLink>
      <button type="button" className="railitem" style={{ marginBottom: 10 }} onClick={openSearch}>
        <Icon name="search" size={20} />
        <span>{t('search')}</span>
        <kbd style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-num)' }}>/</kbd>
      </button>
      {NAV.map((n) => {
        const on = navActive(n.to, n.end, pathname);
        return (
          <NavLink key={n.to} to={n.to} end={n.end} className={`railitem${on ? ' is-on' : ''}`}>
            <IconPair name={n.ico} size={21} active={on} />
            <span>{t(n.label)}</span>
          </NavLink>
        );
      })}
      <p className="rail__foot">{t('sidebarTagline')}</p>
    </aside>
  );
}

function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <>
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" role="status" data-st={toast.kind === 'error' ? 'planned' : 'watching'}>
          <span className="toast__ico">
            <Icon name={toast.kind === 'error' ? 'info' : 'check'} size={18} filled />
          </span>
          <span>{toast.text}</span>
        </div>
      ))}
    </>
  );
}

function RouteSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="skel" style={{ height: 34, width: 200, borderRadius: 8 }} />
      <div className="skel" style={{ height: 14, width: 280, marginTop: 12, borderRadius: 6 }} />
      <div className="grid" style={{ marginTop: 26 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skel" style={{ aspectRatio: '2 / 3' }} />
        ))}
      </div>
    </div>
  );
}

function screenTitle(pathname: string, t: ReturnType<typeof useT>): string {
  const hit = NAV.find((n) => navActive(n.to, n.end, pathname));
  return hit ? t(hit.label) : 'Tsugi';
}

function AppFrame() {
  const location = useLocation();
  const t = useT();
  const tone = useTone((s) => s.tone);
  const paneRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Beim Bildschirmwechsel Inhalt nach oben und Kante zurücksetzen.
  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
    setScrolled(false);
  }, [location.pathname, setScrolled]);

  return (
    <div className="app" data-st={tone}>
      <Rail />
      <TopBar scrolled={scrolled} title={screenTitle(location.pathname, t)} />
      <main
        className="pane"
        ref={paneRef}
        tabIndex={-1}
        onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 12)}
      >
        <div className="pane__inner">
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
        </div>
      </main>
      <TabBar />
    </div>
  );
}

function GlobalHotkeys() {
  const openSearch = useSearchOverlay((s) => s.open);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!typing && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k'))) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);
  return null;
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

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!authReady) return;
    if (user) void syncFromRemote(user.id);
    else resetLocal();
  }, [authReady, user, syncFromRemote, resetLocal]);

  useStartupScan();

  if (!authReady) {
    return (
      <div style={{ display: 'grid', minHeight: '100dvh', placeItems: 'center' }}>
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          width={40}
          height={40}
          className="skel"
          style={{ width: 40, height: 40, borderRadius: 12, opacity: 0.6 }}
        />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <HashRouter>
      <GlobalHotkeys />
      <AppFrame />
      <SearchOverlay />
      <Toasts />
    </HashRouter>
  );
}
