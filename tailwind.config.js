/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#0B1014',
          900: '#101820',
          800: '#161F29',
          700: '#1B2530',
          600: '#25313D',
          500: '#33414F',
        },
        paper: '#E8ECEF',
        muted: '#8CA0AD',
        safety: '#FFC93C',
        teal: '#2DD4BF',
        danger: '#E5484D',
        info: '#5B9BD5',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        tag: '4px',
      },
      boxShadow: {
        tag: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px -8px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
