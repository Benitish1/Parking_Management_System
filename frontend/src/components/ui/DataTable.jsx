/*
 * DataTable.jsx
 * A reusable table component used by most list pages (parkings, car entries,
 * users, etc.). You describe the columns once and pass in the rows; it handles
 * the loading skeleton, the empty state, row animations, and the pagination
 * footer for you, so each page doesn't have to re-implement a table.
 */
import { motion } from 'framer-motion';
import { TableSkeleton, EmptyState } from './Primitives';
import Pagination from './Pagination';

/**
 * Generic, elegant data table with built-in loading skeletons,
 * empty state and pagination footer.
 *
 * columns: [{ key, header, render?(row), className? }]
 */
/*
 * Props in brief:
 *  - columns: column definitions; each may include a render(row) for custom cells
 *  - rows: the data to display
 *  - loading: show skeleton placeholders instead of rows while fetching
 *  - meta/onPage: pagination info ({ page, totalPages, total, limit }) + page-change handler
 *  - empty*: title/subtitle/icon/action shown when there are no rows
 */
export default function DataTable({
  columns,
  rows = [],
  loading = false,
  meta = null,
  onPage = () => {},
  emptyTitle = 'No records found',
  emptySubtitle = '',
  emptyIcon,
  emptyAction,
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/70 text-xs uppercase tracking-wider text-slate-500 dark:border-white/5">
              {/* Build the header row from the column definitions */}
              {columns.map((c) => (
                <th key={c.key} className={`px-5 py-3.5 font-semibold ${c.className || ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Only render data rows when we're not loading */}
            {!loading &&
              rows.map((row, i) => (
                // motion.tr animates each row fading/sliding in; the delay below
                // is staggered (i * 0.03) so rows appear one after another
                <motion.tr
                  key={row.id || i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-slate-100 transition-colors hover:bg-brand-500/5 dark:border-white/5"
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-5 py-3.5 text-slate-700 dark:text-slate-200 ${c.cellClassName || ''}`}>
                      {/* Use the column's custom render() if given, otherwise just print row[key] */}
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </motion.tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* While loading, show placeholder bars matching the number of columns */}
      {loading && <TableSkeleton rows={6} cols={columns.length} />}

      {/* If finished loading but there's no data, show the friendly empty state */}
      {!loading && rows.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} action={emptyAction} />
      )}

      {/* Show the pagination footer only when we have data and pagination meta */}
      {!loading && meta && rows.length > 0 && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPage={onPage}
        />
      )}
    </div>
  );
}
