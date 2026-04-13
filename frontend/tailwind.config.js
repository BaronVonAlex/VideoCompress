/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#222222',
          green: '#00ff41',
          'green-dim': '#00cc33',
          'green-muted': '#004d14',
          amber: '#ffb000',
          red: '#ff3333',
          'text-primary': '#e0e0e0',
          'text-dim': '#666666',
        },
      },
    },
  },
  plugins: [],
};
