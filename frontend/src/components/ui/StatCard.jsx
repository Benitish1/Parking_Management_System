/*
 * StatCard.jsx
 * A small dashboard card that highlights a single statistic (a label, a big
 * animated number, an optional sub-text, and a colored icon). Used on the
 * dashboard to show metrics like total revenue, cars parked, etc. The number
 * counts up via the AnimatedCounter component.
 */
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

// Named accent -> gradient classes used for the icon badge and the glow blob
const accents = {
  brand: 'from-brand-500 to-brand-700',
  purple: 'from-accent-purple to-fuchsia-700',
  cyan: 'from-cyan-400 to-blue-600',
  emerald: 'from-emerald-400 to-teal-600',
  amber: 'from-amber-400 to-orange-600',
  rose: 'from-rose-400 to-pink-600',
};

/*
 * StatCard component.
 * Props: `icon` (lucide icon component), `label`, `value` (the number),
 * `format` (e.g. currency formatter), `accent` (color key), `sub` (caption)
 * and `delay` (stagger the entrance animation when several cards are shown).
 */
export default function StatCard({ icon: Icon, label, value, format = (n) => n, accent = 'brand', sub, delay = 0 }) {
  return (
    // Fades/slides up on mount; `delay` staggers a row of cards; lifts on hover
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -4 }}
      className="card relative overflow-hidden p-5"
    >
      {/* Decorative blurred glow blob in the corner, tinted by the chosen accent */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${accents[accent]} opacity-20 blur-2xl`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800 dark:text-white">
            {/* The headline figure, animated counting up and formatted as requested */}
            <AnimatedCounter value={value} format={format} />
          </p>
          {/* Optional caption under the number (e.g. "+12% vs last week") */}
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {/* Icon badge, only rendered if an icon prop was passed */}
        {Icon && (
          <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${accents[accent]} text-white shadow-glow`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
