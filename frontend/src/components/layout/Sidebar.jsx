/*
 * Sidebar.jsx
 * The left navigation panel of the dashboard. It shows the brand logo, a list
 * of nav links (which differ depending on whether the user is an admin or an
 * attendant), the signed-in user's info, and a "Sign out" button.
 * Rendered by DashboardLayout; slides in/out on mobile via the `open` prop.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, SquareParking, CarFront, FileBarChart, Users,
  LineChart, LogOut, X, Car,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // gives us the user + role + logout()
import { confirmLogout } from '../ui/confirm'; // SweetAlert "are you sure?" dialog
import toast from 'react-hot-toast';

// Full menu shown to admins (all sections of the app)
const adminNav = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/parkings', label: 'Parkings', icon: SquareParking },
  { to: '/app/car-entries', label: 'Car Entries', icon: CarFront },
  { to: '/app/reports', label: 'Reports', icon: FileBarChart },
  { to: '/app/analytics', label: 'Analytics', icon: LineChart },
  { to: '/app/users', label: 'Users', icon: Users },
];

// Reduced menu for parking attendants (only the sections they're allowed to use)
const attendantNav = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/parkings', label: 'Available Parking', icon: SquareParking },
];

/*
 * Sidebar component.
 * Props: `open` (is the mobile drawer showing?) and `onClose` (closes it).
 * Chooses which nav list to render based on the logged-in user's role.
 */
export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  // Role-based menu: admins see everything, attendants see the shorter list
  const nav = isAdmin ? adminNav : attendantNav;

  // Ask for confirmation first, then log out, notify, and send the user to /login
  const handleLogout = async () => {
    // confirmLogout() resolves true only if the user clicked "Yes, sign out"
    if (await confirmLogout()) {
      logout();
      toast.success('Signed out successfully');
      navigate('/login');
    }
  };

  return (
    <>
      {/* mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      {/*
        The sidebar panel itself. On mobile it slides in/out via translate-x:
        open -> on screen (translate-x-0), closed -> pushed off-screen left
        (-translate-x-full). lg:translate-x-0 forces it always-visible on desktop.
      */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/10 bg-ink-900/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-extrabold leading-none text-white">XWZ Parking</p>
              <p className="text-[11px] tracking-wide text-slate-400">Smart Management</p>
            </div>
          </div>
          {/* Close button only matters on mobile, so it's hidden on large screens */}
          <button onClick={onClose} className="text-slate-400 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {/* Render one link per item in the chosen (admin/attendant) nav list */}
          {nav.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              // NavLink gives us isActive; we use it to highlight the current page
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-gradient text-white shadow-glow'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* The little white dot marking the active link. Shared layoutId="navdot" makes
                      Framer Motion smoothly slide the dot between links when the route changes */}
                  {isActive && (
                    <motion.span layoutId="navdot" className="absolute -left-1 h-6 w-1 rounded-full bg-white" />
                  )}
                  {/* item.icon is a component (capitalized) so JSX can render it as <item.icon /> */}
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer area: shows who is logged in plus the sign-out button */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            {/* Avatar made from the user's initials (first letter of first + last name) */}
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient font-bold text-white">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs capitalize text-brand-300">{user?.role}</p>
            </div>
          </div>
          {/* Sign-out triggers the confirm dialog defined above */}
          <button onClick={handleLogout} className="btn-ghost w-full justify-start !text-rose-400 hover:!bg-rose-500/10">
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
