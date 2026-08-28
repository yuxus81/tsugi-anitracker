/** @type {import('tailwindcss').Config} */

/**
 * V5 „Gerät". Die Wahrheit für Farben/Werte ist src/styles/tokens.css — diese
 * Datei spiegelt sie nur, damit übrige Tailwind-Utilities (bg-surface,
 * text-ink-dim, …) dieselben Töne treffen wie die Theme-Klassen.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#06070d',
        bg: '#0d0f18',
        surface: '#141827', // --s1
        raised: '#1b2032', // --s2
        'raised-hi': '#232941', // --s2h
        sunk: '#262e48', // --s3
        edge: '#333d5e', // --s4
        line: 'rgba(241,243,249,0.09)',
        'line-2': 'rgba(241,243,249,0.16)',
        ink: '#f1f3f9',
        'ink-dim': '#a8b3cb', // --ink-2
        'ink-muted': '#8a95af', // --ink-3
        'ink-faint': '#8a95af', // --ink-3 (Altcode; AA auf --bg)
        accent: '#00f5d4', // --cy
        'accent-deep': '#0b6e63',
        blue: '#3a86ff', // --bl
        purple: '#8a2be2', // --pu
        slate: '#64789f', // --sl
        green: '#2ecc71', // --gr
        gold: '#ffcf4d', // --go
        pink: '#ff2d6f', // --pk (nur Gefahr)
        rose: '#ff2d6f',
        amber: '#ffcf4d',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        num: ['"JetBrains Mono Variable"', 'ui-monospace', 'Consolas', 'monospace'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: {
        r1: '9px',
        r2: '13px',
        r3: '18px',
        r4: '24px',
        r5: '30px',
        ctl: '9px',
        card: '13px',
        pill: '999px',
        sheet: '30px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        snap: 'cubic-bezier(0.32, 0.72, 0, 1)',
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
