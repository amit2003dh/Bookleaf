/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',
        darkCard: '#1e293b',
        glassBg: 'rgba(30, 41, 59, 0.7)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        accentPrimary: '#6366f1',
        accentSecondary: '#4f46e5',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
