import { useEffect } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useLibrary } from '@/store/library';
import { useAuth } from '@/store/auth';
import { useToasts } from '@/store/toast';
import { useStartupScan } from '@/lib/scan';
import { useT } from '@/i18n';
import { AuthScreen } from '@/components/AuthScreen';
import { HomePage } from '@/pages/HomePage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { DetailPage } from '@/pages/DetailPage';
import { StatsPage } from '@/pages/StatsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SearchOverlay } from '@/components/SearchOverlay';
import { useSearchOverlay } from '@/components/searchStore';
import {
  IconChart,
  IconCompass,
  IconGear,
  IconHome,
  IconSearch,
  IconStack,
} from '@/components/icons';
import type { DictKey } from '@/i18n';

const NAV: Array<{ to: string; label: DictKey; Icon: typeof IconHome; end: boolean }> = [
  { to: '/', label: 'navHome', Icon: IconHome, end: true },
  { to: '/entdecken', label: 'navDiscover', Icon: IconCompass, end: false },
  { to: '/bibliothek', label: 'navLibrary', Icon: IconStack, end: false },
  { to: '/statistik', label: 'navStats', Icon: IconChart, end: false },
  { to: '/einstellungen', label: 'navSettings', Icon: IconGear, end: false },
];

function Wordmark() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5 px-1" aria-label="Tsugi-Anitracker — Home">
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-ctl shadow-glow-purple"
      />
      <span className="hidden font-display text-lg font-semibold leading-tight tracking-tight text-ink lg:block">
        Tsugi
        <span className="block text-[11px] font-sans font-medium tracking-wide text-ink-dim">
          Anitracker
        </span>
      </span>
    </NavLink>
  );
}

function Sidebar() {
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  return (
    <aside className="fixed inset-y-0 left-0 z-sticky hidden w-16 flex-col gap-6 border-r border-line bg-bg px-2.5 py-5 md:flex lg:w-52 lg:px-4">
      <Wordmark />
      <button
        type="button"
        onClick={openSearch}
        className="flex items-center gap-3 rounded-ctl border border-line bg-surface px-2.5 py-2 text-ink-dim transition-colors duration-150 hover:border-accent hover:text-ink"
      >
        <IconSearch className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm lg:block">{t('search')}</span>
        <kbd className="ml-auto hidden rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-faint lg:block">
          /
        </kbd>
      </button>
      <nav className="flex flex-col gap-1" aria-label="Navigation">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-ctl px-2.5 py-2.5 text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-raised font-semibold text-accent'
                  : 'text-ink-dim hover:bg-surface hover:text-ink'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block">{t(label)}</span>
          </NavLink>
        ))}
      </nav>
      <p className="mt-auto hidden px-1 text-xs leading-5 text-ink-faint lg:block">
        {t('sidebarTagline')}
        <br />
        Tsugi-Anitracker · V2
      </p>
    </aside>
  );
}

/**
 * Mobile-Kopfleiste: die Sidebar (samt Logo) ist unter `md` komplett
 * ausgeblendet, wodurch auf dem Handy sowohl das Logo als auch der einzige
 * Weg zur Suche/zum Hinzufügen-Flow verschwanden. `position: fixed` statt
 * `sticky` — mit `overflow-x: hidden` auf html/body (App-Feeling-Fix)
 * verlor eine sticky Leiste sonst ihre Fixierung beim Scrollen in Safari.
 * Ein Platzhalter gleicher Höhe direkt danach schiebt den Inhalt runter,
 * damit nichts unter der fest positionierten Leiste verschwindet.
 */
function MobileHeader() {
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  return (
    <>
      <header
        className="ios-glass-strong fixed inset-x-0 top-0 z-sticky flex items-center justify-between border-b border-white/5 px-4 py-2.5 md:hidden"
        style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))' }}
      >
        <NavLink to="/" className="flex items-center gap-2.5" aria-label="Tsugi-Anitracker — Home">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-[11px] shadow-glow-purple"
          />
          <span className="font-display text-[18px] font-semibold tracking-tight text-ink">Tsugi</span>
        </NavLink>
        <button
          type="button"
          onClick={openSearch}
          aria-label={t('search')}
          className="ios-spec press grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.07] text-accent"
        >
          <IconSearch className="h-[18px] w-[18px]" />
        </button>
      </header>
      <div aria-hidden className="md:hidden" style={{ height: 'calc(60px + env(safe-area-inset-top))' }} />
    </>
  );
}

function BottomBar() {
  const t = useT();
  const { pathname } = useLocation();
  // Aktives Tab bestimmen — das gleitende Glas-Highlight wandert dorthin.
  const matchIdx = NAV.findIndex(({ to, end }) =>
    end ? pathname === to : to !== '/' && (pathname === to || pathname.startsWith(`${to}/`)),
  );
  const hasActive = matchIdx !== -1;
  const activeIndex = hasActive ? matchIdx : 0;

  return (
    <nav
      aria-label="Navigation"
      className="ios-glass ios-spec fixed inset-x-3 z-sticky flex h-[70px] items-stretch overflow-hidden rounded-[28px] shadow-glass-lift md:hidden"
      style={{ bottom: 'calc(4px + env(safe-area-inset-bottom))' }}
    >
      {/* Gleitende Liquid-Glass-Kapsel hinter dem aktiven Tab (iOS 26). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-2 left-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: `${100 / NAV.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
          opacity: hasActive ? 1 : 0,
        }}
      >
        <span className="absolute inset-x-[7px] inset-y-0 rounded-[18px] border border-white/15 bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_14px_-3px_rgba(0,245,212,0.4)]" />
      </span>

      {NAV.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `press relative z-10 flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold tracking-tight transition-colors duration-200 ${
              isActive ? 'text-accent' : 'text-ink-faint'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={`h-[25px] w-[25px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isActive ? '-translate-y-px scale-110' : ''
                }`}
              />
              {t(label)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-toast flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`toast-in pointer-events-auto rounded-ctl border px-4 py-2.5 text-sm font-medium shadow-lg ${
            t.kind === 'error'
              ? 'border-rose/40 bg-surface text-rose'
              : 'border-accent/30 bg-raised text-ink'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Remount-keyed wrapper so route changes crossfade. */
function ViewFrame() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="view-enter">
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/entdecken" element={<DiscoverPage />} />
        <Route path="/bibliothek" element={<LibraryPage />} />
        <Route path="/anime/:id" element={<DetailPage />} />
        <Route path="/statistik" element={<StatsPage />} />
        <Route path="/einstellungen" element={<SettingsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
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

  // Update-Scan: einmal pro App-Öffnung nach neuen Staffeln/Ankündigungen schauen.
  // Muss als Hook unbedingt aufgerufen werden (Rules of Hooks) — scan.ts wartet
  // selbst auf `hydrated` und pusht nur, wenn ein Nutzer angemeldet ist.
  useStartupScan();

  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 animate-pulse rounded-ctl opacity-60"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <HashRouter>
      <GlobalHotkeys />
      <Sidebar />
      <main className="min-h-screen pb-[calc(112px+env(safe-area-inset-bottom))] md:pb-10 md:pl-16 lg:pl-52">
        <MobileHeader />
        <div className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 md:pt-8">
          <ViewFrame />
        </div>
      </main>
      <BottomBar />
      <SearchOverlay />
      <Toasts />
    </HashRouter>
  );
}
