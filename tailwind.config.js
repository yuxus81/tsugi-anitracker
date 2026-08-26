/** @type {import('tailwindcss').Config} */

/**
 * Tailwind spricht hier dieselben Werte wie das Designsystem in
 * `src/styles/` — beides greift auf DIESELBEN CSS-Variablen zu, statt die
 * Zahlen ein zweites Mal zu führen. Ändert sich eine Farbe in
 * `src/styles/tokens.css`, ändert sie sich hier automatisch mit; es gibt
 * keine zweite Wahrheit, die veralten könnte.
 *
 * Arbeitsteilung: Tailwind macht Layout, Abstand und Typografie. Die
 * Bausteine mit Zuständen und Pseudo-Elementen (Knöpfe mit Lichtkante,
 * Karten mit fünf Charakteren, Rahmen) stehen in `src/styles/` — als
 * Klassenketten wären sie unlesbar.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  /**
   * NAMENSKOLLISION MIT DEM DESIGNSYSTEM.
   *
   * `src/styles/controls.css` bringt eine Klasse `.ring` mit — den
   * Fortschrittsring. Tailwind hat zufällig eine gleichnamige Utility, die
   * einen blauen Schlagschatten setzt, und die Utility-Schicht steht NACH
   * unseren Importen: Tailwind gewann und malte eine blaue Kiste um jeden
   * Ring. Da die App keine einzige Tailwind-`ring-*`-Klasse benutzt, wird
   * die Utility hier abgeschaltet, statt den Baustein umzubenennen.
   */
  corePlugins: {
    ringWidth: false,
    ringColor: false,
    ringOpacity: false,
    ringOffsetWidth: false,
    ringOffsetColor: false,
  },

  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        bg: 'var(--bg)',
        // Vier Flächenstufen statt zwei: --s3 (gedrückt/schwebend) und
        // --s4 (starker Rand) sind neu gegenüber dem alten Design.
        surface: 'var(--s1)',
        raised: 'var(--s2)',
        'raised-hi': 'var(--s2h)',
        sunken: 'var(--s3)',
        edge: 'var(--s4)',
        line: 'var(--line)',
        'line-strong': 'var(--line-2)',
        hair: 'var(--hair)',

        ink: 'var(--ink)',
        'ink-dim': 'var(--ink-2)',
        'ink-muted': 'var(--ink-3)',

        // Statusfarben. Jede trägt GENAU eine Bedeutung — Farbe ist hier
        // niemals Dekoration.
        accent: 'var(--cy)', // Weiter schauen
        blue: 'var(--bl)', // Noch zu schauen
        purple: 'var(--pu)', // Watchlist
        slate: 'var(--sl)', // Fortsetzung folgt (wartend) — neu
        green: 'var(--gr)', // Geschaut
        gold: 'var(--go)', // nur Wertung, kein Status
        pink: 'var(--pk)', // nur Gefahr/Löschen, kein Status

        // Schrift-taugliche Aufhellungen: die reinen Werte sind auf dunklem
        // Grund entweder zu grell (Cyan) oder zu dunkel (Purpur) für Text.
        'accent-text': 'var(--cy-t)',
        'blue-text': 'var(--bl-t)',
        'purple-text': 'var(--pu-t)',
        'slate-text': 'var(--sl-t)',
        'green-text': 'var(--gr-t)',
        'gold-text': 'var(--go-t)',
        'pink-text': 'var(--pk-t)',

        // Die Rolle des aktuellen Kontexts — gesetzt über `data-st`.
        tone: 'var(--tone, var(--cy))',
        'tone-lit': 'var(--tone-lit)',
        'tone-text': 'var(--tone-t, var(--cy-t))',
        'tone-bg': 'var(--tone-bg, var(--cy-bg))',
        'tone-on': 'var(--tone-on)',
      },
      fontFamily: {
        sans: ['Inter Variable', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Alles Gezählte läuft auf Mono mit Tabellenziffern, damit Zahlen
        // beim Hochzählen nicht springen.
        mono: ['JetBrains Mono Variable', 'ui-monospace', 'Consolas', 'monospace'],
        kana: ['Yu Gothic', 'Hiragino Sans', 'Noto Sans JP', 'MS PGothic', 'sans-serif'],
      },
      borderRadius: {
        ctl: 'var(--r-1)',
        card: 'var(--r-2)',
        panel: 'var(--r-3)',
        sheet: 'var(--r-4)',
        deep: 'var(--r-5)',
        pill: 'var(--r-pill)',
      },
      boxShadow: {
        // Lichtkante oben — das Zeichen dafür, dass etwas drückbar ist.
        lip: 'var(--lip)',
        'lip-hi': 'var(--lip-hi)',
        contact: 'var(--sh-0)',
        rise1: 'var(--sh-1)',
        rise2: 'var(--sh-2)',
        rise3: 'var(--sh-3)',
      },
      spacing: {
        pad: 'var(--pad)',
        gap: 'var(--gap)',
        tap: 'var(--tap)', // 44px Mindest-Touchziel
        topbar: 'var(--topbar)',
        tabbar: 'var(--tabbar)',
        rail: 'var(--rail)',
      },
      maxWidth: {
        wide: 'var(--wide)',
      },
      transitionTimingFunction: {
        out: 'var(--e-out)',
        // Das Zurückschnellen nach dem Druck — der Teil, der sich nach
        // Gerät anfühlt statt nach Hover-Farbe.
        spring: 'var(--e-spring)',
        snap: 'var(--e-snap)',
      },
      transitionDuration: {
        tap: '120ms',
        fast: '180ms',
        mid: '280ms',
        slow: '460ms',
      },
      zIndex: {
        sticky: '100',
        overlay: '200',
        modal: '300',
        toast: '400',
      },
    },
  },
  plugins: [],
};
