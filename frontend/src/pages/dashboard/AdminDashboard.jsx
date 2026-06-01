/*
 * AdminDashboard.jsx
 * The admin landing page: shows headline stat cards, a revenue trend chart,
 * an occupancy-by-lot chart, and a table of the most recent car entries/exits.
 * All data is loaded once on mount from the report and car-entry services.
 * Access: admins only (rendered by Dashboard.jsx when isAdmin is true).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, CarFront, SquareParking, Activity, ArrowUpRight } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import StatCard from '../../components/ui/StatCard';
import { Badge, Skeleton } from '../../components/ui/Primitives';
import { RevenueChart, OccupancyChart } from '../../components/charts/Charts';
import { reportService, carEntryService } from '../../services';
import { formatRWF, formatDate } from '../../lib/format';
import toast from 'react-hot-toast';

// Small reusable wrapper that gives each chart/table a titled card with an
// optional "View all" link (to) to a fuller page.
function ChartCard({ title, subtitle, children, to }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null); // headline totals for the stat cards
  const [revenue, setRevenue] = useState([]); // points for the revenue line chart
  const [occupancy, setOccupancy] = useState([]); // per-lot occupancy for the bar chart
  const [recent, setRecent] = useState([]); // latest few car entries for the table
  const [loading, setLoading] = useState(true); // true until all data arrives, drives the skeletons

  // Fetch everything once when the page mounts. Promise.all runs the four
  // requests in parallel so the page loads as fast as the slowest one.
  useEffect(() => {
    (async () => {
      try {
        const [s, r, o, e] = await Promise.all([
          reportService.summary(),
          reportService.revenue(),
          reportService.occupancy(),
          carEntryService.list({ limit: 5, page: 1 }), // only need the 5 most recent
        ]);
        setSummary(s.data);
        setRevenue(r.data || []); // default to [] so the charts never get undefined
        setOccupancy(o.data || []);
        setRecent(e.data || []);
      } catch (err) {
        toast.error(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false); // hide skeletons regardless of success/failure
      }
    })();
  }, []); // empty deps = run only once on mount

  return (
    <PageTransition>
      {/* Stat cards — top row of headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* While loading, show 4 placeholder skeletons in place of the real cards */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={Wallet} accent="emerald" label="Total Revenue" value={summary?.totalRevenue} format={formatRWF} sub="All-time collected" delay={0} />
            <StatCard icon={CarFront} accent="brand" label="Currently Parked" value={summary?.currentlyParked} sub={`${summary?.totalEntries || 0} total entries`} delay={0.08} />
            <StatCard icon={Activity} accent="purple" label="Cars Exited" value={summary?.totalExited} sub="Completed sessions" delay={0.16} />
            <StatCard icon={SquareParking} accent="cyan" label="Available Spaces" value={summary?.totalAvailable} sub={`of ${summary?.totalSpaces || 0} total`} delay={0.24} />
          </>
        )}
      </div>

      {/* Charts — revenue trend (wide) beside occupancy by lot */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue trend" subtitle="Daily collected fees (last 30 days)">
            {loading ? <Skeleton className="h-[300px] rounded-xl" /> : <RevenueChart data={revenue} />}
          </ChartCard>
        </div>
        <ChartCard title="Occupancy by lot" subtitle="Occupied vs available">
          {loading ? <Skeleton className="h-[300px] rounded-xl" /> : <OccupancyChart data={occupancy} />}
        </ChartCard>
      </div>

      {/* Recent entries — quick table of the latest activity, links to the full page */}
      <div className="mt-6">
        <ChartCard title="Recent activity" subtitle="Latest car entries & exits" to="/app/car-entries">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Plate</th>
                  <th className="py-2 pr-4 font-semibold">Parking</th>
                  <th className="py-2 pr-4 font-semibold">Entry</th>
                  <th className="py-2 pr-4 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Empty-state row shown only once loading is done and there's nothing to list */}
                {!loading && recent.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-slate-400">No activity yet</td></tr>
                )}
                {/* One row per recent entry */}
                {recent.map((row) => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-slate-100 dark:border-white/5">
                    <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-white">{row.plateNumber}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{row.parkingCode}</td>
                    <td className="py-3 pr-4 text-slate-500">{formatDate(row.entryDateTime)}</td>
                    <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-200">{formatRWF(row.chargedAmount)}</td>
                    <td className="py-3">
                      {/* Colour the status badge: amber while still parked, green once exited */}
                      <Badge color={row.status === 'parked' ? 'amber' : 'green'}>{row.status}</Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </PageTransition>
  );
}
