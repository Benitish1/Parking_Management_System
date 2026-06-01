/*
 * NotFound.jsx
 * Fallback 404 page shown when the URL doesn't match any route. Offers a
 * friendly message and a button back to the dashboard.
 * Access: public — any unmatched route renders this.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="app-bg grid min-h-screen place-items-center px-6 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient shadow-glow">
          <Compass className="h-10 w-10 text-white" />
        </div>
        <p className="text-7xl font-black text-gradient">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">Page not found</h1>
        <p className="mt-2 text-slate-500">The page you're looking for has driven off somewhere.</p>
        {/* Escape hatch: send the user back to a known-good page */}
        <Link to="/app/dashboard" className="btn-primary mt-6 inline-flex"><Home className="h-4 w-4" /> Back to dashboard</Link>
      </motion.div>
    </div>
  );
}
