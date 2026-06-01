/*
 * AttendantDashboard.jsx
 * The simpler dashboard shown to parking attendants: a few summary stats plus
 * a grid of cards (one per parking lot) showing how full each lot is and its
 * hourly fee. Read-only — attendants don't manage parkings here.
 * Access: non-admin users (rendered by Dashboard.jsx when isAdmin is false).
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SquareParking, ParkingCircle, MapPin, Coins } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import StatCard from '../../components/ui/StatCard';
import { Skeleton, EmptyState } from '../../components/ui/Primitives';
import { parkingService } from '../../services';
import { formatRWF } from '../../lib/format';
import toast from 'react-hot-toast';

export default function AttendantDashboard() {
  const [parkings, setParkings] = useState([]); // every parking lot to display
  const [loading, setLoading] = useState(true);

  // Load all parkings once on mount (limit 100 to grab them all in one call).
  useEffect(() => {
    (async () => {
      try {
        const res = await parkingService.list({ limit: 100, page: 1 });
        setParkings(res.data || []);
      } catch (err) {
        toast.error(err.message || 'Failed to load parkings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sum total and available spaces across all lots to feed the summary cards.
  const totals = parkings.reduce(
    (acc, p) => {
      acc.spaces += p.totalSpaces;
      acc.available += p.availableSpaces;
      return acc;
    },
    { spaces: 0, available: 0 } // starting accumulator
  );

  return (
    <PageTransition>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={SquareParking} accent="brand" label="Parking Lots" value={parkings.length} sub="Across the city" />
            <StatCard icon={ParkingCircle} accent="cyan" label="Available Spaces" value={totals.available} sub={`of ${totals.spaces} total`} delay={0.08} />
            <StatCard icon={Coins} accent="emerald" label="Total Capacity" value={totals.spaces} sub="Managed spaces" delay={0.16} />
          </>
        )}
      </div>

      <h2 className="mb-4 mt-8 text-lg font-bold text-slate-800 dark:text-white">Available Parking</h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : parkings.length === 0 ? (
        /* No lots registered yet */
        <div className="card"><EmptyState icon={SquareParking} title="No parkings registered yet" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parkings.map((p, i) => {
            // Percentage full = occupied / total, rounded. Guard against divide-by-zero when totalSpaces is 0.
            const rate = p.totalSpaces ? Math.round(((p.totalSpaces - p.availableSpaces) / p.totalSpaces) * 100) : 0;
            const full = p.availableSpaces === 0; // drives the "Full" badge and red progress bar
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="card overflow-hidden p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-brand-500">{p.code}</p>
                    <h3 className="mt-1 font-bold text-slate-800 dark:text-white">{p.parkingName}</h3>
                  </div>
                  <span className={`badge ${full ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                    {full ? 'Full' : 'Open'}
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" /> {p.location}
                </p>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500">{p.availableSpaces} of {p.totalSpaces} free</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{rate}% full</span>
                  </div>
                  {/* Visual fill bar: width set to the occupancy percentage, turns red when full */}
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full ${full ? 'bg-rose-500' : 'bg-brand-gradient'}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
                  <span className="text-xs text-slate-500">Fee / hour</span>
                  <span className="font-bold text-slate-800 dark:text-white">{formatRWF(p.chargingFeePerHour)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
