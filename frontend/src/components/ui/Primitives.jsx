/*
 * Primitives.jsx
 * A bundle of tiny, reusable UI building blocks shared across the app:
 * a loading Spinner, a colored Badge/pill, a Skeleton placeholder, a
 * TableSkeleton (used by DataTable while loading) and an EmptyState shown
 * when a list has no data. Keeping them here avoids redefining them per page.
 */
import { motion } from 'framer-motion';
import { Loader2, Inbox } from 'lucide-react';

// Spinner: a continuously spinning loader icon (animate-spin does the rotation)
export function Spinner({ className = 'w-5 h-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

// Badge: a small colored pill for statuses/labels; `color` picks from the map below
export function Badge({ children, color = 'brand', className = '' }) {
  // Named color -> Tailwind classes (background tint + text color, light/dark variants)
  const colors = {
    brand: 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
    green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    red: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    purple: 'bg-accent-purple/15 text-purple-600 dark:text-purple-300',
    slate: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  };
  // Fall back to the brand color if an unknown color name is passed
  return <span className={`badge ${colors[color] || colors.brand} ${className}`}>{children}</span>;
}

// Skeleton: a single grey shimmering placeholder block shown while content loads
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} />;
}

// TableSkeleton: a grid of Skeletons mimicking a table while its data loads
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {/* Array.from({length}) is a quick way to loop a fixed number of times in JSX */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {/* One placeholder cell per column */}
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// EmptyState: friendly "no data" message with an icon and optional action button.
// `icon: Icon` renames the destructured prop to Icon so we can render it as <Icon />.
export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', subtitle = '', action = null }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-brand-500/10 text-brand-500">
        <Icon className="h-9 w-9" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {/* Only render subtitle/action when they were actually provided */}
      {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
