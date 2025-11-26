/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        whistle: {
          dark: '#050505',
          darker: '#000000',
          accent: '#00cc00',
          accent2: '#8b7355',
          green: '#00ff00',
          'green-glow': '#00dd00',
          red: '#ff3333',
          yellow: '#ffcc00',
          muted: '#888888'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Space Grotesk', 'system-ui', 'sans-serif']
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'terminal-blink': 'terminal-blink 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 204, 0, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 204, 0, 0.4)' },
        },
        'terminal-blink': {
          '0%, 100%': { borderColor: '#00cc00' },
          '50%': { borderColor: '#00dd00' },
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 204, 0, 0.15)',
        'glow-strong': '0 0 30px rgba(0, 204, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
