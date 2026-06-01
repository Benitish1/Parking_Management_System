// postcss.config.js — PostCSS pipeline that processes the app's CSS at build time.
// Vite runs these plugins automatically. Order matters: Tailwind generates the
// utility CSS first, then Autoprefixer adds vendor prefixes for browser support.
export default {
  plugins: {
    tailwindcss: {}, // turns @tailwind directives + utility classes into real CSS
    autoprefixer: {}, // adds prefixes like -webkit- so styles work across browsers
  },
};
