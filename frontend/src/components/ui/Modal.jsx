/*
 * Modal.jsx
 * A reusable pop-up dialog with a backdrop, animated open/close, a title bar
 * with a close button, and a content area (children). Used app-wide for forms
 * (e.g. add/edit parking) and detail views. Controlled by the parent via the
 * `open` prop, and closed via the `onClose` callback.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/*
 * Modal component.
 * Props: `open` (visible?), `onClose` (close handler), `title`, `children`
 * (the modal body) and `size` (one of the preset widths below).
 */
export default function Modal({ open, onClose, title, children, size = 'md' }) {
  // Map a friendly size name to a Tailwind max-width class
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    // AnimatePresence lets the exit animation play before the modal is removed from the DOM
    <AnimatePresence>
      {/* Render nothing unless `open` is true (conditional rendering) */}
      {open && (
        // Full-screen overlay that fades in/out and centers the dialog
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark, blurred backdrop; clicking it closes the modal */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
          {/* The dialog panel: springs in (scale + slide up) and out for a lively feel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className={`relative w-full ${sizes[size]} card max-h-[90vh] overflow-y-auto p-6`}
          >
            {/* Header row: title on the left, close (X) button on the right */}
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
              <button onClick={onClose} className="btn-ghost !p-2" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Whatever the parent put inside <Modal>...</Modal> renders here */}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
