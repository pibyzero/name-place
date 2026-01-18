/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF7F0',
        coral: '#FF9B82',
        teal: '#7CB9B0',
        charcoal: '#2D3436',
        yellow: '#FFD97D',
      },
      fontFamily: {
        'heading': ['Nunito', 'Quicksand', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'gentle-bounce': 'gentle-bounce 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-in',
      },
      keyframes: {
        'gentle-bounce': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}