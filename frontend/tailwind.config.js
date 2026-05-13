/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PostHog 暖色调
        'p-primary': '#f7a501',
        'p-primary-pressed': '#dd9001',
        'p-primary-active': '#b17816',
        'p-on-primary': '#23251d',
        'p-ink': '#23251d',
        'p-body': '#4d4f46',
        'p-charcoal': '#33342d',
        'p-mute': '#6c6e63',
        'p-ash': '#9b9c92',
        'p-stone': '#b6b7af',
        'p-hair': '#bfc1b7',
        'p-hair-soft': '#dcdfd2',
        'p-canvas': '#eeefe9',
        'p-surface-soft': '#f5f4f0',
        'p-surface-card': '#ffffff',
        'p-surface-doc': '#fcfcfa',
        'p-link': '#1d4ed8',
        'p-link-teal': '#1078a3',
        'p-accent-red': '#cd4239',
        // 暖色图表色板
        'chart-1': '#f7a501',
        'chart-2': '#e07830',
        'chart-3': '#cd4239',
        'chart-4': '#d4563a',
        'chart-5': '#c26e3a',
        'chart-6': '#b17816',
        'chart-7': '#8b6914',
        'chart-8': '#a0522d',
        'chart-9': '#6b8e23',
        'chart-10': '#3a7d44',
        'chart-11': '#1078a3',
        'chart-12': '#0ea5e9',
      },
      fontFamily: {
        'ph': ["'IBM Plex Sans'", "'Inter'", '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'p-xs': '4px',
        'p-sm': '6px',
        'p-md': '8px',
        'p-lg': '12px',
        'p-xl': '16px',
        'p-2xl': '20px',
        'p-full': '9999px',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
