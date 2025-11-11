/** @type {import('tailwindcss').Config} */
/**
 * Tailwind CSS configuration
 * - Quét tất cả files HTML, JS, JSX trong src để purge unused styles
 * - Sử dụng theme mặc định
 * - Không có plugins bổ sung
 */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"], // Files để quét classes
  theme: { 
    extend: {
      // Custom utilities for scrollbar
    }
  }, // Theme customization
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ], // Tailwind plugins
};
