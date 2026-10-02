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
        ocean: {
          950: '#020b14',
          900: '#041527',
          850: '#061e38',
          800: '#0a2a4d',
          700: '#0f3c6c',
          600: '#155291',
          500: '#1d6eb8',
          400: '#2b8fe0',
          300: '#52aff8',
          200: '#8ed0fb',
          100: '#cbe7fd',
          50: '#eef7fe',
        },
        cyan: {
          glow: '#00f0ff',
          deep: '#0891b2',
        },
        sonar: {
          ping: '#00ffcc',
          shadow: '#03080e',
          amber: '#f59e0b',
          hazard: '#ef4444',
          success: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(0, 240, 255, 0.35)',
        'glow-blue': '0 0 30px rgba(43, 143, 224, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 15, 30, 0.45)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
