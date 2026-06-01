/**
 * reportController.js — Business logic for all admin report endpoints.
 * WHAT: Each handler reads the shared CarEntry / Parking tables and builds one
 *       report: outgoing cars + money charged, incoming cars, a KPI summary,
 *       revenue grouped per day, and occupancy per parking lot.
 * WHY: Controllers keep the heavy Sequelize queries out of the route file so
 *      routes stay readable. All responses use the shared {success,...} envelope.
 */
// Op = query operators (e.g. between); fn/col/literal build SQL aggregate expressions.
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/db');
const CarEntry = require('../models/CarEntry');
const Parking = require('../models/Parking');
const { success } = require('../utils/response');

/** Build a Date from an ISO string; falls back to `defaultDate` when falsy. */
// WHY: lets the 'from'/'to' query params be optional — missing ones use defaults.
const parseDate = (str, defaultDate) => (str ? new Date(str) : defaultDate);

/** Compute default date range: last 30 days to now. */
// WHY: when the caller gives no dates, reports default to a sensible recent window.
const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30); // rewind 30 days from today
  return { from, to };
};

// ---------------------------------------------------------------------------
// GET /api/reports/outgoing
// ---------------------------------------------------------------------------
/**
 * All cars that have exited (status='exited') with exitDateTime in [from, to].
 * Paginated. Meta includes totalCharged and count over the FULL filtered range.
 */
const getOutgoing = async (req, res, next) => {
  try {
    // Resolve the date window: use query params if given, else last-30-days default.
    const defaults = defaultRange();
    const from = parseDate(req.query.from, defaults.from);
    const to = parseDate(req.query.to, defaults.to);

    // Pagination: clamp page>=1 and 1<=limit<=100 so a bad query can't break the DB.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit; // how many rows to skip to reach this page

    // Filter: only cars that have actually left, with exit time inside [from, to].
    const where = {
      status: 'exited',
      exitDateTime: { [Op.between]: [from, to] }, // SQL: exitDateTime BETWEEN from AND to
    };

    // Full-range aggregates (not page-scoped)
    // WHY separate query: count + total money are computed over the WHOLE range,
    // not just the current page, so the dashboard totals stay correct.
    const aggregate = await CarEntry.findOne({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'count'], // SQL COUNT(id) -> number of exited cars
        [fn('SUM', col('chargedAmount')), 'totalCharged'], // SQL SUM(chargedAmount) -> total revenue
      ],
      raw: true, // return plain numbers instead of model instances
    });

    // Aggregates come back as strings; parse them and default to 0 if null (no rows).
    const total = parseInt(aggregate.count, 10) || 0;
    const totalCharged = parseFloat(aggregate.totalCharged) || 0;
    const totalPages = Math.ceil(total / limit); // round up so a partial last page counts

    // Fetch just this page of rows, newest exits first.
    const rows = await CarEntry.findAll({
      where,
      order: [['exitDateTime', 'DESC']],
      limit,
      offset,
    });

    // Return the page of rows plus full-range pagination + money totals in meta.
    return success(res, {
      message: 'Outgoing cars retrieved successfully',
      data: rows,
      meta: { page, limit, total, totalPages, count: total, totalCharged },
    });
  } catch (err) {
    next(err); // hand any DB/error to the central errorHandler middleware
  }
};

// ---------------------------------------------------------------------------
// GET /api/reports/incoming
// ---------------------------------------------------------------------------
/**
 * All cars that entered (any status) with entryDateTime in [from, to]. Paginated.
 */
