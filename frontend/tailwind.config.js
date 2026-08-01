/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        slate: {
          850: '#1e293b',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 20px 50px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.35) inset',
        'glass-hover': '0 25px 60px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        'input-focus': '0 0 0 3px rgba(34, 197, 94, 0.25)',
      },
      backdropBlur: {
        '2xl': '40px',
      }
    },
  },
  plugins: [],
}
