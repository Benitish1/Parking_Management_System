/**
 * utils/duration.js — turns a parked time (in minutes) into a display string.
 *
 * WHY: The controller stores duration as raw minutes (good for math/billing) but
 *      tickets/bills need a friendly "Xh Ym" label for the customer to read.
 */

/**
 * Format a duration in minutes into a human-readable label.
 * Examples: 75 -> "1h 15m", 60 -> "1h 0m", 30 -> "0h 30m"
 */
const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60); // whole hours (integer division)
  const m = minutes % 60; // leftover minutes after removing full hours
  return `${h}h ${m}m`;
};

module.exports = { formatDuration };
