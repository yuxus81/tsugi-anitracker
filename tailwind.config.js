/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette übernommen aus AniTracker V1 (dunkles Blau + Neon-Akzente).
        bg: '#0d0f18',
        surface: '#16192b',
        raised: '#1e2338',
        line: '#262c47',
        ink: '#f1f3f9',
        'ink-dim': '#7e8da6',
        'ink-faint': '#566078',
        // Inaktive Navigations-Labels: `ink-faint` erreichte auf der Tab-Bar
        // nur 2,76:1 und lag damit unter WCAG AA (4,5:1) — ausgerechnet an der
        // meistgenutzten Stelle der App.
        'ink-muted': '#95a1b8',
        accent: '#00f5d4',
        'accent-deep': '#0b6e63',
        purple: '#8a2be2',
        pink: '#ff0055',
        blue: '#3a86ff',
        green: '#2ecc71',
        amber: '#f5a524',
        rose: '#ff4757',
        gold: '#ffcf4d',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // iOS-Maßstab: großzügigere Rundungen fürs „Apple-Glas“-Gefühl.
        card: '16px',
        ctl: '12px',
        pill: '22px',
        sheet: '28px',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0,245,212,0.35)',
        'glow-purple': '0 0 20px rgba(138,43,226,0.45)',
        'glow-pink': '0 0 22px rgba(255,0,85,0.4)',
        'glow-blue': '0 0 20px rgba(58,134,255,0.4)',
        'glow-green': '0 0 20px rgba(46,204,113,0.4)',
        'glow-amber': '0 0 20px rgba(245,165,36,0.35)',
        'glow-gold': '0 0 20px rgba(255,207,77,0.45)',
        // Liquid-Glass: weiche Tiefe + heller Spekular-Rand oben.
        glass: '0 10px 30px -8px rgba(0,0,0,0.55)',
        'glass-lift': '0 16px 40px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.16)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
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
