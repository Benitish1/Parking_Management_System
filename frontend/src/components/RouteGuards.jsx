// RouteGuards.jsx — reusable "gatekeeper" components that wrap routes in App.jsx.
// Each guard reads the auth state from useAuth() and either renders its children
// or redirects the user elsewhere, so individual pages don't repeat that logic.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Primitives';

// Centered spinner shown while AuthContext is still checking the token.
// Returning this (instead of null) prevents a flash of the login page before we know the user's status.
function FullScreenLoader() {
  return (
    <div className="app-bg grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-3 text-brand-500">
        <Spinner className="h-10 w-10" />
        <p className="text-sm text-slate-500">Loading your workspace…</p>
      </div>
    </div>
  );
}

/** Requires a valid session. */
// Wraps any page that needs login. If not authenticated, sends the user to /login.
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  // Wait until the token check finishes before deciding, otherwise we'd wrongly redirect.
  if (loading) return <FullScreenLoader />;
  // Remember where the user was trying to go (via state.from) so we can return them after login.
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Restricts a route to specific role(s). */
// Used on admin-only pages. `roles` is the list of roles allowed to see the children.
export function RoleRoute({ roles = [], children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  // If the logged-in user's role isn't in the allowed list, bounce them to the dashboard instead of showing the page.
  if (!roles.includes(user?.role)) return <Navigate to="/app/dashboard" replace />;
  return children;
}

/** Redirect already-authenticated users away from auth pages. */
// Wraps login/signup. A logged-in user has no reason to see these, so send them into the app.
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;
  return children;
}
