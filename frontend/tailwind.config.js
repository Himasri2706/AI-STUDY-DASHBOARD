/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        prime: '#0f172a',
        sec: '#1e293b',
        accent: '#3b82f6',
      }
    },
  },
  plugins: [],
}
