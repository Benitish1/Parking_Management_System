/*
 * Analytics.jsx
 * Visual analytics page: headline stat cards plus three charts — revenue over
 * time (line), space utilisation (donut) and occupancy by lot (bar). Pulls the
 * same summary/revenue/occupancy data as the dashboard but focuses on charts.
 * Access: admins (analytics is a management feature).
 */
import { useEffect, useState } from 'react';
import { TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/ui/PageTransition';
import StatCard from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Primitives';
import { RevenueChart, OccupancyChart, DonutChart } from '../components/charts/Charts';
import { reportService } from '../services';
import { formatRWF, formatNumber } from '../lib/format';

// Reusable titled card with an icon, used to frame each chart on this page.
function Panel({ title, icon: Icon, children }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/10 text-brand-500"><Icon className="h-5 w-5" /></div>
        <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null); // totals for the stat cards + donut
  const [revenue, setRevenue] = useState([]); // revenue-over-time series
  const [occupancy, setOccupancy] = useState([]); // per-lot occupancy series
  const [loading, setLoading] = useState(true);

  // Load all three datasets in parallel once on mount.
  useEffect(() => {
    (async () => {
      try {
        const [s, r, o] = await Promise.all([reportService.summary(), reportService.revenue(), reportService.occupancy()]);
        setSummary(s.data);
        setRevenue(r.data || []);
        setOccupancy(o.data || []);
      } catch (err) {
        toast.error(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Shape the summary numbers into the {name, value}[] format the donut chart expects.
  const spaceDonut = [
    { name: 'Occupied', value: summary?.occupiedSpaces || 0 },
    { name: 'Available', value: summary?.totalAvailable || 0 },
  ];

  return (
    <PageTransition>
      {/* Stat cards; show 4 skeletons while data loads */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={TrendingUp} accent="emerald" label="Total Revenue" value={summary?.totalRevenue} format={formatRWF} />
            <StatCard icon={BarChart3} accent="brand" label="Total Entries" value={summary?.totalEntries} format={formatNumber} delay={0.08} />
            {/* Occupancy rate = occupied / total as a %, guarded against divide-by-zero */}
            <StatCard icon={PieIcon} accent="cyan" label="Occupancy Rate" value={summary?.totalSpaces ? Math.round((summary.occupiedSpaces / summary.totalSpaces) * 100) : 0} format={(n) => `${n}%`} delay={0.16} />
            <StatCard icon={BarChart3} accent="purple" label="Parking Lots" value={summary?.totalParkings} delay={0.24} />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Revenue over time" icon={TrendingUp}>
            {loading ? <Skeleton className="h-[300px] rounded-xl" /> : <RevenueChart data={revenue} />}
          </Panel>
        </div>
        <Panel title="Space utilisation" icon={PieIcon}>
          {loading ? <Skeleton className="h-[260px] rounded-xl" /> : <DonutChart data={spaceDonut} valueFmt={formatNumber} />}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Occupancy by parking lot" icon={BarChart3}>
          {loading ? <Skeleton className="h-[300px] rounded-xl" /> : <OccupancyChart data={occupancy} />}
        </Panel>
      </div>
    </PageTransition>
  );
}
