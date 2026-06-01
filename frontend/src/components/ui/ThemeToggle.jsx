/*
 * ThemeToggle.jsx
 * A button that switches the app between dark and light mode. It reads/updates
 * the theme from ThemeContext and swaps between a Sun (in dark mode) and Moon
 * (in light mode) icon with a little rotation animation. Used in the Topbar.
 */
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  // theme = current mode string; toggleTheme = flips it (both come from context)
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark'; // convenience boolean for picking the icon
  return (
    <button
      onClick={toggleTheme}
      className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/60 text-slate-600 transition hover:text-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
      aria-label="Toggle theme"
    >
      {/* key={theme} forces a remount on theme change so the rotate-in animation replays each toggle */}
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
        {/* Show a Sun in dark mode (tap to go light) and a Moon in light mode (tap to go dark) */}
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </motion.span>
    </button>
  );
}
