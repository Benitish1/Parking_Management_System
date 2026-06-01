/*
 * CarEntries.jsx
 * Core operations page for car entries/exits. Lets staff register a car
 * entering a lot (which generates a parking ticket), check a car out (which
 * generates a bill), or re-print the bill for an already-exited car. Includes
 * search by plate, status filtering and pagination.
 * Access: logged-in staff (attendants and admins).
 */
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, LogOut, Ticket, CarFront } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { Badge, Spinner } from '../components/ui/Primitives';
import { confirmAction, showReceipt } from '../components/ui/confirm';
import { carEntryService, parkingService } from '../services';
import { formatRWF, formatDate, durationLabel } from '../lib/format';

const LIMIT = 8; // rows per page

// Builds the printable HTML for the entry "ticket" popup (shown right after a car is registered).
const ticketHtml = (t) => `
  <div style="text-align:left;font-size:14px;line-height:1.9">
    <div style="text-align:center;font-size:34px;margin-bottom:6px">🅿️</div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Plate</span><b>${t.plateNumber}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Parking</span><b>${t.parkingName || t.parkingCode}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Code</span><b>${t.parkingCode}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Entry</span><b>${new Date(t.entryDateTime).toLocaleString()}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Fee/hour</span><b>${formatRWF(t.chargingFeePerHour)}</b></div>
    <div style="border-top:1px dashed #888;margin-top:10px;padding-top:8px;text-align:center;opacity:.7">Keep this ticket for exit</div>
  </div>`;

// Builds the printable HTML for the "bill" popup (shown on exit or when re-printing), including the total charged.
const billHtml = (b) => `
  <div style="text-align:left;font-size:14px;line-height:1.9">
    <div style="text-align:center;font-size:34px;margin-bottom:6px">🧾</div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Plate</span><b>${b.plateNumber}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Parking</span><b>${b.parkingCode}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Entry</span><b>${new Date(b.entryDateTime).toLocaleString()}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Exit</span><b>${new Date(b.exitDateTime).toLocaleString()}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Duration</span><b>${b.durationLabel || durationLabel(b.durationMinutes)}</b></div>
    <div style="display:flex;justify-content:space-between"><span style="opacity:.6">Billable hours</span><b>${b.billableHours}</b></div>
    <div style="border-top:1px dashed #888;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:18px"><span>Total</span><b style="color:#6366f1">${formatRWF(b.chargedAmount)}</b></div>
  </div>`;

