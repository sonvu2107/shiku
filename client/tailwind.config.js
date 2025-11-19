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
      // Animation và keyframes cho Aurora và Marquee
      animation: {
        aurora: "aurora 60s linear infinite",
        "infinite-scroll": "infinite-scroll 25s linear infinite",
        meteor: "meteor 5s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        spin: "spin 2s linear infinite",
        spotlight: "spotlight 2s ease .75s 1 forwards",
      },
      keyframes: {
        aurora: {
          from: { backgroundPosition: "50% 50%, 50% 50%" },
          to: { backgroundPosition: "350% 50%, 350% 50%" },
        },
        "infinite-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "rotate(215deg) translateX(-500px)", opacity: "0" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        spotlight: {
          "0%": { opacity: 0, transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: 1, transform: "translate(-50%,-40%) scale(1)" },
        },
      },
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
