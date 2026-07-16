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
        accent: '#00f5d4',
        'accent-deep': '#0b6e63',
        purple: '#8a2be2',
        pink: '#ff0055',
        blue: '#3a86ff',
        green: '#2ecc71',
        amber: '#f5a524',
        rose: '#ff4757',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        ctl: '8px',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0,245,212,0.35)',
        'glow-purple': '0 0 20px rgba(138,43,226,0.45)',
        'glow-pink': '0 0 22px rgba(255,0,85,0.4)',
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
