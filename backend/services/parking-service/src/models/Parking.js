// ---------------------------------------------------------------------------
// models/Parking.js — Sequelize model = the "parkings" table definition.
// WHAT: describes each column, its type, and database-level validation rules.
// WHY:  the single source of truth for a parking lot's shape; sequelize.sync()
//       creates/aligns the table from this definition.
// ---------------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Parking = sequelize.define(
  'Parking',
  {
    // UUID primary key auto-generated on insert (safer/less guessable than auto-increment ints)
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,                      // each lot has a distinct business code (e.g. PK001)
      validate: { notEmpty: true },
      // Setter normalises the code to UPPERCASE+trimmed on the way in, so lookups stay consistent
      set(value) {
        this.setDataValue('code', String(value).toUpperCase().trim());
      },
    },
    parkingName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    totalSpaces: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },              // a lot must have at least one space
    },
    availableSpaces: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },              // can drop to 0 (full) but never negative
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    chargingFeePerHour: {
      type: DataTypes.DECIMAL(10, 2),    // money: fixed 2-decimal precision avoids float rounding issues
      allowNull: false,
      validate: { min: 0 },              // fee can't be negative
    },
  },
  {
    tableName: 'parkings',               // explicit table name
    timestamps: true,                    // auto-manage createdAt / updatedAt columns
    hooks: {
      // Runs just before a row is inserted
      beforeCreate: (parking) => {
        // Default availableSpaces to totalSpaces if not explicitly provided (a brand-new lot is empty)
        if (parking.availableSpaces === undefined || parking.availableSpaces === null) {
          parking.availableSpaces = parking.totalSpaces;
        }
      },
    },
  }
);

module.exports = Parking;
