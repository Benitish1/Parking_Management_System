/*
 * Topbar.jsx
 * The sticky header bar at the top of every dashboard page. Shows a mobile
 * menu button, the current page title + a greeting, a (disabled) search box,
 * a notifications bell, and the dark/light ThemeToggle.
 * Rendered by DashboardLayout, which passes the title and the menu handler.
 */
import { Menu, Bell, Search } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

/*
 * Topbar component.
 * Props: `onMenu` (opens the mobile sidebar) and `title` (current page name).
 */
export default function Topbar({ onMenu, title }) {
  const { user } = useAuth(); // used only to greet the user by first name
  return (
    // sticky + top-0 keeps the header pinned while the page scrolls
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200/60 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-ink-900/70 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger button: only visible on mobile (lg:hidden); opens the sidebar */}
        <button onClick={onMenu} className="btn-ghost !p-2 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white sm:text-xl">{title}</h1>
          {/* Greeting is hidden on very small screens to save space */}
          <p className="hidden text-xs text-slate-500 sm:block">
            Welcome back, {user?.firstName} 👋
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search field (currently disabled placeholder UI); hidden below md screens */}
        <div className="relative hidden md:block">
          {/* pointer-events-none so the icon doesn't block clicks into the input */}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input w-56 pl-9" placeholder="Search..." disabled />
        </div>
        <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/60 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <Bell className="h-5 w-5" />
          {/* Small pink dot indicating unread notifications */}
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent-pink" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
