/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#fef7f0',
          100: '#fdebd9',
          200: '#fad5b1',
          300: '#f6b77f',
          400: '#f1904b',
          500: '#ed7426',
          600: '#de5a1c',
          700: '#b84419',
          800: '#93371c',
          900: '#77301a',
        },
        sage: {
          50: '#f6f7f4',
          100: '#e3e7dd',
          200: '#c8d0be',
          300: '#a6b396',
          400: '#859574',
          500: '#687856',
          600: '#515f43',
          700: '#414b37',
          800: '#363e2f',
          900: '#2f3529',
        }
      },
      fontFamily: {
        display: ['"Fredoka"', 'sans-serif'],
        body: ['"Nunito"', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-soft': 'pulse 3s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop': 'pop 0.3s ease-out',
        'confetti': 'confetti 1s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
