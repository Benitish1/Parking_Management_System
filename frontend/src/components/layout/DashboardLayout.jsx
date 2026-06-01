/*
 * DashboardLayout.jsx
 * The main "shell" wrapped around every authenticated page of the app.
 * It renders the Sidebar (left), Topbar (header) and a content area that
 * shows the current page via React Router's <Outlet />. Used as the parent
 * route element so all /app/* pages share this same frame.
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Maps each route path to the title shown in the Topbar (and as a lookup table)
const titles = {
  '/app/dashboard': 'Dashboard',
  '/app/parkings': 'Parking Lots',
  '/app/car-entries': 'Car Entries & Exits',
  '/app/reports': 'Reports',
  '/app/analytics': 'Analytics',
  '/app/users': 'User Management',
};

// Layout component: holds the sidebar open/closed state and picks the page title
export default function DashboardLayout() {
  // Controls the mobile slide-in sidebar (always visible on large screens)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation(); // current URL path, used to look up the title
  // Look up a friendly title for this route, falling back to the app name
  const title = titles[pathname] || 'XWZ Parking';

  return (
    <div className="app-bg">
      {/* Sidebar gets open state + a close handler so it can be dismissed on mobile */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* lg:pl-72 leaves room for the fixed 18rem sidebar on large screens only */}
      <div className="lg:pl-72">
        {/* onMenu opens the sidebar (mobile hamburger button lives in the Topbar) */}
        <Topbar onMenu={() => setSidebarOpen(true)} title={title} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* AnimatePresence + mode="wait" lets the old page animate out before the new one animates in */}
          <AnimatePresence mode="wait">
            {/* key={pathname} makes React treat each route as a new element so the transition re-runs on navigation */}
            <Outlet key={pathname} />
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
