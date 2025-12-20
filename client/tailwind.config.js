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
      // CSS Variables integration
      colors: {
        // Design system colors
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        'surface-active': 'var(--color-surface-active)',
        page: 'var(--color-bg)',
        'page-secondary': 'var(--color-bg-secondary)',

        // Semantic colors
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
        },
      },

      borderColor: {
        DEFAULT: 'var(--color-border)',
        light: 'var(--color-border-light)',
        focus: 'var(--color-border-focus)',
      },

      textColor: {
        primary: 'var(--color-text)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        placeholder: 'var(--color-text-placeholder)',
      },

      borderRadius: {
        DEFAULT: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },

      boxShadow: {
        DEFAULT: 'var(--shadow-md)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },

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
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        spotlight: {
          "0%": { opacity: 0, transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: 1, transform: "translate(-50%,-40%) scale(1)" },
        },
      },
    }
  }, // Theme customization
  plugins: [
    function ({ addUtilities }) {
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