export default function CarEntries() {
  const [rows, setRows] = useState([]); // current page of entries
  const [meta, setMeta] = useState(null); // pagination info from the API
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(''); // '' = all, or 'parked' / 'exited' filter
  const [search, setSearch] = useState(''); // plate-number search text

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parkings, setParkings] = useState([]); // lots with free space, for the entry dropdown
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Load the entries for the current page, applying the status/search filters.
  // Filters are sent as undefined when empty so they're omitted from the query.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await carEntryService.list({ page, limit: LIMIT, status: status || undefined, search: search || undefined });
      setRows(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      toast.error(err.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]); // reload whenever page/status/search change

  // Open the "register entry" modal and load the parking list for its dropdown.
  const openCreate = async () => {
    reset({ plateNumber: '', parkingCode: '' }); // start with empty fields
    setModalOpen(true);
    try {
      const res = await parkingService.list({ limit: 100, page: 1 });
      // Only offer lots that still have free spaces — you can't park where it's full.
      setParkings((res.data || []).filter((p) => p.availableSpaces > 0));
    } catch { /* ignore */ } // dropdown just stays empty if this fails
  };

  // Register a new car entry, then pop up the generated ticket and refresh the table.
  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const res = await carEntryService.create(values);
      setModalOpen(false);
      toast.success('Car entry registered — ticket generated');
      await showReceipt(ticketHtml(res.data), 'Parking Ticket'); // show printable ticket
      load();
    } catch (err) {
      toast.error(err.message || 'Could not register entry');
    } finally {
      setSaving(false);
    }
  };

  // Check a car out: confirm first, then call exit (which bills the car and frees the space)
  // and show the resulting bill.
  const onExit = async (row) => {
    const ok = await confirmAction({
      title: 'Register car exit?',
      text: `Generate the bill for ${row.plateNumber} and free up the space.`,
      icon: 'question',
      confirmText: 'Yes, check out',
    });
    if (!ok) return; // user cancelled the confirmation dialog
    try {
      const res = await carEntryService.exit(row.id);
      toast.success(`Checked out — ${formatRWF(res.data.chargedAmount)}`); // show the amount charged
      await showReceipt(billHtml(res.data), 'Parking Bill');
      load();
    } catch (err) {
      toast.error(err.message || 'Exit failed');
    }
  };

  // Table columns. The last "actions" column changes based on the row's status.
  const columns = [
    { key: 'plateNumber', header: 'Plate', render: (r) => <span className="font-bold text-slate-800 dark:text-white">{r.plateNumber}</span> },
    { key: 'parkingCode', header: 'Parking', render: (r) => <span className="font-semibold text-brand-500">{r.parkingCode}</span> },
    { key: 'entry', header: 'Entry', render: (r) => <span className="text-slate-500">{formatDate(r.entryDateTime)}</span> },
    { key: 'exit', header: 'Exit', render: (r) => <span className="text-slate-500">{formatDate(r.exitDateTime)}</span> },
    { key: 'duration', header: 'Duration', render: (r) => durationLabel(r.durationMinutes) },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">{formatRWF(r.chargedAmount)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'parked' ? 'amber' : 'green'}>{r.status}</Badge> },
    {
      key: 'actions', header: '', className: 'text-right', cellClassName: 'text-right',
      // Still parked -> show an "Exit" button to check out; already exited -> show a "Bill" button to re-print the receipt.
      render: (r) =>
        r.status === 'parked' ? (
          <button onClick={() => onExit(r)} className="btn-outline !py-1.5 !px-3 text-xs"><LogOut className="h-3.5 w-3.5" /> Exit</button>
        ) : (
          <button onClick={() => carEntryService.bill(r.id).then((res) => showReceipt(billHtml(res.data), 'Parking Bill')).catch((e) => toast.error(e.message))} className="btn-ghost !py-1.5 !px-3 text-xs"><Ticket className="h-3.5 w-3.5" /> Bill</button>
        ),
    },
  ];

  return (
    <PageTransition>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {/* Search resets to page 1 and upper-cases input since plate numbers are stored uppercase */}
            <input className="input pl-11" placeholder="Search plate number..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value.toUpperCase()); }} />
          </div>
          {/* Status filter; changing it also resets to page 1 */}
          <select className="input sm:w-44" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            <option value="parked">Parked</option>
            <option value="exited">Exited</option>
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Register entry</button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        emptyIcon={CarFront}
        emptyTitle="No car entries yet"
        emptySubtitle="Register a car entry to generate its parking ticket."
        emptyAction={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Register entry</button>}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register car entry">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Plate number</label>
            <input className="input uppercase" placeholder="RAB123A" {...register('plateNumber', { required: 'Plate number is required' })} />
            {errors.plateNumber && <p className="mt-1 text-xs text-rose-500">{errors.plateNumber.message}</p>}
          </div>
          <div>
            <label className="label">Parking lot</label>
            <select className="input" {...register('parkingCode', { required: 'Select a parking' })}>
              <option value="">Select a parking with free spaces…</option>
              {/* Only lots with available spaces (filtered in openCreate) appear here */}
              {parkings.map((p) => (
                <option key={p.id} value={p.code}>{p.code} — {p.parkingName} ({p.availableSpaces} free)</option>
              ))}
            </select>
            {errors.parkingCode && <p className="mt-1 text-xs text-rose-500">{errors.parkingCode.message}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : <><Ticket className="h-4 w-4" /> Generate ticket</>}</button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
