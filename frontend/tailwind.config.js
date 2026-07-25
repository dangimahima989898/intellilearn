/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: 'var(--bg-navy-900)',
          800: 'var(--bg-navy-800)',
          700: 'var(--bg-navy-700)',
          600: 'var(--bg-navy-600)',
          950: 'var(--bg-navy-950)',
        },
        brand: {
          DEFAULT: 'var(--color-primary, #7B8CFF)',
          dark: 'var(--color-primary-dark, #6A7BF5)',
          light: 'var(--color-primary-light, #BAC7FB)',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
      },
    },
  },
  plugins: [],
}
