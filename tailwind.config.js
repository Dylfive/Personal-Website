/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        background: "#0d0d0f",
        foreground: "#f0ede8",
        surface: "#161618",
        accent: {
          amber: "#f5a623",
          amber2: "#e8941a",
          slate: "#5b7fa6",
          slate2: "#7a9ec0",
        },
        // Keep legacy aliases so existing components don't break immediately
        neon: {
          purple: "#f5a623",   // remapped → amber
          blue:   "#5b7fa6",   // remapped → slate
          cyan:   "#7a9ec0",   // remapped → slate2
          magenta:"#d97706",
          green:  "#22c55e",
        },
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'spin-slower': 'spin 20s linear infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

