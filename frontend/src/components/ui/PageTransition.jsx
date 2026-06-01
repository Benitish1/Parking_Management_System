/*
 * PageTransition.jsx
 * A simple wrapper that fades and slides its children in when a page mounts and
 * out when it unmounts. Each routed page wraps its content in <PageTransition>
 * so that navigating between pages animates smoothly (works together with the
 * <AnimatePresence> in DashboardLayout).
 */
import { motion } from 'framer-motion';

// Wraps page content; `children` is the page's actual markup
export default function PageTransition({ children }) {
  return (
    // initial = state before entering (slightly lower + transparent),
    // animate = the visible resting state (fades/slides into place),
    // exit = state when the page leaves (fades/slides up)
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
