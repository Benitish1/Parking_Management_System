// ---------------------------------------------------------------------------
// controllers/parkingController.js — Business logic for every parking endpoint.
// WHAT: CRUD on parking lots plus the occupy/release/stats operations.
// WHY:  controllers keep route files thin; each handler reads the request,
//       talks to the Parking model, and replies using the shared response
//       envelope {success, message, data, meta}. Errors are forwarded to the
//       central errorHandler via next(err).
// ---------------------------------------------------------------------------
const { Op } = require('sequelize');      // Op gives us query operators like Op.or / Op.iLike
const Parking = require('../models/Parking');
const { success, error } = require('../utils/response');
const logger = require('../config/logger');

/** GET /api/parkings — Paginated, optionally-searchable list of parking lots. */
const listParkings = async (req, res, next) => {
  try {
    // Parse pagination from the query string defensively:
    // page is at least 1; limit is clamped to 1..100 so a client can't request huge pages
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;   // how many rows to skip to reach this page
    const search = req.query.search ? req.query.search.trim() : null;

    // Build the WHERE clause: if searching, match the term (case-insensitive, partial)
    // against code OR parkingName OR location; otherwise no filter (return all).
    const where = search
      ? {
          [Op.or]: [
            { code: { [Op.iLike]: `%${search}%` } },
            { parkingName: { [Op.iLike]: `%${search}%` } },
            { location: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    // findAndCountAll returns both the page of rows AND the total matching count
    // in one query — total is needed to compute totalPages for the client.
    const { count: total, rows: data } = await Parking.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],    // newest parking lots first
    });

    return success(res, {
      message: 'Parkings retrieved successfully',
      data,
      // Pagination metadata so the frontend can render page controls
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit), // round up: any leftover rows need an extra page
      },
    });
  } catch (err) {
    next(err);                           // hand DB/unexpected errors to the central error handler
  }
};

/** GET /api/parkings/:id — Fetch a single parking lot by its UUID primary key. */
const getParkingById = async (req, res, next) => {
  try {
    const parking = await Parking.findByPk(req.params.id); // look up by primary key
    if (!parking) return error(res, { statusCode: 404, message: 'Parking not found.' }); // 404 if no match
    return success(res, { message: 'Parking retrieved successfully', data: parking });
  } catch (err) {
    next(err);
  }
};

/** GET /api/parkings/code/:code — Fetch a single parking lot by its business code.
 *  Used by the car-entry-service, which knows lots by code (e.g. "PK001") rather than UUID. */
const getParkingByCode = async (req, res, next) => {
  try {
    // Codes are stored upper-cased, so upper-case the lookup to make it case-insensitive
    const parking = await Parking.findOne({ where: { code: req.params.code.toUpperCase() } });
    if (!parking) return error(res, { statusCode: 404, message: 'Parking not found.' });
    return success(res, { message: 'Parking retrieved successfully', data: parking });
  } catch (err) {
    next(err);
  }
};

/** POST /api/parkings — Create a new parking lot (admin only; enforced in the route). */
const createParking = async (req, res, next) => {
  try {
    const { code, parkingName, totalSpaces, availableSpaces, location, chargingFeePerHour } = req.body;

    // Reject duplicates up front: codes are unique, so check before inserting and
    // return a clear 409 Conflict instead of letting the DB throw a raw constraint error.
    const existing = await Parking.findOne({ where: { code: String(code).toUpperCase().trim() } });
    if (existing) {
      return error(res, { statusCode: 409, message: `Parking with code '${code.toUpperCase()}' already exists.` });
    }

    const parking = await Parking.create({
      code,
      parkingName,
      totalSpaces,
      // If the caller didn't supply availableSpaces, start the lot completely empty (= totalSpaces)
      availableSpaces: availableSpaces !== undefined && availableSpaces !== null ? availableSpaces : totalSpaces,
      location,
      chargingFeePerHour,
    });

    logger.info(`[parking-service] Created parking: ${parking.code}`);
    return success(res, { statusCode: 201, message: 'Parking created successfully', data: parking }); // 201 Created
  } catch (err) {
    next(err);
  }
};

/** PUT /api/parkings/:id — Update an existing parking lot (admin only).
 *  All body fields are optional; only the ones provided get changed. */
