import { useEffect } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useLibrary } from '@/store/library';
import { useToasts } from '@/store/toast';
import { useStartupScan } from '@/lib/scan';
import { useT } from '@/i18n';
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
  { to: '/einstellungen', label: 'navMore', Icon: IconGear, end: false },
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

function BottomBar() {
  const t = useT();
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-line bg-bg/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-150 ${
              isActive ? 'text-accent' : 'text-ink-dim'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}

function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-toast flex flex-col items-center gap-2 px-4 md:bottom-6">
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
  const hydrate = useLibrary((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Update-Scan: einmal pro App-Öffnung nach neuen Staffeln/Ankündigungen schauen.
  useStartupScan();

  return (
    <HashRouter>
      <GlobalHotkeys />
      <Sidebar />
      <main className="min-h-screen pb-24 md:pb-10 md:pl-16 lg:pl-52">
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
