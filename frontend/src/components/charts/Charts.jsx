/*
 * Charts.jsx
 * A small collection of reusable chart components (built on the Recharts library)
 * used across the dashboard/analytics pages: a revenue area chart, an occupancy
 * bar chart, and a generic donut/pie chart. Each one is a thin styled wrapper
 * around Recharts so the rest of the app just passes in `data` and gets a
 * branded, theme-friendly chart back.
 */
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { formatRWF, formatDateShort } from '../../lib/format'; // currency + date helpers for nice labels

/*
 * TooltipBox: a custom tooltip shown when the user hovers a chart point/bar.
 * Recharts passes `active`, `payload` (the hovered data) and `label`.
 * `valueFmt` is an optional formatter (e.g. format numbers as RWF currency).
 * We render our own styled box instead of the default so it matches the theme.
 */
const TooltipBox = ({ active, payload, label, valueFmt }) => {
  // Nothing is being hovered (or no data) -> render nothing
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800/95 px-3 py-2 text-xs text-white shadow-soft backdrop-blur">
      {/* Only show the heading (e.g. the date) when a label exists */}
      {label && <p className="mb-1 font-semibold text-slate-300">{label}</p>}
      {/* One line per data series; color the text to match the series color */}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {/* Apply the optional formatter if provided, otherwise show the raw value */}
          {p.name}: <span className="font-bold">{valueFmt ? valueFmt(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

/*
 * RevenueChart: a filled area chart showing revenue over time.
 * WHY: gives admins a quick visual trend of money earned per day.
 * Prop `data` is an array of { date, revenue } objects.
 */
export function RevenueChart({ data = [] }) {
  // Pre-compute a short, human-readable `label` (e.g. "12 May") for each X-axis point
  const chartData = data.map((d) => ({ ...d, label: formatDateShort(d.date) }));
  return (
    // ResponsiveContainer makes the chart fill its parent's width automatically
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          {/* Vertical gradient used to fill under the line: solid-ish at top, fading to transparent at bottom */}
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        {/* Y axis: format big numbers as "1k", "2k" etc. to keep labels compact */}
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={64}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
        {/* Use our custom tooltip and format the value as RWF currency */}
        <Tooltip content={<TooltipBox valueFmt={formatRWF} />} />
        {/* The actual area; "url(#revFill)" points to the gradient defined above */}
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={3} fill="url(#revFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/*
 * OccupancyChart: a stacked bar chart per parking lot.
 * WHY: shows at a glance how full each lot is (occupied vs available spaces).
 * Prop `data` is an array of { code, occupied, availableSpaces } objects.
 */
export function OccupancyChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        {/* vertical={false} = only draw horizontal grid lines for a cleaner look */}
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        {/* `cursor` is the faint highlight shown behind the hovered bar */}
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {/* Same stackId ("a") stacks these two bars on top of each other instead of side-by-side */}
        <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
        {/* Only the top bar gets rounded top corners so the whole stack looks like one rounded bar */}
        <Bar dataKey="availableSpaces" name="Available" stackId="a" fill="#22d3ee" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Palette cycled through for donut slices; index wraps around if there are more slices than colors
const PIE_COLORS = ['#6366f1', '#a855f7', '#22d3ee', '#34d399', '#f59e0b'];

/*
 * DonutChart: a pie chart with a hollow center (donut), used for breakdowns
 * such as revenue-by-category. `data` is [{ name, value }]; `valueFmt`
 * optionally formats the tooltip values (e.g. as currency).
 */
export function DonutChart({ data = [], valueFmt }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        {/* innerRadius > 0 is what turns a normal pie into a donut; paddingAngle adds gaps between slices */}
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={4}>
          {/* Give each slice its own color, wrapping the palette with the modulo (%) operator */}
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox valueFmt={valueFmt} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
