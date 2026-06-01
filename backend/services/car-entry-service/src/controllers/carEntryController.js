/**
 * controllers/carEntryController.js — request handlers for car-entry features.
 *
 * WHAT: Implements list/summary/get, register entry (issue ticket), register exit
 *       (compute bill), and ticket/bill lookups.
 * WHY:  Controllers hold the business logic; routes just wire URLs + validation +
 *       auth to these functions. Each handler uses try/catch and forwards errors to
 *       the central error handler via next(err) so responses stay consistent.
 *
 * Cross-service note: entry/exit logic calls the parking-service over HTTP
 * (parkingClient) to look up a parking by code and to occupy/release a space.
 */
const { Op } = require('sequelize'); // Op = Sequelize query operators (e.g. iLike for search)
const CarEntry = require('../models/CarEntry');
const parkingClient = require('../services/parkingClient');
const { success, error } = require('../utils/response');
const { formatDuration } = require('../utils/duration');
const logger = require('../config/logger');

/* ─────────────────────────────────────────────
   GET /api/car-entries
   Paginated list with optional filters
───────────────────────────────────────────── */
const listEntries = async (req, res, next) => {
  try {
    // Pagination: clamp page to >=1 and limit to 1..100 so a bad/huge query can't
    // overload the DB; offset is how many rows to skip to reach the requested page.
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Build the WHERE clause dynamically from optional query filters.
    const where = {};
    if (req.query.search) {
      // iLike = case-insensitive partial match; %...% matches the plate anywhere.
      where.plateNumber = { [Op.iLike]: `%${req.query.search}%` };
    }
    if (req.query.status) {
      where.status = req.query.status; // exact match on 'parked' | 'exited'
    }
    if (req.query.parkingCode) {
      where.parkingCode = req.query.parkingCode; // exact match on a parking lot
    }

    // findAndCountAll returns both the page of rows and the total count in one query,
    // which we need to compute totalPages for the pagination meta.
    const { count, rows } = await CarEntry.findAndCountAll({
      where,
      limit,
      offset,
      order: [['entryDateTime', 'DESC']], // newest entries first
    });

    const totalPages = Math.ceil(count / limit);
    return success(res, {
      message: 'Car entries retrieved successfully',
      data: rows,
      meta: { page, limit, total: count, totalPages },
    });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   GET /api/car-entries/stats/summary
   Admin summary statistics
───────────────────────────────────────────── */
const getSummary = async (req, res, next) => {
  try {
    // Aggregate counts via Sequelize COUNT queries (one per metric).
    const totalEntries = await CarEntry.count();
    const currentlyParked = await CarEntry.count({ where: { status: 'parked' } });
    const exited = await CarEntry.count({ where: { status: 'exited' } });

    // Sum chargedAmount for exited entries
    // sum() returns null when there are no matching rows, so default to 0.
    // parseFloat converts the DECIMAL string Postgres returns into a real number.
    const revenueResult = await CarEntry.sum('chargedAmount', { where: { status: 'exited' } });
    const totalRevenue = parseFloat(revenueResult || 0);

    return success(res, {
      message: 'Summary retrieved successfully',
      data: { totalEntries, currentlyParked, exited, totalRevenue },
    });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   GET /api/car-entries/:id
   Single entry by ID
───────────────────────────────────────────── */
const getEntry = async (req, res, next) => {
  try {
    // Look up by primary key (UUID from the URL); 404 if no such record.
    const entry = await CarEntry.findByPk(req.params.id);
    if (!entry) return error(res, { statusCode: 404, message: 'Car entry not found.' });
    return success(res, { message: 'Car entry retrieved successfully', data: entry });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   POST /api/car-entries
   Register car entry — admin only
───────────────────────────────────────────── */
const registerEntry = async (req, res, next) => {
  try {
    const { plateNumber, parkingCode } = req.body;
    // Capture the caller's JWT so we can forward it on the cross-service calls below;
    // the parking-service authenticates the request using this same token.
    const authHeader = req.headers.authorization;

    // 1. Verify parking exists and has space
    // Cross-service HTTP call to the parking-service. Wrapped in try/catch so an
    // upstream failure becomes a clean error response instead of a thrown crash.
    let parking;
    try {
      parking = await parkingClient.getByCode(parkingCode, authHeader);
    } catch (e) {
      return error(res, { statusCode: e.statusCode || 502, message: e.message });
    }

    if (!parking) {
      return error(res, { statusCode: 404, message: 'Parking lot not found.' });
    }
    // Reject entry if the lot is full (409 Conflict) before creating any record.
    if (parking.availableSpaces <= 0) {
      return error(res, { statusCode: 409, message: 'Parking is full. No available spaces.' });
    }

    // 2. Create the entry record
    // New cars start as 'parked' with no exit time and a zero bill until they leave.
    const entry = await CarEntry.create({
      plateNumber,
      parkingCode,
      entryDateTime: new Date(),
      status: 'parked',
      chargedAmount: 0,
      exitDateTime: null,
    });

    // 3. Notify parking service to occupy a space
    // Decrement the lot's available spaces on the parking-service side.
    try {
      await parkingClient.occupy(parkingCode, authHeader);
    } catch (e) {
      // Roll back the entry if the occupy call fails
      // Manual compensation: there are no DB transactions across services, so if
      // occupy fails we delete the just-created entry to avoid an orphaned record.
      await entry.destroy();
      return error(res, { statusCode: e.statusCode || 502, message: e.message });
    }

    logger.info(`[car-entry] Entry registered: ${entry.plateNumber} -> ${parkingCode} (${entry.id})`);

    // 4. Return ticket
    // Build the ticket the operator keeps; ?? / || fall back across the different
    // field names the parking-service might use (name/parkingName, fee variants).
    const ticket = {
      ticketId: entry.id,
      plateNumber: entry.plateNumber,
      parkingCode: entry.parkingCode,
      parkingName: parking.name || parking.parkingName || null,
      location: parking.location || null,
      entryDateTime: entry.entryDateTime,
      chargingFeePerHour: parking.chargingFeePerHour ?? parking.feePerHour ?? null,
      message: 'Keep this ticket for exit',
    };

    return success(res, { statusCode: 201, message: 'Car entry registered successfully', data: ticket });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   PATCH /api/car-entries/:id/exit
   Register car exit and compute bill — admin only
───────────────────────────────────────────── */
const registerExit = async (req, res, next) => {
  try {
    const entry = await CarEntry.findByPk(req.params.id);
    if (!entry) return error(res, { statusCode: 404, message: 'Car entry not found.' });
    // Guard against double-exit: a car already marked 'exited' has a final bill
    // and a released space, so re-processing it would corrupt the data.
    if (entry.status === 'exited') {
      return error(res, { statusCode: 400, message: 'This car has already exited.' });
    }

    const authHeader = req.headers.authorization; // forwarded to parking-service below
    const exitDateTime = new Date(); // exit time = now

    // Compute duration
    // Subtract timestamps to get milliseconds parked, then convert to minutes.
    // Math.ceil rounds partial minutes up so a customer is never under-charged.
    const durationMs = exitDateTime - new Date(entry.entryDateTime);
    const durationMinutes = Math.ceil(durationMs / 60000); // 60000 ms = 1 minute

    // Fetch current fee from parking service
    // Re-fetch the lot at exit time so billing always uses the latest fee.
    let parking;
    try {
      parking = await parkingClient.getByCode(entry.parkingCode, authHeader);
    } catch (e) {
      return error(res, { statusCode: e.statusCode || 502, message: e.message });
    }

    const chargingFeePerHour = parseFloat(parking.chargingFeePerHour ?? parking.feePerHour ?? 0);

    // Billing: minimum 1 hour, round up subsequent hours
    // Even a few minutes counts as one full hour (Math.max(1, ...)); each started
    // hour is billed in full (Math.ceil). bill = whole hours * hourly fee.
    const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
    const chargedAmount = parseFloat((billableHours * chargingFeePerHour).toFixed(2)); // toFixed(2) keeps it to cents

    // Persist exit
    // Status transition parked -> exited, recording exit time, duration and final bill.
    entry.exitDateTime = exitDateTime;
    entry.durationMinutes = durationMinutes;
    entry.chargedAmount = chargedAmount;
    entry.status = 'exited';
    await entry.save();

    // Release the parking space
    // Free a space on the parking-service so the lot shows availability again.
    try {
      await parkingClient.release(entry.parkingCode, authHeader);
    } catch (e) {
      // Log but do not roll back — entry is already marked exited
      // Unlike entry (where we roll back), the exit/bill is the source of truth;
      // a failed release is only logged so it can be reconciled later.
      logger.warn(`[car-entry] release failed for ${entry.parkingCode}: ${e.message}`);
    }

    logger.info(`[car-entry] Exit registered: ${entry.plateNumber} from ${entry.parkingCode}, bill ${chargedAmount} RWF`);

    // Return bill
    // Itemised receipt incl. a human-readable duration label (utils/duration).
    const bill = {
      entryId: entry.id,
      plateNumber: entry.plateNumber,
      parkingCode: entry.parkingCode,
      entryDateTime: entry.entryDateTime,
      exitDateTime: entry.exitDateTime,
      durationMinutes: entry.durationMinutes,
      durationLabel: formatDuration(durationMinutes),
      billableHours,
      chargingFeePerHour,
      chargedAmount: entry.chargedAmount,
      currency: 'RWF',
    };

    return success(res, { message: 'Car exit registered successfully', data: bill });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   GET /api/car-entries/:id/ticket
   Return ticket info for a given entry
───────────────────────────────────────────── */
const getTicket = async (req, res, next) => {
  try {
    const entry = await CarEntry.findByPk(req.params.id);
    if (!entry) return error(res, { statusCode: 404, message: 'Car entry not found.' });

    const authHeader = req.headers.authorization;

    // Attempt to enrich with parking details; tolerate failure
    // Unlike entry/exit, the ticket is still useful without parking details, so a
    // failed lookup is only logged and we fall back to nulls (note the ?. on parking).
    let parking = null;
    try {
      parking = await parkingClient.getByCode(entry.parkingCode, authHeader);
    } catch (e) {
      logger.warn(`[car-entry] getTicket: could not fetch parking data — ${e.message}`);
    }

    const ticket = {
      ticketId: entry.id,
      plateNumber: entry.plateNumber,
      parkingCode: entry.parkingCode,
      parkingName: parking?.name || parking?.parkingName || null,
      location: parking?.location || null,
      entryDateTime: entry.entryDateTime,
      chargingFeePerHour: parking?.chargingFeePerHour ?? parking?.feePerHour ?? null,
      status: entry.status,
      // Message depends on the current status transition state.
      message: entry.status === 'parked' ? 'Keep this ticket for exit' : 'Car has already exited',
    };

    return success(res, { message: 'Ticket retrieved successfully', data: ticket });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   GET /api/car-entries/:id/bill
   Return bill for an exited car
───────────────────────────────────────────── */
const getBill = async (req, res, next) => {
  try {
    const entry = await CarEntry.findByPk(req.params.id);
    if (!entry) return error(res, { statusCode: 404, message: 'Car entry not found.' });
    // A bill only exists once the car has exited; reject otherwise.
    if (entry.status !== 'exited') {
      return error(res, { statusCode: 400, message: 'Car has not exited yet.' });
    }

    const authHeader = req.headers.authorization;

    // Attempt to fetch fee for display; tolerate failure
    // The stored chargedAmount is authoritative; the live fee is fetched only for
    // display, so a failed lookup just leaves it null rather than failing the request.
    let chargingFeePerHour = null;
    try {
      const parking = await parkingClient.getByCode(entry.parkingCode, authHeader);
      chargingFeePerHour = parking?.chargingFeePerHour ?? parking?.feePerHour ?? null;
    } catch (e) {
      logger.warn(`[car-entry] getBill: could not fetch parking data — ${e.message}`);
    }

    // Recompute billableHours from the stored duration for display (chargedAmount itself is read from the record).
    const durationMinutes = entry.durationMinutes || 0;
    const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));

    const bill = {
      entryId: entry.id,
      plateNumber: entry.plateNumber,
      parkingCode: entry.parkingCode,
      entryDateTime: entry.entryDateTime,
      exitDateTime: entry.exitDateTime,
      durationMinutes,
      durationLabel: formatDuration(durationMinutes),
      billableHours,
      chargingFeePerHour,
      chargedAmount: parseFloat(entry.chargedAmount),
      currency: 'RWF',
    };

    return success(res, { message: 'Bill retrieved successfully', data: bill });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listEntries,
  getSummary,
  getEntry,
  registerEntry,
  registerExit,
  getTicket,
  getBill,
};
