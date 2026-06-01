// format.js — small presentation helpers for turning raw data (numbers, dates,
// durations) into nicely formatted strings for the UI. Centralising them keeps the
// formatting consistent across every page and out of the components themselves.

// Format a money amount as Rwandan Francs, e.g. 1500 -> "RWF 1,500".
// `Number(amount || 0)` guards against null/undefined so we never print "NaN".
export const formatRWF = (amount) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

// Add thousands separators to a plain number, e.g. 12000 -> "12,000".
export const formatNumber = (n) => new Intl.NumberFormat('en-US').format(Number(n || 0));

// Full date + time for detailed views, e.g. "30 May 2026, 14:05". Returns a dash when no date.
export const formatDate = (d) => {
  if (!d) return '—'; // nothing to show for missing dates
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Date-only variant for compact spots like tables, e.g. "30 May 2026".
export const formatDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Turn a count of minutes into a friendly label, e.g. 135 -> "2h 15m" (hours hidden when 0).
export const durationLabel = (minutes) => {
  if (minutes == null) return '—'; // == also catches undefined
  const h = Math.floor(minutes / 60); // whole hours
  const m = minutes % 60; // leftover minutes
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};

// for <input type="datetime-local"> default values
// That input needs a "YYYY-MM-DDTHH:mm" string in LOCAL time. toISOString() gives UTC,
// so we subtract the timezone offset first, then slice off the seconds/zone part.
export const toInputDate = (d) => {
  const dt = d ? new Date(d) : new Date(); // use given date, or now if none provided
  const off = dt.getTimezoneOffset(); // minutes between local time and UTC
  return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16);
};
