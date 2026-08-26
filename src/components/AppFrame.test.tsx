import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppFrame, NAV } from '@/components/AppFrame';
import { useSearchOverlay } from '@/components/searchStore';

/**
 * Der Geräterahmen. Kernthese des V5-Designs: Kopfleiste und Tab-Leiste
 * gehören zum GERÄT und bewegen sich nie — gescrollt wird ausschließlich der
 * Inhaltsbereich. Eine Website scrollt als Ganzes, eine App nicht.
 *
 * Was der Browser wirklich malt (Position nach dem Scrollen, Safe-Areas),
 * kann jsdom nicht messen — das prüft der Messlauf unter Playwright. Hier
 * geht es um die Struktur, an der das hängt, und um die Bedienlogik.
 */

function frame(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppFrame>
        <p>Inhalt</p>
      </AppFrame>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useSearchOverlay.setState({ isOpen: false });
});

describe('Aufbau des Rahmens', () => {
  test('es gibt genau EINEN scrollenden Bereich', () => {
    const { container } = frame();

    expect(container.querySelectorAll('.pane')).toHaveLength(1);
  });

  test('der Inhalt liegt im scrollenden Bereich, nicht daneben', () => {
    const { container } = frame();
    const pane = container.querySelector('.pane');

    expect(within(pane as HTMLElement).getByText('Inhalt')).toBeInTheDocument();
  });

  test('Kopfleiste und Tab-Leiste liegen AUSSERHALB des scrollenden Bereichs', () => {
    // Lägen sie darin, würden sie mitscrollen — genau der Website-Eindruck,
    // den diese Version abstellt.
    const { container } = frame();
    const pane = container.querySelector('.pane') as HTMLElement;

    expect(pane.querySelector('.topbar')).toBeNull();
    expect(pane.querySelector('.tabbar')).toBeNull();
  });

  test('der scrollende Bereich ist per Tastatur erreichbar', () => {
    // Sonst käme man mit der Tastatur nie an langen Inhalt heran.
    const { container } = frame();

    expect(container.querySelector('.pane')).toHaveAttribute('tabindex', '-1');
  });
});

describe('Navigation', () => {
  test('führt die fünf Bildschirme der App', () => {
    expect(NAV.map((n) => n.to)).toEqual([
      '/',
      '/entdecken',
      '/bibliothek',
      '/statistik',
      '/einstellungen',
    ]);
  });

  test('jeder Navigationspunkt hat ein eigenes Zeichen', () => {
    const zeichen = NAV.map((n) => n.icon);

    expect(new Set(zeichen).size).toBe(NAV.length);
  });

  test('zeigt für jeden Bildschirm einen Weg dorthin', () => {
    frame();
    const nav = screen.getAllByRole('navigation')[0];

    expect(within(nav).getAllByRole('link')).toHaveLength(NAV.length);
  });

  test('markiert den aktuellen Bildschirm für Screenreader', () => {
    frame('/bibliothek');
    const nav = screen.getAllByRole('navigation')[0];
    const aktiv = within(nav).getByRole('link', { current: 'page' });

    expect(aktiv).toHaveAttribute('href', '/bibliothek');
  });

  test('markiert Home nur auf Home — nicht auf jedem Unterpfad', () => {
    frame('/statistik');
    const nav = screen.getAllByRole('navigation')[0];
    const aktiv = within(nav).getByRole('link', { current: 'page' });

    expect(aktiv).toHaveAttribute('href', '/statistik');
  });

  test('eine Detailseite hält die Bibliothek markiert — man kam von dort', () => {
    frame('/anime/123');
    const nav = screen.getAllByRole('navigation')[0];
    const aktiv = within(nav).getByRole('link', { current: 'page' });

    expect(aktiv).toHaveAttribute('href', '/bibliothek');
  });
});

describe('Farbrolle des Rahmens', () => {
  test('trägt immer eine Kategorie, damit der Schimmer oben nicht farblos bleibt', () => {
    const { container } = frame('/einstellungen');

    expect(container.querySelector('.app')).toHaveAttribute('data-st');
  });

  test('die Bibliothek färbt den Rahmen anders als die Statistik', () => {
    const bib = frame('/bibliothek').container.querySelector('.app')?.getAttribute('data-st');
    const stat = frame('/statistik').container.querySelector('.app')?.getAttribute('data-st');

    expect(bib).not.toBe(stat);
  });
});

