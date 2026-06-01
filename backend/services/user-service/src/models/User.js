/*
 * models/User.js — Sequelize model mapping to the shared `users` table.
 * This is the SAME model/table the auth-service uses, so the column definitions,
 * password hashing and scopes must stay consistent across both services.
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs'); // for hashing/comparing passwords (never store plaintext)
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    // UUID primary key, auto-generated — avoids guessable sequential IDs
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } }, // required, non-blank
    lastName: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // one account per email (enforced at the DB level)
      validate: { isEmail: true }, // reject malformed emails before insert
      // Custom setter normalises email (lowercase + trim) so duplicates/lookups are case-insensitive
      set(value) {
        this.setDataValue('email', String(value).toLowerCase().trim());
      },
    },
    password: { type: DataTypes.STRING, allowNull: false }, // stores the bcrypt HASH, not the raw password
    role: {
      type: DataTypes.ENUM('admin', 'attendant'), // only these two roles are valid
      allowNull: false,
      defaultValue: 'attendant', // least-privilege default
    },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false }, // email/OTP verification flag
    otpCode: { type: DataTypes.STRING, allowNull: true }, // one-time code used by auth-service verification flow
    otpExpiresAt: { type: DataTypes.DATE, allowNull: true }, // expiry for the OTP above
  },
  {
    tableName: 'users', // explicit table name shared by all services
    timestamps: true, // adds createdAt / updatedAt automatically
    // defaultScope hides sensitive fields on EVERY normal query, so secrets never leak into responses
    defaultScope: { attributes: { exclude: ['password', 'otpCode', 'otpExpiresAt'] } },
    // Opt-in scope to re-include those fields when genuinely needed (e.g. password check on login)
    scopes: { withSecret: { attributes: { include: ['password', 'otpCode', 'otpExpiresAt'] } } },
    hooks: {
      // beforeSave runs on create AND update; hash the password ONLY when it actually changed
      // so repeated updates don't re-hash an already-hashed value. Centralising it here means
      // controllers can pass plaintext and trust it's stored securely.
      beforeSave: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10); // 10 salt rounds
        }
      },
    },
  }
);

// Instance helper to compare a plaintext attempt against the stored hash (used by the auth flow)
User.prototype.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = User;
