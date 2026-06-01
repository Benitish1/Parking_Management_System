/**
 * Parking.js — Read-only model for the report-service.
 * WHY DUPLICATED HERE: Same pattern as CarEntry — the parking-service owns and
 *   writes the 'parkings' table; this service keeps a matching read-copy model
 *   only so the occupancy/summary reports can query capacity numbers. It never
 *   creates or edits lots here.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Read-model for the shared 'parkings' table.
 * Table is owned/created by the parking-service; we only read it here.
 */
const Parking = sequelize.define(
  'Parking',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING, // short lot code (e.g. "PKA"); shown in occupancy report
      allowNull: false,
    },
    parkingName: {
      type: DataTypes.STRING, // human-friendly lot name
      allowNull: false,
    },
    totalSpaces: {
      type: DataTypes.INTEGER, // capacity — denominator in occupancy %
      allowNull: false,
    },
    availableSpaces: {
      type: DataTypes.INTEGER, // free spaces now; occupied = total - available
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING, // optional physical location
      allowNull: true,
    },
    chargingFeePerHour: {
      type: DataTypes.DECIMAL(10, 2), // hourly rate (used by other services to bill)
      allowNull: false,
    },
  },
  {
    tableName: 'parkings', // bind to the existing shared table
    timestamps: true,
  }
);

module.exports = Parking;
