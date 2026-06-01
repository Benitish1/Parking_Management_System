// tailwind.config.js — configures Tailwind CSS for the project.
// It tells Tailwind where to find class names, how dark mode works, and extends
// the default design system with the app's custom colors, shadows, and animations.

/** @type {import('tailwindcss').Config} */
export default {
  // 'class' = dark mode turns on when the <html> element has the `dark` class
  // (toggled by ThemeContext), rather than following the OS setting.
  darkMode: 'class',
  // Files Tailwind scans for class names so it only generates CSS that's actually used.
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // `extend` ADDS to Tailwind's defaults instead of replacing them.
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      // Custom palettes usable as utility classes, e.g. bg-brand-500, text-accent-cyan.
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          purple: '#a855f7',
          cyan: '#22d3ee',
          emerald: '#34d399',
          pink: '#ec4899',
        },
        ink: {
          950: '#070b18',
          900: '#0b1020',
          850: '#0f152a',
          800: '#141b32',
          700: '#1c2540',
        },
      },
      // Custom shadows for the glassy/glowing card look, e.g. shadow-glow.
      boxShadow: {
        glow: '0 0 40px -8px rgba(99,102,241,0.55)',
        'glow-purple': '0 0 40px -8px rgba(168,85,247,0.55)',
        soft: '0 10px 40px -12px rgba(0,0,0,0.35)',
        card: '0 8px 30px rgba(0,0,0,0.12)',
      },
      // Reusable gradient/mesh backgrounds, e.g. bg-brand-gradient, bg-mesh.
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%)',
        'mesh': 'radial-gradient(at 0% 0%, rgba(99,102,241,0.25) 0, transparent 50%), radial-gradient(at 100% 0%, rgba(168,85,247,0.22) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(34,211,238,0.15) 0, transparent 50%)',
      },
      // keyframes define the animation steps; `animation` below names + times them.
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      // Named animation utilities, e.g. animate-float (gentle hover), animate-shimmer (loading skeletons).
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.5s ease-out',
      },
    },
  },
  // No extra Tailwind plugins are used in this project.
  plugins: [],
};
