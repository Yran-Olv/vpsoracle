/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
          card: '#0d131f',
          border: '#1f293d',
          input: '#151d2f'
        },
        oracle: {
          red: '#c74634',
          orange: '#f87171',
          gold: '#f59e0b',
          blue: '#3b82f6',
          green: '#10b981'
        },
        status: {
          ok: '#10b981',
          warning: '#f59e0b',
          risk: '#f97316',
          critical: '#ef4444',
          info: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
