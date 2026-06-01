/*
 * Users.jsx
 * Admin user-management page: searchable, role-filterable, paginated table of
 * users with create/edit/delete via a modal. Create requires email + temporary
 * password; edit only changes name/role/verified status. You can't delete
 * yourself (the delete button is hidden on your own row).
 * Access: admins only.
 */
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Pencil, Trash2, Users as UsersIcon, ShieldCheck, ShieldX } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { Badge, Spinner } from '../components/ui/Primitives';
import { confirmDelete } from '../components/ui/confirm';
import { userService } from '../services';
import { formatDateShort } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';

const LIMIT = 8; // rows per page

export default function Users() {
  const { user: me } = useAuth(); // the logged-in admin, used to prevent self-deletion
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(''); // name/email search text
  const [roleFilter, setRoleFilter] = useState(''); // '' = all roles, or 'admin' / 'attendant'
  const debounced = useDebounce(search); // delayed search so we don't query on every keystroke

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // user being edited, or null when creating
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Load the current page of users, applying search and role filters.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({ page, limit: LIMIT, search: debounced, role: roleFilter || undefined });
      setRows(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debounced, roleFilter]);

  useEffect(() => { load(); }, [load]); // reload when page/search/role change
  useEffect(() => { setPage(1); }, [debounced, roleFilter]); // changing a filter resets to page 1

  // Open the modal to add a new user: blank form including the create-only email/password fields.
  const openCreate = () => {
    setEditing(null);
    reset({ firstName: '', lastName: '', email: '', password: '', role: 'attendant' });
    setModalOpen(true);
  };
  // Open the modal to edit: pre-fill editable fields (email/password aren't editable here).
  const openEdit = (u) => {
    setEditing(u);
    reset({ firstName: u.firstName, lastName: u.lastName, role: u.role, isVerified: u.isVerified });
    setModalOpen(true);
  };

  // Shared submit. Edit sends only the editable fields; create sends the whole form.
  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await userService.update(editing.id, {
          firstName: values.firstName, lastName: values.lastName, role: values.role, isVerified: !!values.isVerified, // !! coerces the checkbox to a real boolean
        });
        toast.success('User updated');
      } else {
        await userService.create(values);
        toast.success('User created');
      }
      setModalOpen(false);
      load(); // refresh so the new/updated user appears
    } catch (err) {
      // Backend may return multiple field errors (e.g. weak password + bad email) — show each.
      if (err.errors?.length) err.errors.forEach((e) => toast.error(e.message));
      else toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Delete flow: confirm first, then remove and refresh.
  const onDelete = async (u) => {
    if (await confirmDelete(`${u.firstName} ${u.lastName}`)) {
      try {
        await userService.remove(u.id);
        toast.success('User deleted');
        load();
      } catch (err) {
        toast.error(err.message || 'Delete failed');
      }
    }
  };

  // Table column definitions; each render builds that cell's content.
  const columns = [
    {
      key: 'name', header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          {/* Avatar shows the user's initials (first letter of first + last name) */}
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">
            {u.firstName?.[0]}{u.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">{u.firstName} {u.lastName}</p>
            <p className="text-xs text-slate-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <Badge color={u.role === 'admin' ? 'purple' : 'brand'} className="capitalize">{u.role}</Badge> },
    {
      key: 'isVerified', header: 'Status',
      // Green "Verified" badge once the user has confirmed their email, amber "Pending" otherwise.
      render: (u) => u.isVerified
        ? <Badge color="green"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
        : <Badge color="amber"><ShieldX className="h-3 w-3" /> Pending</Badge>,
    },
    { key: 'createdAt', header: 'Joined', render: (u) => <span className="text-slate-500">{formatDateShort(u.createdAt)}</span> },
    {
      key: 'actions', header: '', className: 'text-right', cellClassName: 'text-right',
      render: (u) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(u)} className="btn-ghost !p-2" title="Edit"><Pencil className="h-4 w-4" /></button>
          {/* Hide delete on your own row so an admin can't delete themselves */}
          {u.id !== me?.id && (
            <button onClick={() => onDelete(u)} className="btn-ghost !p-2 !text-rose-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-11" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {/* Role filter dropdown; empty value means show all roles */}
          <select className="input sm:w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="attendant">Attendant</option>
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add user</button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        emptyIcon={UsersIcon}
        emptyTitle="No users found"
        emptyAction={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add user</button>}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit user' : 'Add user'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input className="input" {...register('firstName', { required: 'Required' })} />
              {errors.firstName && <p className="mt-1 text-xs text-rose-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" {...register('lastName', { required: 'Required' })} />
              {errors.lastName && <p className="mt-1 text-xs text-rose-500">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Email + temporary password only appear when creating a user (they can't be edited here) */}
          {!editing && (
            <>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" {...register('email', { required: 'Required' })} />
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Temporary password</label>
                <input type="text" className="input" placeholder="Min 8 chars, A-z, 0-9" {...register('password', { required: 'Required', minLength: { value: 8, message: 'At least 8 characters' } })} />
                {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input" {...register('role', { required: true })}>
                <option value="attendant">Parking Attendant</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            {/* The "verified" toggle is only relevant when editing an existing user */}
            {editing && (
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" className="h-4 w-4 rounded accent-brand-500" {...register('isVerified')} />
                  Verified account
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : editing ? 'Save changes' : 'Create user'}</button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
