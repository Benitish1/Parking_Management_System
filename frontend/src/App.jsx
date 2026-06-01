// App.jsx — central route map for the whole single-page application (SPA).
// It declares every URL the app responds to and which page/guard renders for it.
// Guards (ProtectedRoute, RoleRoute, PublicOnlyRoute) decide who is allowed in.

import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './components/RouteGuards';
import DashboardLayout from './components/layout/DashboardLayout';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import VerifyOtp from './pages/auth/VerifyOtp';

import Dashboard from './pages/dashboard/Dashboard';
import Parkings from './pages/Parkings';
import CarEntries from './pages/CarEntries';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

// App component: returns the route configuration. React Router matches the current
// URL against these <Route> entries and renders the first one that fits.
export default function App() {
  return (
    <Routes>
      {/* Visiting the root "/" instantly redirects to the dashboard; `replace` avoids a back-button loop. */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      {/* Public auth routes */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
      {/* OTP verification is reachable even when logged out (it is part of finishing signup), so no guard. */}
      <Route path="/verify-otp" element={<VerifyOtp />} />

      {/* Protected app shell: everything under /app requires a valid login (ProtectedRoute).
          DashboardLayout is the persistent frame (sidebar/nav); child routes render inside its <Outlet />. */}
      <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        {/* "index" = the default child shown when the user lands exactly on /app. */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="parkings" element={<Parkings />} />
        {/* Admin-only routes: RoleRoute additionally checks the user's role and blocks non-admins. */}
        <Route path="car-entries" element={<RoleRoute roles={['admin']}><CarEntries /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute roles={['admin']}><Reports /></RoleRoute>} />
        <Route path="analytics" element={<RoleRoute roles={['admin']}><Analytics /></RoleRoute>} />
        <Route path="users" element={<RoleRoute roles={['admin']}><Users /></RoleRoute>} />
      </Route>

      {/* Catch-all "*": any URL that matched nothing above renders the 404 page. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