const updateParking = async (req, res, next) => {
  try {
    const parking = await Parking.findByPk(req.params.id);
    if (!parking) return error(res, { statusCode: 404, message: 'Parking not found.' });

    const { code, parkingName, totalSpaces, availableSpaces, location, chargingFeePerHour } = req.body;

    // Work out the resulting capacity, keeping the current values when a field is omitted
    let newAvailableSpaces = parking.availableSpaces;
    const newTotalSpaces = totalSpaces !== undefined ? totalSpaces : parking.totalSpaces;

    if (availableSpaces !== undefined) {
      newAvailableSpaces = availableSpaces;
    }

    // Guard the invariant availableSpaces <= totalSpaces, e.g. if total was shrunk
    if (newAvailableSpaces > newTotalSpaces) {
      newAvailableSpaces = newTotalSpaces;
    }

    // Spread syntax conditionally includes a key ONLY when that field was sent,
    // so unspecified fields are left untouched (a true partial update).
    await parking.update({
      ...(code !== undefined && { code }),
      ...(parkingName !== undefined && { parkingName }),
      ...(totalSpaces !== undefined && { totalSpaces: newTotalSpaces }),
      availableSpaces: newAvailableSpaces, // always written, since it may have been capped above
      ...(location !== undefined && { location }),
      ...(chargingFeePerHour !== undefined && { chargingFeePerHour }),
    });

    logger.info(`[parking-service] Updated parking: ${parking.code}`);
    return success(res, { message: 'Parking updated successfully', data: parking });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/parkings/:id — Permanently remove a parking lot (admin only). */
const deleteParking = async (req, res, next) => {
  try {
    const parking = await Parking.findByPk(req.params.id);
    if (!parking) return error(res, { statusCode: 404, message: 'Parking not found.' });

    await parking.destroy();             // delete the row from the database
    logger.info(`[parking-service] Deleted parking: ${parking.code}`);
    return success(res, { message: 'Parking deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/parkings/code/:code/occupy — Take one space (car ENTERS).
 *  Called internally by the car-entry-service whenever a car drives in. */
const occupyParking = async (req, res, next) => {
  try {
    const parking = await Parking.findOne({ where: { code: req.params.code.toUpperCase() } });
    if (!parking) return error(res, { statusCode: 404, message: 'Parking not found.' });

    // Can't occupy a space that doesn't exist — reject when the lot is already full
    if (parking.availableSpaces <= 0) {
      return error(res, { statusCode: 409, message: 'Parking is full.' });
    }

    // One car entered, so one fewer space is available
    await parking.update({ availableSpaces: parking.availableSpaces - 1 });
    logger.info(`[parking-service] Occupied 1 space in ${parking.code} — available: ${parking.availableSpaces}`);
    return success(res, { message: 'Parking space occupied', data: parking });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/parkings/code/:code/release — Free one space (car EXITS).
 *  Called internally by the car-entry-service whenever a car leaves. */
const releaseParking = async (req, res, next) => {
  try {
    const parking = await Parking.findOne({ where: { code: req.params.code.toUpperCase() } });
    if (!parking) return error(res, { statusCode: 404, message: 'Parking not found.' });

    // One car left, so one more space is free — but never exceed totalSpaces
    // (Math.min guards against double-releases pushing the count above capacity).
    const newAvailable = Math.min(parking.availableSpaces + 1, parking.totalSpaces);
    await parking.update({ availableSpaces: newAvailable });
    logger.info(`[parking-service] Released 1 space in ${parking.code} — available: ${parking.availableSpaces}`);
    return success(res, { message: 'Parking space released', data: parking });
  } catch (err) {
    next(err);
  }
};

/** GET /api/parkings/stats/occupancy — Aggregate occupancy report (admin only).
 *  Returns per-lot figures plus a system-wide overall summary for dashboards. */
const getOccupancyStats = async (req, res, next) => {
  try {
    const parkings = await Parking.findAll({ order: [['code', 'ASC']] }); // every lot, ordered by code

    // For each lot, derive occupied count and a percentage occupancy rate
    const perParking = parkings.map((p) => {
      const occupied = p.totalSpaces - p.availableSpaces; // occupancy math: total minus free = in use
      const occupancyRate =
        // (occupied / total) * 100, rounded to 2 dp; guard divide-by-zero when a lot has 0 spaces
        p.totalSpaces > 0 ? parseFloat(((occupied / p.totalSpaces) * 100).toFixed(2)) : 0;
      return {
        code: p.code,
        parkingName: p.parkingName,
        totalSpaces: p.totalSpaces,
        availableSpaces: p.availableSpaces,
        occupied,
        occupancyRate,
      };
    });

    // Roll up the whole system: sum capacity and free spaces across all lots
    const totalSpaces = parkings.reduce((sum, p) => sum + p.totalSpaces, 0);
    const totalAvailable = parkings.reduce((sum, p) => sum + p.availableSpaces, 0);
    const totalOccupied = totalSpaces - totalAvailable;

    return success(res, {
      message: 'Occupancy statistics retrieved successfully',
      data: {
        parkings: perParking,
        overall: { totalSpaces, totalAvailable, totalOccupied },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listParkings,
  getParkingById,
  getParkingByCode,
  createParking,
  updateParking,
  deleteParking,
  occupyParking,
  releaseParking,
  getOccupancyStats,
};
