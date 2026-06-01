/**
 * models/CarEntry.js — Sequelize model for one car's parking session.
 *
 * WHAT: Maps the `car_entries` table; one row = a car entering (and later exiting)
 *       a parking lot, plus the computed duration and bill.
 * WHY:  Defining types/constraints here keeps the table schema and validation in
 *       one place; sequelize.sync() in server.js creates/updates the table from it.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CarEntry = sequelize.define(
  'CarEntry',
  {
    // UUID primary key, auto-generated — safer to expose than sequential integer IDs.
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
      set(value) {
        // Always store plate numbers in uppercase
        // Normalising here (uppercase + trim) means searches/comparisons are consistent.
        this.setDataValue('plateNumber', String(value).toUpperCase().trim());
      },
    },
    // Code identifying which parking lot (lives in the parking-service) this entry belongs to.
    parkingCode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    // When the car entered; defaults to now if not supplied.
    entryDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // When the car left; null while still parked.
    exitDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    // Final bill; DECIMAL(10,2) keeps exact money values (10 digits, 2 after the point).
    chargedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    // Total minutes parked; null until exit is computed.
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    // Lifecycle state: starts 'parked', becomes 'exited' once the car leaves.
    status: {
      type: DataTypes.ENUM('parked', 'exited'),
      allowNull: false,
      defaultValue: 'parked',
    },
  },
  {
    tableName: 'car_entries', // explicit table name (shared DB convention)
    timestamps: true, // adds createdAt / updatedAt columns automatically
  }
);

module.exports = CarEntry;
