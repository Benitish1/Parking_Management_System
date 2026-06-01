/*
 * Parkings.jsx
 * Parking-lots page with a searchable, paginated table. Admins can create,
 * edit and delete lots through a modal form; attendants see a read-only list
 * (the action buttons and "Register" button are hidden for non-admins).
 * Access: any logged-in user can view; only admins can modify.
 */
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Pencil, Trash2, SquareParking, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { Badge, Spinner } from '../components/ui/Primitives';
import { confirmDelete } from '../components/ui/confirm';
import { parkingService } from '../services';
import { formatRWF } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';

const LIMIT = 8; // rows per page

export default function Parkings() {
  const { isAdmin } = useAuth(); // gates the create/edit/delete controls
  const [rows, setRows] = useState([]); // current page of parking records
  const [meta, setMeta] = useState(null); // pagination info (total pages, etc.) from the API
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); // current page number
  const [search, setSearch] = useState(''); // raw text in the search box
  const debounced = useDebounce(search); // delayed copy of search so we don't fetch on every keystroke

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // the row being edited, or null when creating
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch the current page of parkings. useCallback so its identity only
  // changes when page/search change, which is what the effect below depends on.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parkingService.list({ page, limit: LIMIT, search: debounced });
      setRows(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      toast.error(err.message || 'Failed to load parkings');
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => { load(); }, [load]); // reload whenever page or the debounced search changes
  useEffect(() => { setPage(1); }, [debounced]); // a new search should jump back to page 1

  // Open the modal in "create" mode: clear editing and reset the form to blanks.
  const openCreate = () => {
    setEditing(null);
    reset({ code: '', parkingName: '', totalSpaces: '', availableSpaces: '', location: '', chargingFeePerHour: '' });
    setModalOpen(true);
  };

  // Open the modal in "edit" mode: remember which row and pre-fill the form with its values.
  const openEdit = (p) => {
    setEditing(p);
    reset({
      code: p.code,
      parkingName: p.parkingName,
      totalSpaces: p.totalSpaces,
      availableSpaces: p.availableSpaces,
      location: p.location,
      chargingFeePerHour: p.chargingFeePerHour,
    });
    setModalOpen(true);
  };

  // Shared submit for both create and edit. Form inputs are strings, so the
  // numeric fields are converted to Numbers before sending to the API.
  const onSubmit = async (values) => {
    setSaving(true);
    const payload = {
      ...values,
      totalSpaces: Number(values.totalSpaces),
      // Available is optional on create: leave it undefined so the backend defaults it (usually to total).
      availableSpaces: values.availableSpaces === '' ? undefined : Number(values.availableSpaces),
      chargingFeePerHour: Number(values.chargingFeePerHour),
    };
    try {
      // editing being set tells us whether this is an update or a create.
      if (editing) {
        await parkingService.update(editing.id, payload);
        toast.success('Parking updated');
      } else {
        await parkingService.create(payload);
        toast.success('Parking registered');
      }
      setModalOpen(false);
      load(); // refresh the table so the change shows immediately
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Delete flow: ask for confirmation first, then remove and refresh the list.
  const onDelete = async (p) => {
    if (await confirmDelete(`parking "${p.parkingName}"`)) {
      try {
        await parkingService.remove(p.id);
        toast.success('Parking deleted');
        load();
      } catch (err) {
        toast.error(err.message || 'Delete failed');
      }
    }
  };

  // Column definitions for the DataTable. Each render function decides how that cell looks.
  const columns = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-bold text-brand-500">{r.code}</span> },
    { key: 'parkingName', header: 'Name', render: (r) => <span className="font-semibold text-slate-800 dark:text-white">{r.parkingName}</span> },
    { key: 'location', header: 'Location', render: (r) => <span className="inline-flex items-center gap-1 text-slate-500"><MapPin className="h-3.5 w-3.5" />{r.location}</span> },
    {
      key: 'spaces',
      header: 'Spaces',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Badge color={r.availableSpaces === 0 ? 'red' : 'green'}>{r.availableSpaces} free</Badge>
          <span className="text-xs text-slate-400">/ {r.totalSpaces}</span>
        </div>
      ),
    },
    { key: 'fee', header: 'Fee/hr', render: (r) => <span className="font-medium">{formatRWF(r.chargingFeePerHour)}</span> },
    // Role-based column: only admins get the edit/delete actions column; the spread
    // adds it for admins and adds nothing ([]) for everyone else.
    ...(isAdmin
      ? [{
          key: 'actions',
          header: '',
          className: 'text-right',
          cellClassName: 'text-right',
          render: (r) => (
            <div className="flex justify-end gap-1">
              <button onClick={() => openEdit(r)} className="btn-ghost !p-2" title="Edit"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => onDelete(r)} className="btn-ghost !p-2 !text-rose-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <PageTransition>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          {/* Controlled search box; typing updates state, the debounce hook delays the actual fetch */}
          <input className="input pl-11" placeholder="Search parkings..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {/* Only admins see the "Register parking" button */}
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Register parking</button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        emptyIcon={SquareParking}
        emptyTitle="No parkings found"
        emptySubtitle={isAdmin ? 'Register your first parking lot to get started.' : 'No parkings available yet.'}
        emptyAction={isAdmin && <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Register parking</button>}
      />

      {/* Shared create/edit modal — title and submit label switch based on `editing` */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit parking' : 'Register parking'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Code</label>
              {/* Code is the unique identifier, so it's locked (disabled) once a parking exists */}
              <input className="input" placeholder="PK005" {...register('code', { required: 'Required' })} disabled={!!editing} />
              {errors.code && <p className="mt-1 text-xs text-rose-500">{errors.code.message}</p>}
            </div>
            <div>
              <label className="label">Fee per hour (RWF)</label>
              <input type="number" step="1" className="input" placeholder="500" {...register('chargingFeePerHour', { required: 'Required', min: { value: 0, message: '>= 0' } })} />
              {errors.chargingFeePerHour && <p className="mt-1 text-xs text-rose-500">{errors.chargingFeePerHour.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Parking name</label>
            <input className="input" placeholder="Kigali Heights Parking" {...register('parkingName', { required: 'Required' })} />
            {errors.parkingName && <p className="mt-1 text-xs text-rose-500">{errors.parkingName.message}</p>}
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="KG 7 Ave, Kigali" {...register('location', { required: 'Required' })} />
            {errors.location && <p className="mt-1 text-xs text-rose-500">{errors.location.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Total spaces</label>
              <input type="number" className="input" placeholder="120" {...register('totalSpaces', { required: 'Required', min: { value: 1, message: '>= 1' } })} />
              {errors.totalSpaces && <p className="mt-1 text-xs text-rose-500">{errors.totalSpaces.message}</p>}
            </div>
            <div>
              <label className="label">Available {editing ? '' : '(optional)'}</label>
              <input type="number" className="input" placeholder="= total" {...register('availableSpaces', { min: { value: 0, message: '>= 0' } })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline">Cancel</button>
            {/* Spinner while saving; label reflects edit vs create mode */}
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : editing ? 'Save changes' : 'Register'}</button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