describe('Suche', () => {
  test('die Lupe in der Kopfleiste öffnet die Suche', async () => {
    const user = userEvent.setup();
    frame();

    await user.click(screen.getAllByRole('button', { name: /such/i })[0]);

    expect(useSearchOverlay.getState().isOpen).toBe(true);
  });

  test('die Taste / öffnet die Suche', async () => {
    const user = userEvent.setup();
    frame();

    await user.keyboard('/');

    expect(useSearchOverlay.getState().isOpen).toBe(true);
  });

  test('Strg+K öffnet die Suche', async () => {
    const user = userEvent.setup();
    frame();

    await user.keyboard('{Control>}k{/Control}');

    expect(useSearchOverlay.getState().isOpen).toBe(true);
  });

  test('/ in einem Textfeld tippt einen Schrägstrich, statt die Suche zu kapern', async () => {
    const user = userEvent.setup();
    frame();
    const feld = document.createElement('input');
    document.body.appendChild(feld);
    feld.focus();

    await user.keyboard('/');

    expect(useSearchOverlay.getState().isOpen).toBe(false);
    feld.remove();
  });
});

describe('Kopfleiste beim Scrollen', () => {
  test('bekommt erst eine Kante, wenn Inhalt darunter durchläuft', () => {
    const { container } = frame();
    const pane = container.querySelector('.pane') as HTMLElement;
    const topbar = container.querySelector('.topbar') as HTMLElement;
    expect(topbar).not.toHaveClass('is-scrolled');

    Object.defineProperty(pane, 'scrollTop', { value: 80, writable: true });
    pane.dispatchEvent(new Event('scroll'));

    expect(topbar).toHaveClass('is-scrolled');
  });

  test('nimmt die Kante zurück, wenn man wieder oben ist', () => {
    const { container } = frame();
    const pane = container.querySelector('.pane') as HTMLElement;
    const topbar = container.querySelector('.topbar') as HTMLElement;

    Object.defineProperty(pane, 'scrollTop', { value: 80, writable: true, configurable: true });
    pane.dispatchEvent(new Event('scroll'));
    Object.defineProperty(pane, 'scrollTop', { value: 0, writable: true, configurable: true });
    pane.dispatchEvent(new Event('scroll'));

    expect(topbar).not.toHaveClass('is-scrolled');
  });

  test('hängt seinen Zuhörer beim Verlassen wieder ab', () => {
    const { container, unmount } = frame();
    const pane = container.querySelector('.pane') as HTMLElement;
    const ab = vi.spyOn(pane, 'removeEventListener');

    unmount();

    expect(ab).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  test('setzt die Kante beim Bildschirmwechsel zurück', async () => {
    // Sonst trüge der neue, ungescrollte Bildschirm eine Kante von der
    // vorherigen Seite mit sich herum. Der Wechsel muss ECHT sein: ein
    // erneutes Rendern mit anderen `initialEntries` navigiert nicht — der
    // MemoryRouter liest sie nur beim ersten Aufbau.
    const user = userEvent.setup();
    const { container } = frame();
    const pane = container.querySelector('.pane') as HTMLElement;
    const topbar = container.querySelector('.topbar') as HTMLElement;
    Object.defineProperty(pane, 'scrollTop', { value: 80, writable: true, configurable: true });
    pane.dispatchEvent(new Event('scroll'));
    expect(topbar).toHaveClass('is-scrolled');

    const nav = screen.getAllByRole('navigation')[0];
    await user.click(within(nav).getByRole('link', { name: /statistik/i }));

    expect(topbar).not.toHaveClass('is-scrolled');
  });

  test('scrollt beim Bildschirmwechsel wieder nach oben', async () => {
    // Ohne das startet der neue Bildschirm mitten im Inhalt.
    const user = userEvent.setup();
    const { container } = frame();
    const pane = container.querySelector('.pane') as HTMLElement;
    const scrollTo = vi.spyOn(pane, 'scrollTo');

    const nav = screen.getAllByRole('navigation')[0];
    await user.click(within(nav).getByRole('link', { name: /statistik/i }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });
});
