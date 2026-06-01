/*
 * Dashboard.jsx
 * Router-style page: decides which dashboard to render based on the logged-in
 * user's role. Admins get the full management dashboard; everyone else (attendants)
 * gets the simpler attendant view.
 * Access: any logged-in user (the view shown depends on role).
 */
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import AttendantDashboard from './AttendantDashboard';

export default function Dashboard() {
  const { isAdmin } = useAuth(); // role flag from global auth state
  // Role-based rendering: pick the correct dashboard for this user.
  return isAdmin ? <AdminDashboard /> : <AttendantDashboard />;
}
