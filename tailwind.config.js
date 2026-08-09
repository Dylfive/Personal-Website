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
          amber: "rgb(var(--accent-primary-rgb) / <alpha-value>)",
          amber2: "rgb(var(--accent-secondary-rgb) / <alpha-value>)",
          slate: "rgb(var(--accent-secondary-rgb) / <alpha-value>)",
          slate2: "rgb(var(--accent-primary-rgb) / <alpha-value>)",
        },
        // Dynamic theme aliases so legacy components switch colors automatically
        neon: {
          purple: "rgb(var(--accent-primary-rgb) / <alpha-value>)",
          blue:   "rgb(var(--accent-secondary-rgb) / <alpha-value>)",
          cyan:   "rgb(var(--accent-secondary-rgb) / <alpha-value>)",
          magenta:"rgb(var(--accent-primary-rgb) / <alpha-value>)",
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
