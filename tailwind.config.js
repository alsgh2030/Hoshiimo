// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tsukada: {
          burgundy: '#680c0c',
          darkBurgundy: '#3a0606',
          hoverBurgundy: '#500909',
          bgBeige: '#f5f2e7',
          heroBeige: '#ece6d5',
        }
      },
      fontFamily: {
        mincho: ['"Shippori Mincho B1"', 'serif'],
        antique: ['"Shippori Antique B1"', 'serif'],
      }
    },
  },
  plugins: [],
}