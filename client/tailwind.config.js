/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#070a11',
          panel: 'rgba(13, 20, 36, 0.75)',
          border: 'rgba(45, 75, 120, 0.35)',
          cyan: '#00f3ff',
          amber: '#ffb703',
          red: '#ff2a6d',
          green: '#00ff9d',
          muted: '#8ba2c4'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Share Tech Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'hud-cyan': '0 0 15px rgba(0, 243, 255, 0.25)',
        'hud-red': '0 0 20px rgba(255, 42, 109, 0.35)',
        'hud-amber': '0 0 15px rgba(255, 183, 3, 0.25)',
      },
    },
  },
  plugins: [],
}
