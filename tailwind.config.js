/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'oklch(0.115 0 0)',
        surface: 'oklch(0.155 0 0)',
        raised: 'oklch(0.20 0 0)',
        line: 'oklch(0.27 0 0)',
        ink: 'oklch(0.93 0 0)',
        'ink-dim': 'oklch(0.70 0 0)',
        'ink-faint': 'oklch(0.55 0 0)',
        jade: 'oklch(0.72 0.17 155)',
        'jade-deep': 'oklch(0.46 0.11 155)',
        amber: 'oklch(0.78 0.14 80)',
        rose: 'oklch(0.68 0.16 15)',
        blue: 'oklch(0.72 0.12 250)',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        ctl: '8px',
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
