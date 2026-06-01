// ThemeContext.jsx — manages the app-wide dark/light theme.
// It remembers the choice in localStorage and toggles the `dark` class on <html>,
// which is what Tailwind's `darkMode: 'class'` setting uses to switch styles.

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

// Provider that holds the current theme and shares it (plus a toggle) with the app.
export function ThemeProvider({ children }) {
  // Start from the saved theme, defaulting to 'dark' on a first-ever visit.
  const [theme, setTheme] = useState(() => localStorage.getItem('xwz_theme') || 'dark');

  // Whenever `theme` changes, sync it to the DOM and persist it.
  useEffect(() => {
    const root = document.documentElement; // the <html> element
    // Add/remove the `dark` class so Tailwind's dark: styles turn on or off globally.
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('xwz_theme', theme); // remember the choice for next visit
  }, [theme]);

  // Flip between the two themes; functional update reads the latest value safely.
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

// Hook so any component can read the theme or call toggleTheme().
export const useTheme = () => useContext(ThemeContext);
