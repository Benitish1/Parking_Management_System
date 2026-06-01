/*
 * controllers/userController.js — business logic for admin user management.
 * Each handler reads from / writes to the shared User model and replies using the
 * standard {success, message, data, meta} envelope. Errors are passed to next(err)
 * so the central errorHandler formats them. All routes here are already admin-gated.
 */
const { Op } = require('sequelize'); // Op = Sequelize operators (e.g. Op.or, Op.iLike) for building WHERE clauses
const User = require('../models/User');
const { success, error } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/users
 * Paginated list of users with optional search (firstName/lastName/email) and role filter.
 */
const listUsers = async (req, res, next) => {
  try {
    // Clamp pagination inputs so a client can't request page 0/negative or an unbounded page size
    const page = Math.max(1, parseInt(req.query.page, 10) || 1); // never below 1
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10)); // 1..100, default 10
    const offset = (page - 1) * limit; // how many rows to skip to reach this page

    const where = {}; // built up conditionally so empty queries return everything

    // Full-text search across name fields and email
    if (req.query.search) {
      const term = `%${req.query.search}%`; // % wildcards = "contains" match
      // Op.iLike = case-INsensitive LIKE (Postgres); Op.or matches the term in ANY of the three columns
      where[Op.or] = [
        { firstName: { [Op.iLike]: term } },
        { lastName: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
      ];
    }

    // Optional role filter (e.g. only admins or only attendants)
    if (req.query.role) {
      where.role = req.query.role;
    }

    // findAndCountAll returns both the page of rows AND the total count in one query (needed for totalPages)
    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']], // newest users first
    });

    const totalPages = Math.ceil(count / limit); // round up so a partial last page still counts

    // Note: rows use the model's defaultScope, so password/otp fields are already excluded
    return success(res, {
      message: 'Users retrieved successfully',
      data: rows,
      meta: { page, limit, total: count, totalPages }, // pagination metadata for the client
    });
  } catch (err) {
    next(err); // hand any unexpected error to the central error handler
  }
};

/**
 * GET /api/users/:id
 * Retrieve a single user by primary key.
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id); // lookup by UUID primary key
    if (!user) {
      // Distinguish "valid id but no such user" with a 404 rather than a generic error
      return error(res, { statusCode: 404, message: 'User not found.' });
    }
    return success(res, { message: 'User retrieved successfully', data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users
 * Admin creates a new user; account is pre-verified (isVerified = true).
 */
const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body; // already validated by route rules

    // Check for duplicate email — unscoped() bypasses the defaultScope so the lookup can see all rows;
    // we normalise (lowercase+trim) to match how the model stores emails and avoid case-only duplicates
    const existing = await User.unscoped().findOne({ where: { email: String(email).toLowerCase().trim() } });
    if (existing) {
      return error(res, { statusCode: 409, message: 'A user with this email already exists.' }); // 409 = conflict
    }

    // password is hashed automatically by the model's beforeSave hook — we never hash it here
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      isVerified: true, // Admin-created accounts are pre-verified (skip the email/OTP flow the auth-service uses)
    });

    // Audit trail: record which admin created which user
    logger.info(`[user-service] Admin ${req.user.id} created user ${user.id} (${user.email})`);

    // Re-fetch through the default scope to strip the password field (so the hash never leaks in the response)
    const safeUser = await User.findByPk(user.id);

    return success(res, { statusCode: 201, message: 'User created successfully', data: safeUser }); // 201 = created
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 * Update firstName, lastName, role, isVerified. Email and password are not editable here.
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return error(res, { statusCode: 404, message: 'User not found.' });
    }

    const { firstName, lastName, role, isVerified } = req.body;

    // Spread-only-if-defined: each `...(x !== undefined && { x })` adds the field ONLY when the client sent it,
    // so omitted fields keep their current value (a partial update) instead of being overwritten with undefined.
    // Email and password are intentionally not accepted here.
    await user.update({
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(role !== undefined && { role }),
      ...(isVerified !== undefined && { isVerified }),
    });

    // Re-fetch through default scope to ensure response excludes sensitive fields (password/otp)
    const updated = await User.findByPk(user.id);

    logger.info(`[user-service] Admin ${req.user.id} updated user ${user.id}`); // audit trail

    return success(res, { message: 'User updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Delete a user. Admins cannot delete their own account.
 */
const deleteUser = async (req, res, next) => {
  try {
    // Prevent self-deletion — stops an admin locking themselves (and possibly everyone) out of the system
    if (req.params.id === req.user.id) {
      return error(res, { statusCode: 400, message: 'You cannot delete your own account.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return error(res, { statusCode: 404, message: 'User not found.' });
    }

    await user.destroy(); // remove the row from the shared users table

    logger.info(`[user-service] Admin ${req.user.id} deleted user ${req.params.id}`); // audit trail

    return success(res, { message: 'User deleted successfully' }); // no data payload needed on delete
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/stats/summary
 * Aggregate counts for the admin dashboard.
 */
const getStats = async (req, res, next) => {
  try {
    // Run all five COUNT queries in parallel (Promise.all) for speed; unscoped() so the
    // defaultScope's attribute exclusion doesn't interfere with a plain count.
    const [totalUsers, admins, attendants, verified, unverified] = await Promise.all([
      User.unscoped().count(), // total number of users
      User.unscoped().count({ where: { role: 'admin' } }),
      User.unscoped().count({ where: { role: 'attendant' } }),
      User.unscoped().count({ where: { isVerified: true } }),
      User.unscoped().count({ where: { isVerified: false } }),
    ]);

    // Aggregated counts power the admin dashboard summary cards
    return success(res, {
      message: 'User stats retrieved successfully',
      data: { totalUsers, admins, attendants, verified, unverified },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, getStats };
