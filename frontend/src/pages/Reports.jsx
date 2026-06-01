/*
 * Reports.jsx
 * Date-range reporting page with two tabs: "Outgoing" (cars that exited, with
 * the amount charged) and "Incoming" (cars that entered). The user picks a
 * from/to date range and the matching records are fetched and paginated, with
 * summary chips showing totals for the selected range.
 * Access: admins (reporting is a management feature).
 */
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, ArrowDownToLine, ArrowUpFromLine, Wallet, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import { Badge } from '../components/ui/Primitives';
import { reportService } from '../services';
import { formatRWF, formatDate, durationLabel } from '../lib/format';

const LIMIT = 8; // rows per page
// Helper: returns the date n days ago as a YYYY-MM-DD string (matches <input type="date">).
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function Reports() {
  const [tab, setTab] = useState('outgoing'); // which report is active: 'outgoing' | 'incoming'
  const [from, setFrom] = useState(daysAgo(30)); // default range start: 30 days ago
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10)); // default range end: today
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null); // pagination + totals from the API
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Fetch the report for the chosen tab and date range. The tab decides which
  // service endpoint to hit; the same params shape is used for both.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Pin "to" to end-of-day so records from the final day are included.
      const params = { from, to: `${to}T23:59:59`, page, limit: LIMIT };
      const res = tab === 'outgoing' ? await reportService.outgoing(params) : await reportService.incoming(params);
      setRows(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, page]);

  useEffect(() => { load(); }, [load]); // re-run whenever tab, dates or page change
  useEffect(() => { setPage(1); }, [tab, from, to]); // any filter change resets back to page 1

  // Columns for the Outgoing report: exited cars with entry/exit times, duration and amount charged.
  const outgoingCols = [
    { key: 'plateNumber', header: 'Plate', render: (r) => <span className="font-bold text-slate-800 dark:text-white">{r.plateNumber}</span> },
    { key: 'parkingCode', header: 'Parking', render: (r) => <span className="font-semibold text-brand-500">{r.parkingCode}</span> },
    { key: 'entry', header: 'Entry', render: (r) => <span className="text-slate-500">{formatDate(r.entryDateTime)}</span> },
    { key: 'exit', header: 'Exit', render: (r) => <span className="text-slate-500">{formatDate(r.exitDateTime)}</span> },
    { key: 'duration', header: 'Duration', render: (r) => durationLabel(r.durationMinutes) },
    { key: 'amount', header: 'Charged', render: (r) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRWF(r.chargedAmount)}</span> },
  ];

  // Columns for the Incoming report: cars that entered, with entry time and current status.
  const incomingCols = [
    { key: 'plateNumber', header: 'Plate', render: (r) => <span className="font-bold text-slate-800 dark:text-white">{r.plateNumber}</span> },
    { key: 'parkingCode', header: 'Parking', render: (r) => <span className="font-semibold text-brand-500">{r.parkingCode}</span> },
    { key: 'entry', header: 'Entry time', render: (r) => <span className="text-slate-500">{formatDate(r.entryDateTime)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'parked' ? 'amber' : 'green'}>{r.status}</Badge> },
  ];

  return (
    <PageTransition>
      {/* Controls — tab switch on the left, date-range pickers on the right */}
      <div className="card mb-5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {/* Outgoing/Incoming toggle; the active tab is highlighted with the brand gradient */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
            <button onClick={() => setTab('outgoing')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'outgoing' ? 'bg-brand-gradient text-white shadow-glow' : 'text-slate-500'}`}>
              <ArrowUpFromLine className="h-4 w-4" /> Outgoing
            </button>
            <button onClick={() => setTab('incoming')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'incoming' ? 'bg-brand-gradient text-white shadow-glow' : 'text-slate-500'}`}>
              <ArrowDownToLine className="h-4 w-4" /> Incoming
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="label">From</label>
              {/* max={to} stops the start date being later than the end date */}
              <input type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              {/* min={from} stops the end date being earlier than the start date */}
              <input type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary chips — quick totals for the current range, read from the API meta */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white"><Hash className="h-6 w-6" /></div>
          <div>
            {/* Label and count adapt to the active tab */}
            <p className="text-xs uppercase tracking-wide text-slate-500">{tab === 'outgoing' ? 'Cars exited' : 'Cars entered'}</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{meta?.total ?? 0}</p>
          </div>
        </motion.div>
        {/* Revenue chip only makes sense for outgoing (billed) cars */}
        {tab === 'outgoing' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white"><Wallet className="h-6 w-6" /></div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total charged in range</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatRWF(meta?.totalCharged || 0)}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Pick the column set that matches the active tab */}
      <DataTable
        columns={tab === 'outgoing' ? outgoingCols : incomingCols}
        rows={rows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        emptyIcon={CalendarRange}
        emptyTitle="No records in this range"
        emptySubtitle="Try widening the date range above."
      />
    </PageTransition>
  );
}
