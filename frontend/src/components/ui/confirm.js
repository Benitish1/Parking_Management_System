/*
 * confirm.js
 * Helper functions that wrap SweetAlert2 to show themed confirm/alert dialogs.
 * Centralizing them here means every "Are you sure?" popup in the app looks the
 * same and automatically matches the current dark/light theme. Used by the
 * Sidebar (logout), table delete actions, and receipt/ticket displays.
 */
import Swal from 'sweetalert2';

// Detect dark mode by checking for the `dark` class Tailwind toggles on <html>
const isDark = () => document.documentElement.classList.contains('dark');

// Shared visual options (colors + rounded popup) applied to every dialog below
const baseTheme = () => ({
  background: isDark() ? '#11162a' : '#ffffff',
  color: isDark() ? '#e5e7eb' : '#0f172a',
  customClass: {
    popup: 'rounded-2xl',
    confirmButton: 'swal-confirm',
    cancelButton: 'swal-cancel',
  },
  buttonsStyling: true,
});

/** Generic destructive/confirm dialog. Returns true if confirmed. */
export const confirmAction = async ({
  title = 'Are you sure?',
  text = '',
  icon = 'warning',
  confirmText = 'Yes, continue',
  cancelText = 'Cancel',
  danger = false,
} = {}) => {
  // Swal.fire returns a promise that resolves once the user closes the dialog
  const res = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    // Red confirm button for dangerous actions (delete), indigo otherwise
    confirmButtonColor: danger ? '#e11d48' : '#4f46e5',
    cancelButtonColor: isDark() ? '#374151' : '#cbd5e1',
    reverseButtons: true, // put confirm on the right, cancel on the left
    ...baseTheme(), // spread in the shared theme colors/classes
  });
  // Resolve to a simple boolean so callers can just do `if (await confirmAction())`
  return res.isConfirmed;
};

// Convenience wrapper for delete confirmations (red button + warning copy)
export const confirmDelete = (name = 'this record') =>
  confirmAction({
    title: 'Delete confirmation',
    text: `Are you sure you want to delete ${name}? This action cannot be undone.`,
    icon: 'warning',
    confirmText: 'Yes, delete it',
    danger: true,
  });

// Convenience wrapper for the "Sign out?" prompt used by the Sidebar
export const confirmLogout = () =>
  confirmAction({
    title: 'Sign out?',
    text: 'Are you sure you want to sign out of your account?',
    icon: 'question',
    confirmText: 'Yes, sign out',
  });

/** A rich, branded modal for showing a parking ticket or bill. */
// Accepts raw HTML (the ticket/bill markup) so callers can show formatted receipts
export const showReceipt = (htmlContent, title = 'Parking Ticket') =>
  Swal.fire({
    title,
    html: htmlContent,
    width: 420,
    showConfirmButton: true,
    confirmButtonText: 'Done',
    confirmButtonColor: '#4f46e5',
    ...baseTheme(),
  });
