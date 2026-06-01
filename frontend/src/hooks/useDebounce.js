// useDebounce.js — a custom hook that "debounces" a fast-changing value.
// Typical use: a search box. Instead of firing an API call on every keystroke, we
// wait until the user pauses typing, then use the settled value. This avoids spamming
// the backend gateway with requests.

import { useEffect, useState } from 'react';

// Returns a copy of `value` that only updates after `delay` ms of no further changes.
export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // Schedule an update for `delay` ms in the future.
    const t = setTimeout(() => setDebounced(value), delay);
    // Cleanup cancels that timer if `value` changes again first, so only the last
    // change within a quiet window actually takes effect (that's the debounce).
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
