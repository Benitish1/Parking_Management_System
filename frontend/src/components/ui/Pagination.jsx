/*
 * Pagination.jsx
 * The page-navigation footer used by DataTable. It shows a "Showing X-Y of Z"
 * summary plus numbered page buttons with previous/next arrows. It condenses
 * long page lists using "…" so only the first/last and a few pages around the
 * current one are shown.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

/*
 * Props: `page` (current page), `totalPages`, `total` (total records),
 * `limit` (rows per page) and `onPage(newPage)` to request a page change.
 */
export default function Pagination({ page, totalPages, total, limit, onPage }) {
  // Don't render a pager if there's nothing/one page to paginate
  if (!totalPages || totalPages < 1) return null;
  // "from" = index of the first row on this page (1-based); 0 when there's no data
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  // "to" = index of the last row on this page, capped at the total count
  const to = Math.min(page * limit, total);

  // Build the list of page buttons, inserting '…' where pages are skipped
  const pages = [];
  const window = 1; // how many pages to show on each side of the current page
  for (let i = 1; i <= totalPages; i++) {
    // Always show first, last, and the pages within `window` of the current page...
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) pages.push(i);
    // ...otherwise add a single ellipsis (avoid pushing two '…' in a row)
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/60 px-4 py-3 dark:border-white/5 sm:flex-row">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{from}</span>–
        <span className="font-semibold text-slate-700 dark:text-slate-300">{to}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        {/* Previous-page arrow, disabled on the first page */}
        <button className="btn-ghost !px-2" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {/* Render each entry: ellipsis as plain text, numbers as clickable buttons */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-2 text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              // Highlight the button for the page we're currently on
              className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${
                p === page
                  ? 'bg-brand-gradient text-white shadow-glow'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          )
        )}
        {/* Next-page arrow, disabled on the last page */}
        <button className="btn-ghost !px-2" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
