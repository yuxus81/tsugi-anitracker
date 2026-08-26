import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Icon, IconPair, ICON_NAMES, type IconName } from '@/components/Icon';
import { STATUS_THEME } from '@/domain/status';
import { STATUS_ORDER } from '@/store/library';

/**
 * Icon-Paare sind laut V5-Übergabe der größte einzelne Hebel gegen den
 * „Website"-Eindruck: Kontur = aus, Füllung = an. Der gleichmäßige
 * 2-px-Strich über alles war das deutlichste Boilerplate-Zeichen.
 */

function svgIn(container: HTMLElement, selector: string): SVGElement {
  const el = container.querySelector(selector);
  if (!el) throw new Error(`Kein Element für „${selector}" gefunden`);
  return el as SVGElement;
}

describe('Icon', () => {
  test('zeichnet die Kontur-Fassung mit Strich, ohne Füllung', () => {
    const { container } = render(<Icon name="home" />);
    const svg = svgIn(container, 'svg');

    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('fill')).toBe('none');
  });

  test('zeichnet die gefüllte Fassung als Fläche, ohne Strich', () => {
    const { container } = render(<Icon name="home" filled />);
    const svg = svgIn(container, 'svg');

    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.getAttribute('stroke')).toBe('none');
  });

  test('Kontur und Füllung sind wirklich verschiedene Zeichnungen', () => {
    // Ein Paar, bei dem beide Fassungen identisch sind, hätte den Effekt
    // nicht — dann wäre es nur ein Farbwechsel.
    const kontur = render(<Icon name="home" />).container.innerHTML;
    const fuellung = render(<Icon name="home" filled />).container.innerHTML;

    expect(kontur).not.toBe(fuellung);
  });

  test('bleibt für Screenreader unsichtbar — die Beschriftung trägt der Knopf', () => {
    const { container } = render(<Icon name="search" />);

    expect(svgIn(container, 'svg').getAttribute('aria-hidden')).toBe('true');
  });

  test('nimmt die gewünschte Größe an', () => {
    const { container } = render(<Icon name="star" size={16} />);
    const svg = svgIn(container, 'svg');

    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
  });

  test('fällt auf die Kontur zurück, wenn es keine gefüllte Fassung gibt', () => {
    // `filled` ist ein Wunsch, kein Versprechen — ein leeres SVG wäre
    // schlimmer als die Konturfassung.
    const ohneFuellung = ICON_NAMES.filter((n) => !hasFilledVariant(n));
    if (ohneFuellung.length === 0) return; // alle haben eine — nichts zu prüfen

    const { container } = render(<Icon name={ohneFuellung[0]} filled />);

    expect(svgIn(container, 'svg').innerHTML.trim()).not.toBe('');
  });
});

/** Hilfsabfrage über das gerenderte Ergebnis, nicht über Interna. */
function hasFilledVariant(name: IconName): boolean {
  const { container } = render(<Icon name={name} filled />);
  const gefuellt = container.querySelector('svg')?.getAttribute('fill') === 'currentColor';
  return gefuellt;
}

describe('IconPair', () => {
  test('legt beide Fassungen übereinander, damit der Wechsel animierbar ist', () => {
    const { container } = render(<IconPair name="home" />);

    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  test('markiert den aktiven Zustand, damit die Füllung einblendet', () => {
    const { container } = render(<IconPair name="home" active />);

    expect(container.querySelector('.ico-pair')).toHaveClass('is-on');
  });

  test('ist im Ruhezustand nicht markiert', () => {
    const { container } = render(<IconPair name="home" />);

    expect(container.querySelector('.ico-pair')).not.toHaveClass('is-on');
  });
});

describe('Vollständigkeit', () => {
  test('jede Kategorie findet ihr Zeichen im Icon-Satz', () => {
    for (const status of STATUS_ORDER) {
      const name = STATUS_THEME[status].icon;
      expect(ICON_NAMES, `Zeichen „${name}" für Kategorie „${status}" fehlt`).toContain(name);
    }
  });

  test('die fünf Navigationszeichen sind da', () => {
    for (const name of ['home', 'compass', 'stack', 'chart', 'gear'] as const) {
      expect(ICON_NAMES).toContain(name);
    }
  });

  test('kein Zeichen zeichnet nichts', () => {
    for (const name of ICON_NAMES) {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')?.innerHTML.trim(), `„${name}" ist leer`).not.toBe('');
    }
  });
});

describe('Ersatz für die alten Icons', () => {
  test('alle Zeichen, die die bestehende App benutzt, gibt es weiterhin', () => {
    // Sonst fällt beim Umbau still ein Symbol aus der Oberfläche.
    const gebraucht = [
      'plus', 'minus', 'check', 'x', 'left', 'right', 'down', 'search', 'star',
      'play', 'pause', 'calendar', 'download', 'upload', 'trash', 'arrow',
      'film', 'sparkle', 'grip', 'clock', 'scissors', 'dots', 'dice',
    ] as const;

    for (const name of gebraucht) {
      expect(ICON_NAMES, `„${name}" fehlt im neuen Satz`).toContain(name);
    }
  });
});

describe('Zugänglichkeit im Zusammenspiel', () => {
  test('ein Knopf mit Icon behält seinen zugänglichen Namen', () => {
    render(
      <button type="button" aria-label="Suche öffnen">
        <Icon name="search" />
      </button>,
    );

    expect(screen.getByRole('button', { name: 'Suche öffnen' })).toBeInTheDocument();
  });
});
