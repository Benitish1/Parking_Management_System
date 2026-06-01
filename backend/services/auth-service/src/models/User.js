/*
 * models/User.js — Sequelize model for the 'users' table.
 * Defines the user schema (identity, credentials, role, verification state +
 * OTP fields), hides sensitive columns by default, hashes passwords before
 * saving, and exposes a helper to compare a plaintext password at login.
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs'); // password hashing + comparison
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    // Primary key is a random UUID (safer to expose than sequential integers)
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } }, // required, non-blank
    lastName: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } }, // required, non-blank
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // no two accounts can share an email
      validate: { isEmail: true }, // must be a valid email format
      set(value) {
        // Normalise on write: store lowercase + trimmed so lookups/uniqueness are consistent
        this.setDataValue('email', String(value).toLowerCase().trim());
      },
    },
    password: { type: DataTypes.STRING, allowNull: false }, // stores the bcrypt HASH, never plaintext
    role: {
      type: DataTypes.ENUM('admin', 'attendant'), // only these two roles are allowed
      allowNull: false,
      defaultValue: 'attendant',
    },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false }, // false until OTP verified; blocks login
    otpCode: { type: DataTypes.STRING, allowNull: true }, // current verification code (null once used)
    otpExpiresAt: { type: DataTypes.DATE, allowNull: true }, // when the current OTP stops being valid
  },
  {
    tableName: 'users',
    timestamps: true, // auto-managed createdAt / updatedAt columns
    // Default queries hide secrets so they never accidentally reach API responses
    defaultScope: { attributes: { exclude: ['password', 'otpCode', 'otpExpiresAt'] } },
    // Opt-in scope: User.scope('withSecret') re-includes those fields when login/OTP logic needs them
    scopes: { withSecret: { attributes: { include: ['password', 'otpCode', 'otpExpiresAt'] } } },
    hooks: {
      // Runs automatically before every save/update
      beforeSave: async (user) => {
        // Only re-hash when the password actually changed (avoids double-hashing on unrelated updates)
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10); // 10 salt rounds
        }
      },
    },
  }
);

// Instance method used at login: compares a plaintext attempt against the stored hash
User.prototype.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password); // returns a Promise<boolean>
};

module.exports = User;
