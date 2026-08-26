import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon, IconPair, type IconName } from '@/components/Icon';
import { useSearchOverlay } from '@/components/searchStore';
import { statusTone } from '@/domain/status';
import { useT, type DictKey } from '@/i18n';
import type { WatchStatus } from '@/store/library';

/**
 * DER GERÄTERAHMEN.
 *
 * Kernthese des V5-Designs: Kopfleiste, Tab-Leiste und Seitenschiene gehören
 * zum Gerät und bewegen sich NIE. Gescrollt wird ausschließlich `.pane`.
 * Eine Website scrollt als Ganzes — eine App nicht. Das ist der Unterschied,
 * den man ohne Worte spürt.
 *
 * Ab 900 px wird aus der Tab-Leiste unten eine Seitenschiene links; beides
 * steht gleichzeitig im Baum, sichtbar ist immer nur eines (CSS entscheidet).
 * Das kostet ein paar Knoten und spart einen Zustand, der sonst zwischen
 * JavaScript und CSS auseinanderlaufen könnte.
 */

export interface NavEntry {
  to: string;
  label: DictKey;
  icon: IconName;
  /** Nur exakt dieser Pfad zählt als aktiv (sonst wäre „/" immer aktiv). */
  end: boolean;
  /** Farbrolle des Rahmens auf diesem Bildschirm. */
  tone: WatchStatus;
}

export const NAV: NavEntry[] = [
  { to: '/', label: 'navHome', icon: 'home', end: true, tone: 'watching' },
  { to: '/entdecken', label: 'navDiscover', icon: 'compass', end: false, tone: 'watching' },
  { to: '/bibliothek', label: 'navLibrary', icon: 'stack', end: false, tone: 'planned' },
  { to: '/statistik', label: 'navStats', icon: 'chart', end: false, tone: 'completed' },
  { to: '/einstellungen', label: 'navSettings', icon: 'gear', end: false, tone: 'nextup' },
];

/**
 * Welcher Navigationspunkt zum aktuellen Pfad gehört. Eine Detailseite hat
 * keinen eigenen Tab — sie hält die Bibliothek markiert, weil man von dort
 * kommt. Ohne das wäre auf der Detailseite gar kein Tab aktiv, und die
 * Leiste sähe für einen Moment tot aus.
 */
export function activeNav(pathname: string): NavEntry | undefined {
  if (pathname.startsWith('/anime/')) return NAV.find((n) => n.to === '/bibliothek');
  return NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
}

function Brand({ variant }: { variant: 'topbar' | 'rail' }) {
  const gross = variant === 'rail';
  return (
    <Link to="/" className={`${variant}__brand`} aria-label="Tsugi-Anitracker — Home">
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt=""
        width={gross ? 38 : 30}
        height={gross ? 38 : 30}
        className={`${variant}__logo`}
      />
      {gross ? (
        <span>
          <span className="rail__name">Tsugi</span>
          <span className="rail__sub">Anitracker</span>
        </span>
      ) : (
        <span className="topbar__name">Tsugi</span>
      )}
    </Link>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const t = useT();
  const openSearch = useSearchOverlay((s) => s.open);

  const paneRef = useRef<HTMLElement>(null);
  const topbarRef = useRef<HTMLElement>(null);

  const aktiv = activeNav(pathname);
  const tone = statusTone(aktiv?.tone);
  const titel = aktiv ? t(aktiv.label) : 'Tsugi';

  /**
   * Die Kopfleiste bekommt Kante und Titel erst, sobald Inhalt darunter
   * durchläuft. Der Schwellwert liegt bei 12 px, damit ein Gummiband-Zupfer
   * auf iOS die Kante nicht flackern lässt.
   */
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    const onScroll = () => {
      topbarRef.current?.classList.toggle('is-scrolled', pane.scrollTop > 12);
    };
    pane.addEventListener('scroll', onScroll, { passive: true });
    return () => pane.removeEventListener('scroll', onScroll);
  }, []);

  /**
   * Bildschirmwechsel: nach oben und Kante zurücknehmen. Ohne das trüge der
   * neue, ungescrollte Bildschirm die Kante der vorherigen Seite mit sich.
   */
  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
    topbarRef.current?.classList.remove('is-scrolled');
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement | null;
      const tippt =
        ziel?.tagName === 'INPUT' || ziel?.tagName === 'TEXTAREA' || ziel?.isContentEditable;
      if (tippt) return;
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);

  /**
   * Bewusst `Link` statt `NavLink`: `NavLink` bestimmt „aktiv" selbst aus
   * dem Pfad und überschreibt dabei `aria-current`. Damit ließe sich die
   * Regel „Detailseite hält die Bibliothek markiert" nicht ausdrücken —
   * `activeNav` ist hier die einzige Wahrheit.
   */
  const istAktiv = (n: NavEntry) => n.to === aktiv?.to;
  // `key` gehört NICHT hier hinein: React verlangt den Schlüssel direkt am
  // Element, nicht über ein gespreiztes Objekt — sonst kommt er nie beim
  // Abgleich an und React warnt zu Recht.
  const navProps = (n: NavEntry) => ({
    to: n.to,
    'aria-current': istAktiv(n) ? ('page' as const) : undefined,
  });

  return (
    <div className="app" data-st={tone}>
      {/* Seitenschiene: ab 900 px sichtbar, darunter blendet CSS sie aus. */}
      <aside className="rail" aria-label={t('navMain')}>
        <Brand variant="rail" />
        <button type="button" className="railitem" onClick={openSearch}>
          <Icon name="search" size={20} />
          <span>{t('search')}</span>
          <kbd className="rail__kbd">/</kbd>
        </button>
        {NAV.map((n) => (
          <Link key={n.to} {...navProps(n)} className={`railitem${istAktiv(n) ? ' is-on' : ''}`}>
            <IconPair name={n.icon} size={21} active={istAktiv(n)} />
            <span>{t(n.label)}</span>
          </Link>
        ))}
        <p className="rail__foot">{t('sidebarTagline')}</p>
      </aside>

      <header className="topbar" ref={topbarRef}>
        <Brand variant="topbar" />
        <span className="topbar__spacer">
          <span className="topbar__title">{titel}</span>
        </span>
        <button type="button" className="iconbtn" onClick={openSearch} aria-label={t('search')}>
          <Icon name="search" size={20} filled />
        </button>
      </header>

      {/* `tabIndex={0}`, nicht `-1`: `.pane` ist der EINZIGE scrollende
          Bereich der App. Ohne Tab-Stopp kommt niemand mit der Tastatur
          allein an den Inhalt weiter unten — auf Seiten ohne Knöpfe im
          Scrollbereich (Statistik) gar nicht. axe meldet das als
          `scrollable-region-focusable`. Der Preis ist ein zusätzlicher
          Tab-Stopp vor dem Inhalt; das ist der übliche und richtige Tausch. */}
      <main className="pane" ref={paneRef} tabIndex={0}>
        <div className="pane__inner" id="main">
          {children}
        </div>
      </main>

      <nav className="tabbar" aria-label={t('navMain')}>
        {NAV.map((n) => (
          <Link key={n.to} {...navProps(n)} className={`tab${istAktiv(n) ? ' is-on' : ''}`}>
            <span className="tab__cap" aria-hidden />
            <IconPair name={n.icon} size={24} active={istAktiv(n)} />
            <span className="tab__label">{t(n.label)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
