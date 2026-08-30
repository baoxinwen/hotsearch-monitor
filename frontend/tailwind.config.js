/** @type {import('tailwindcss').Config} */
const float = (v) => `var(--c-${v})`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: float('canvas'),
        surface: float('surface'),
        'surface-2': float('surface-2'),
        sidebar: float('sidebar'),
        hair: float('hair'),
        'hair-soft': float('hair-soft'),
        ink: float('ink'),
        body: float('body'),
        mute: float('mute'),
        ash: float('ash'),
        accent: {
          DEFAULT: float('accent'),
          hover: float('accent-hover'),
          press: float('accent-press'),
          soft: float('accent-soft'),
        },
        'on-accent': float('on-accent'),
        up: float('up'),
        down: float('down'),
        link: float('link'),
        warn: float('warn'),
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Noto Sans CJK SC',
          'sans-serif',
        ],
      },
      boxShadow: {
        pop: 'var(--shadow-pop)',
        card: 'var(--shadow-card)',
      },
      borderRadius: {
        xs: '5px', sm: '7px', md: '9px', lg: '12px', xl: '16px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