const getIncoming = async (req, res, next) => {
  try {
    // Same date-range + pagination setup as getOutgoing.
    const defaults = defaultRange();
    const from = parseDate(req.query.from, defaults.from);
    const to = parseDate(req.query.to, defaults.to);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // Filter on ENTRY time (any status) — incoming counts every car that arrived.
    const where = {
      entryDateTime: { [Op.between]: [from, to] },
    };

    // findAndCountAll does the page query AND the total count in one call.
    const { count: total, rows } = await CarEntry.findAndCountAll({
      where,
      order: [['entryDateTime', 'DESC']], // newest arrivals first
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    return success(res, {
      message: 'Incoming cars retrieved successfully',
      data: rows,
      meta: { page, limit, total, totalPages },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/reports/summary
// ---------------------------------------------------------------------------
/**
 * High-level dashboard numbers queried from both CarEntry and Parking tables.
 */
const getSummary = async (req, res, next) => {
  try {
    // Car-entry aggregates
    // One row of headline numbers from car_entries.
    const entryAgg = await CarEntry.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'totalEntries'], // every car ever recorded
        // Conditional SUM: only add chargedAmount for exited cars (parked cars
        // haven't paid yet). literal() injects raw SQL; chargedAmount is quoted
        // because it is a camelCase column name in Postgres.
        [fn('SUM', literal("CASE WHEN status = 'exited' THEN \"chargedAmount\" ELSE 0 END")), 'totalRevenue'],
      ],
      raw: true,
    });

    // Two quick COUNT(*) queries for the current live/finished split.
    const currentlyParked = await CarEntry.count({ where: { status: 'parked' } });
    const totalExited = await CarEntry.count({ where: { status: 'exited' } });

    // Parking aggregates
    // Capacity totals across all parking lots.
    const parkingAgg = await Parking.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'totalParkings'], // number of parking lots
        [fn('SUM', col('totalSpaces')), 'totalSpaces'], // combined capacity
        [fn('SUM', col('availableSpaces')), 'totalAvailable'], // combined free spaces
      ],
      raw: true,
    });

    // Convert string aggregates to numbers (default 0 when there are no rows).
    const totalEntries = parseInt(entryAgg.totalEntries, 10) || 0;
    const totalRevenue = parseFloat(entryAgg.totalRevenue) || 0;
    const totalParkings = parseInt(parkingAgg.totalParkings, 10) || 0;
    const totalSpaces = parseInt(parkingAgg.totalSpaces, 10) || 0;
    const totalAvailable = parseInt(parkingAgg.totalAvailable, 10) || 0;
    const occupiedSpaces = totalSpaces - totalAvailable; // occupied = capacity - free

    return success(res, {
      message: 'Summary retrieved successfully',
      data: {
        totalEntries,
        currentlyParked,
        totalExited,
        totalRevenue,
        totalParkings,
        totalSpaces,
        totalAvailable,
        occupiedSpaces,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/reports/revenue
// ---------------------------------------------------------------------------
/**
 * Revenue + car count grouped by day for charting.
 * Returns only days that have data (status='exited') within [from, to].
 */
const getRevenue = async (req, res, next) => {
  try {
    const defaults = defaultRange();
    const from = parseDate(req.query.from, defaults.from);
    const to = parseDate(req.query.to, defaults.to);

    // Group exited cars by calendar day and sum money + count cars per day.
    const rows = await CarEntry.findAll({
      where: {
        status: 'exited', // only paying (exited) cars contribute revenue
        exitDateTime: { [Op.between]: [from, to] },
      },
      attributes: [
        [fn('DATE', col('exitDateTime')), 'date'], // strip the time, keep just the day
        [fn('SUM', col('chargedAmount')), 'revenue'], // money earned that day
        [fn('COUNT', col('id')), 'cars'], // cars that left that day
      ],
      group: [fn('DATE', col('exitDateTime'))], // one result row per day (SQL GROUP BY)
      order: [[fn('DATE', col('exitDateTime')), 'ASC']], // chronological, good for charts
      raw: true,
    });

    // Normalise the SQL strings into clean numbers for the chart frontend.
    const data = rows.map((r) => ({
      date: r.date,
      revenue: parseFloat(r.revenue) || 0,
      cars: parseInt(r.cars, 10) || 0,
    }));

    return success(res, {
      message: 'Revenue data retrieved successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/reports/occupancy
// ---------------------------------------------------------------------------
/**
 * Per-parking occupancy metrics for charts, plus system-wide totals.
 */
const getOccupancy = async (req, res, next) => {
  try {
    const parkings = await Parking.findAll({ raw: true }); // load every lot's capacity

    // Running totals across all lots, accumulated while looping below.
    let sumTotal = 0;
    let sumAvailable = 0;

    const data = parkings.map((p) => {
      const occupied = p.totalSpaces - p.availableSpaces; // taken = capacity - free
      // Occupancy % = occupied / capacity * 100, rounded to 2 d.p.
      // Guard against divide-by-zero if a lot somehow has 0 total spaces.
      const occupancyRate = p.totalSpaces > 0
        ? parseFloat(((occupied / p.totalSpaces) * 100).toFixed(2))
        : 0;

      sumTotal += p.totalSpaces; // add to system-wide capacity
      sumAvailable += p.availableSpaces; // add to system-wide free count

      return {
        code: p.code,
        parkingName: p.parkingName,
        totalSpaces: p.totalSpaces,
        availableSpaces: p.availableSpaces,
        occupied,
        occupancyRate,
      };
    });

    // System-wide rollup using the totals accumulated in the loop.
    const totals = {
      totalSpaces: sumTotal,
      totalAvailable: sumAvailable,
      totalOccupied: sumTotal - sumAvailable,
      // Overall occupancy %, same divide-by-zero guard as per-lot above.
      overallOccupancyRate: sumTotal > 0
        ? parseFloat((((sumTotal - sumAvailable) / sumTotal) * 100).toFixed(2))
        : 0,
    };

    return success(res, {
      message: 'Occupancy data retrieved successfully',
      data,
      meta: { totals },
    });
  } catch (err) {
    next(err);
  }
};

// Export every handler so reportRoutes.js can wire each to its endpoint.
module.exports = { getOutgoing, getIncoming, getSummary, getRevenue, getOccupancy };
