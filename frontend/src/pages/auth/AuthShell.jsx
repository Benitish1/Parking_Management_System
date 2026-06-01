/*
 * AuthShell.jsx
 * Shared layout ("shell") wrapped around every authentication page
 * (Login, Signup, VerifyOtp). It draws the left brand/marketing panel and
 * the right form panel, then renders whatever form is passed in as children.
 * Access: public — shown to visitors who are NOT logged in yet.
 */
import { motion } from 'framer-motion';
import { Car, ShieldCheck, Clock, BarChart3 } from 'lucide-react';
import ThemeToggle from '../../components/ui/ThemeToggle';

// Selling points shown on the brand panel. Kept as data so we can .map() them
// into animated rows instead of repeating the same JSX three times.
const features = [
  { icon: ShieldCheck, text: 'Secure JWT authentication & OTP verification' },
  { icon: Clock, text: 'Real-time space tracking & automatic billing' },
  { icon: BarChart3, text: 'Live analytics across every parking lot' },
];

// heading + sub are the page title/subtitle; children is the actual form.
export default function AuthShell({ children, heading, sub }) {
  return (
    <div className="app-bg grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-40" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 animate-float rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-white">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Car className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xl font-extrabold leading-none">XWZ Parking</p>
            <p className="text-xs text-white/70">Kigali • Smart Parking Management</p>
          </div>
        </div>

        <div className="relative text-white">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md text-4xl font-extrabold leading-tight"
          >
            Park smarter. <br /> Manage everything in one place.
          </motion.h2>
          <p className="mt-4 max-w-md text-white/80">
            A modern microservices platform to register parkings, track entries & exits, bill drivers
            automatically and generate real-time reports.
          </p>
          <div className="mt-8 space-y-4">
            {/* Render each feature; the staggered transition delay makes them fade in one after another */}
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.12 }}
                className="flex items-center gap-3"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="text-sm text-white/90">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer year is computed at runtime so it never goes out of date */}
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} XWZ LTD — Rwanda</p>
      </div>

      {/* Form panel — the actual auth form (children) lives here on the right */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Small-screen logo: the brand panel is hidden on mobile (lg:hidden), so show a compact logo here instead */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
              <Car className="h-6 w-6 text-white" />
            </div>
            <p className="text-lg font-extrabold text-slate-800 dark:text-white">XWZ Parking</p>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">{heading}</h1>
          {/* Subtitle only renders if one was passed in */}
          {sub && <p className="mt-2 text-sm text-slate-500">{sub}</p>}
          {/* The page-specific form (Login/Signup/VerifyOtp) is injected here */}
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
