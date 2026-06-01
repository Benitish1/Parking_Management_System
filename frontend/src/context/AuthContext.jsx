// AuthContext.jsx — the single source of truth for "who is logged in".
// It stores the current user + token in React state (and localStorage so the
// session survives a page refresh), and exposes login/logout plus role flags to
// the whole app through React Context (read anywhere via the useAuth() hook).

import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services';

// The context object itself; AuthProvider supplies its value, useAuth reads it.
const AuthContext = createContext();

// Provider component placed near the app root so all children can access auth state.
export function AuthProvider({ children }) {
  // Initialise user from localStorage so a refresh doesn't briefly log the user out.
  // The function form of useState runs once and reads the previously persisted user.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('xwz_user');
    return stored ? JSON.parse(stored) : null;
  });
  // `loading` is true until we've confirmed the stored token is still valid; guards wait on it.
  const [loading, setLoading] = useState(true);

  // Validate the stored token against the auth service on first load
  // (the cached user could be stale or the token expired, so we re-verify with the backend).
  useEffect(() => {
    const token = localStorage.getItem('xwz_token');
    // No token means nobody is logged in; stop loading and show public pages.
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me() // asks the backend "who am I?" using the token attached by the axios interceptor
      .then((res) => {
        // Token is valid: trust the fresh user data from the server and re-cache it.
        setUser(res.data);
        localStorage.setItem('xwz_user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Token rejected/expired: wipe the saved session so the user is treated as logged out.
        localStorage.removeItem('xwz_token');
        localStorage.removeItem('xwz_user');
        setUser(null);
      })
      .finally(() => setLoading(false)); // either way, we're done checking
  }, []); // empty deps → run only once when the app mounts

  // Called after a successful login: persist token + user and update state so the UI reacts.
  const login = (token, userData) => {
    localStorage.setItem('xwz_token', token);
    localStorage.setItem('xwz_user', JSON.stringify(userData));
    setUser(userData);
  };

  // Clears everything so the app falls back to the logged-out state.
  const logout = () => {
    localStorage.removeItem('xwz_token');
    localStorage.removeItem('xwz_user');
    setUser(null);
  };

  // Convenience role flags derived from the user; used by guards and to show/hide UI.
  const isAdmin = user?.role === 'admin';
  const isAttendant = user?.role === 'attendant';

  // Expose the auth state + actions to every descendant. `isAuthenticated` is just "do we have a user?".
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isAttendant, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// Shortcut hook so components can do `const { user } = useAuth()` instead of importing the context.
export const useAuth = () => useContext(AuthContext);
