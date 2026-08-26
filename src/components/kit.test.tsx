import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { Bar, Button, EmptyState, IconButton, Pips, Ring, SectionHead, Segmented, Stepper, Tag } from '@/components/kit';

/**
 * Die Bedienelemente des V5-Designs. Geprüft wird ihr VERHALTEN und ihre
 * Zugänglichkeit — nicht, welche Klassen sie tragen. Klassen sind Umsetzung;
 * ein Test, der an ihnen klebt, bricht bei jeder Umbenennung, ohne dass
 * irgendetwas kaputt wäre.
 *
 * Ausnahme sind die Stellen, an denen eine Klasse eine ZUSAGE ist — etwa
 * `data-st`, an dem die gesamte Farbrolle hängt.
 */

describe('Button', () => {
  test('löst beim Klicken aus', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Weiter</Button>);

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  test('ist immer type=button — sonst schickt er versehentlich Formulare ab', () => {
    render(<Button onClick={() => {}}>Weiter</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  test('löst im deaktivierten Zustand nicht aus', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Weiter
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  test('das Zeichen bleibt für Screenreader stumm — die Beschriftung trägt der Text', () => {
    render(
      <Button onClick={() => {}} icon="play">
        Weiter mit Ep. 4
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Weiter mit Ep. 4' })).toBeInTheDocument();
  });

  test('meldet dem Screenreader, wenn er gerade arbeitet', () => {
    render(
      <Button onClick={() => {}} loading>
        Speichern
      </Button>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  test('ist beim Laden nicht auslösbar — sonst schickt ein Doppelklick alles zweimal', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} loading>
        Speichern
      </Button>,
    );

    await user.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  test('trägt seinen Namen, obwohl er nur ein Zeichen zeigt', () => {
    render(<IconButton name="dice" label="Für mich entscheiden" onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Für mich entscheiden' })).toBeInTheDocument();
  });

  test('löst aus', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton name="dice" label="Würfeln" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Würfeln' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('Segmented — die Auswahlleiste mit gleitendem Daumen', () => {
  const optionen = [
    { key: 'watching' as const, label: 'Weiter schauen', count: 3, icon: 'play' as const },
    { key: 'nextup' as const, label: 'Noch zu schauen', count: 0, icon: 'ready' as const },
    { key: 'planned' as const, label: 'Watchlist', count: 12, icon: 'bookmark' as const },
  ];

  test('ist für Screenreader eine echte Registerkartenleiste', () => {
    render(<Segmented options={optionen} value="watching" onChange={() => {}} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  test('markiert genau eine Auswahl als gewählt', () => {
    render(<Segmented options={optionen} value="planned" onChange={() => {}} />);

    const gewaehlt = screen.getAllByRole('tab', { selected: true });
    expect(gewaehlt).toHaveLength(1);
    expect(gewaehlt[0]).toHaveAccessibleName(/Watchlist/);
  });

  test('meldet die neue Auswahl', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Segmented options={optionen} value="watching" onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: /Watchlist/ }));

    expect(onChange).toHaveBeenCalledWith('planned');
  });

  test('zeigt die Anzahl je Auswahl', () => {
    render(<Segmented options={optionen} value="watching" onChange={() => {}} />);

    expect(screen.getByRole('tab', { name: /Watchlist/ })).toHaveTextContent('12');
  });

  test('lässt die Null bei einer leeren Kategorie weg — eine 0 ist nur Rauschen', () => {
    render(<Segmented options={optionen} value="watching" onChange={() => {}} />);

    expect(screen.getByRole('tab', { name: /Noch zu schauen/ })).not.toHaveTextContent('0');
  });

  test('der Daumen steht über der gewählten Kachel', () => {
    // Er wird über translateX positioniert; bei Auswahl 3 von 3 sind das
    // zwei volle Breiten Versatz.
    const { container } = render(<Segmented options={optionen} value="planned" onChange={() => {}} />);
    const thumb = container.querySelector('.seg__thumb') as HTMLElement;

    expect(thumb.style.transform).toContain('200%');
  });

  test('der Daumen trägt die Farbe der gewählten Kategorie', () => {
    const { container } = render(<Segmented options={optionen} value="planned" onChange={() => {}} />);

    expect(container.querySelector('.seg')).toHaveAttribute('data-st', 'planned');
  });
});

describe('Ring — der Fortschrittsring', () => {
  test('zeichnet bei 0 % einen leeren Ring', () => {
    const { container } = render(<Ring pct={0} />);
    const bar = container.querySelector('.ring__bar') as SVGCircleElement;

    // Der Versatz ist der volle Umfang: nichts ist gezeichnet.
    expect(bar.getAttribute('stroke-dashoffset')).toBe(bar.getAttribute('stroke-dasharray'));
  });

  test('zeichnet bei 100 % einen vollen Ring', () => {
    const { container } = render(<Ring pct={1} />);
    const bar = container.querySelector('.ring__bar') as SVGCircleElement;

    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBe(0);
  });

  test('klemmt Werte über 100 %, statt rückwärts zu zeichnen', () => {
    const { container } = render(<Ring pct={3} />);
    const bar = container.querySelector('.ring__bar') as SVGCircleElement;

    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBe(0);
  });

  test('klemmt negative Werte', () => {
    const { container } = render(<Ring pct={-2} />);
    const bar = container.querySelector('.ring__bar') as SVGCircleElement;

    expect(bar.getAttribute('stroke-dashoffset')).toBe(bar.getAttribute('stroke-dasharray'));
  });

  test('zeigt seine Beschriftung, wenn eine da ist', () => {
    render(<Ring pct={0.5} label="50" />);

    expect(screen.getByText('50')).toBeInTheDocument();
  });
});

describe('Bar — der Fortschrittsbalken', () => {
  test('meldet dem Screenreader den Stand als Zahl', () => {
    render(<Bar pct={0.4} label="Fortschritt" />);
    const bar = screen.getByRole('progressbar', { name: 'Fortschritt' });

    expect(bar).toHaveAttribute('aria-valuenow', '40');
  });

  test('klemmt auf 0 bis 100', () => {
    render(<Bar pct={2.5} label="Fortschritt" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('Stepper — die Episodensteuerung', () => {
  test('zählt hoch', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={3} max={12} onChange={onChange} label="Episode" />);

    await user.click(screen.getByRole('button', { name: /weiter|mehr|\+/i }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  test('zählt runter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper value={3} max={12} onChange={onChange} label="Episode" />);

    await user.click(screen.getByRole('button', { name: /zurück|weniger|−|-/i }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('kann bei 0 nicht weiter zurück', () => {
    render(<Stepper value={0} max={12} onChange={() => {}} label="Episode" />);

    expect(screen.getByRole('button', { name: /zurück/i })).toBeDisabled();
  });

  test('kann am Ende der Staffel nicht weiter vor', () => {
    render(<Stepper value={12} max={12} onChange={() => {}} label="Episode" />);

    expect(screen.getByRole('button', { name: /weiter/i })).toBeDisabled();
  });

  test('zeigt den aktuellen Wert', () => {
    render(<Stepper value={7} max={12} onChange={() => {}} label="Episode" />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  test('läuft ohne bekannte Folgenzahl weiter hoch, statt bei 0 festzustecken', () => {
    // Bei laufenden Staffeln ist `episodes` oft null.
    render(<Stepper value={5} max={null} onChange={() => {}} label="Episode" />);

    expect(screen.getByRole('button', { name: /weiter/i })).not.toBeDisabled();
  });
});

describe('Tag — die Statusmarke', () => {
  test('trägt die Farbrolle ihrer Kategorie', () => {
    const { container } = render(<Tag status="completed" />);

    expect(container.querySelector('.tag')).toHaveAttribute('data-st', 'completed');
  });

  test('nennt die Kategorie im Klartext', () => {
    render(<Tag status="planned" />);

    expect(screen.getByText(/watchlist/i)).toBeInTheDocument();
  });

  test('kann einen eigenen Text tragen', () => {
    render(<Tag status="continuation" text="Herbst 2027" />);

    expect(screen.getByText('Herbst 2027')).toBeInTheDocument();
  });
});

describe('SectionHead', () => {
  test('ist eine echte Überschrift, keine fette Zeile', () => {
    render(<SectionHead title="Watchlist" />);

    expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
  });

  test('zeigt eine Anzahl, wenn sie mitgegeben wird', () => {
    render(<SectionHead title="Watchlist" count={12} />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('unterschlägt die Null nicht, wenn sie ausdrücklich gemeint ist', () => {
    render(<SectionHead title="Watchlist" count={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  test('sagt, was los ist, und was man tun kann', () => {
    render(
      <EmptyState
        status="planned"
        title="Deine Watchlist ist leer"
        hint="Merk dir was unter Entdecken vor."
        action={<Button onClick={() => {}}>Titel suchen</Button>}
      />,
    );

    expect(screen.getByText('Deine Watchlist ist leer')).toBeInTheDocument();
    expect(screen.getByText('Merk dir was unter Entdecken vor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Titel suchen' })).toBeInTheDocument();
  });

  test('trägt die Farbrolle der leeren Kategorie', () => {
    const { container } = render(<EmptyState status="nextup" title="Nichts offen" hint="…" />);

    expect(container.querySelector('.empty')).toHaveAttribute('data-st', 'nextup');
  });

  test('kommt auch ohne Handlungsangebot aus', () => {
    render(<EmptyState status="nextup" title="Nichts offen" hint="…" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Zusammenspiel', () => {
  test('eine Auswahlleiste in einem leeren Panel bleibt bedienbar', async () => {
    // Regressionsschutz: die Leiste darf nicht unter dem Leerzustand
    // verschwinden, sonst kommt man aus einer leeren Kategorie nicht raus.
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <Segmented
          options={[
            { key: 'a', label: 'Eins', count: 0, icon: 'play' },
            { key: 'b', label: 'Zwei', count: 0, icon: 'ready' },
          ]}
          value="a"
          onChange={onChange}
        />
        <EmptyState status="watching" title="Leer" hint="…" />
      </div>,
    );

    await user.click(within(screen.getByRole('tablist')).getByRole('tab', { name: /Zwei/ }));

    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('Pips (Wertung 1–10)', () => {
  test('bietet zehn Stufen an, jede mit eigenem Namen', () => {
    render(<Pips value={null} onChange={() => {}} />);

    const stufen = screen.getAllByRole('radio');
    expect(stufen).toHaveLength(10);
    expect(stufen[0]).toHaveAccessibleName(/1/);
    expect(stufen[9]).toHaveAccessibleName(/10/);
  });

  test('füllt alles bis zur gewählten Stufe — nicht nur die Stufe selbst', () => {
    render(<Pips value={7} onChange={() => {}} />);

    const an = screen.getAllByRole('radio').filter((p) => p.classList.contains('is-on'));
    expect(an).toHaveLength(7);
  });

  test('gewählt ist genau eine Stufe, auch wenn sieben gefüllt sind', () => {
    render(<Pips value={7} onChange={() => {}} />);

    const gewaehlt = screen
      .getAllByRole('radio')
      .filter((p) => p.getAttribute('aria-checked') === 'true');
    expect(gewaehlt).toHaveLength(1);
    expect(gewaehlt[0]).toHaveAccessibleName(/7/);
  });

  test('ein Klick setzt die Wertung', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pips value={null} onChange={onChange} />);

    await user.click(screen.getAllByRole('radio')[4]);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  test('ein zweiter Klick auf dieselbe Stufe nimmt die Wertung zurück', async () => {
    // Ohne diesen Weg gäbe es keinen: einmal gewertet, für immer gewertet.
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pips value={5} onChange={onChange} />);

    await user.click(screen.getAllByRole('radio')[4]);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('Segmented — Beziehung zum Inhalt', () => {
  test('ohne `panelId` verspricht kein Tab ein Panel', () => {
    // Ein `aria-controls`, das ins Leere zeigt, ist schlimmer als keines:
    // ein Screenreader kündigt eine Beziehung an, die es nicht gibt.
    render(
      <Segmented
        options={[
          { key: 'a', label: 'Eins', icon: 'play' },
          { key: 'b', label: 'Zwei', icon: 'ready' },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).not.toHaveAttribute('aria-controls');
    }
  });

  test('mit `panelId` zeigt jeder Tab auf denselben Inhaltsbereich', () => {
    render(
      <div>
        <Segmented
          options={[
            { key: 'a', label: 'Eins', icon: 'play' },
            { key: 'b', label: 'Zwei', icon: 'ready' },
          ]}
          value="a"
          onChange={() => {}}
          panelId="inhalt"
        />
        <div id="inhalt" role="tabpanel" aria-labelledby="tab-a" />
      </div>,
    );

    const tabs = screen.getAllByRole('tab');
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', 'inhalt');

    // Und der Rückweg: das Panel nennt seinen aktiven Tab beim Namen.
    expect(tabs[0]).toHaveAttribute('id', 'tab-a');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Eins/);
  });
});

describe('Segmented — Farbrolle', () => {
  test('nimmt standardmäßig die gewählte Kategorie als Farbrolle', () => {
    render(
      <Segmented
        options={[
          { key: 'watching', label: 'Eins', icon: 'play' },
          { key: 'completed', label: 'Zwei', icon: 'seal' },
        ]}
        value="completed"
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('tablist')).toHaveAttribute('data-st', 'completed');
  });

  test('eine Leiste ohne Kategorien bekommt eine eigene Rolle mitgegeben', () => {
    // Der Sprachumschalter hat die Werte „de"/„en". Ohne eigene Angabe stünde
    // dort `data-st="de"` — eine Rolle, die es in der Farbwelt nicht gibt,
    // und der Daumen erbte irgendeine Farbe von weiter oben.
    render(
      <Segmented
        options={[
          { key: 'de', label: 'Deutsch', icon: 'globe' },
          { key: 'en', label: 'Englisch', icon: 'globe' },
        ]}
        value="de"
        onChange={() => {}}
        tone="watching"
      />,
    );

    expect(screen.getByRole('tablist')).toHaveAttribute('data-st', 'watching');
  });
});
