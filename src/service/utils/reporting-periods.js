/**
 * Reporting period utilities for the EMS extension.
 *
 * Six fixed two-calendar-month periods per year:
 *   Period 1 → January–February
 *   Period 2 → March–April
 *   Period 3 → May–June
 *   Period 4 → July–August
 *   Period 5 → September–October
 *   Period 6 → November–December
 */

const PERIOD_NAMES = [
  'January–February',
  'March–April',
  'May–June',
  'July–August',
  'September–October',
  'November–December',
];

/**
 * Returns reporting period 1–6 for a 0-indexed JS month (0 = January).
 * @param {number} month
 * @returns {number} 1–6
 */
export function getPeriodForMonth(month) {
  return Math.floor(month / 2) + 1;
}

/**
 * Returns { period, year } for a given Date (UTC).
 * @param {Date} date
 * @returns {{ period: number, year: number }}
 */
export function getPeriodForDate(date) {
  const year = date.getUTCFullYear();
  const period = getPeriodForMonth(date.getUTCMonth());
  return { period, year };
}

/**
 * Returns the UTC start and end Date boundaries for a reporting period.
 * Period ends at 23:59:59.999 UTC on the last day of the second month.
 * @param {number} year
 * @param {number} period 1–6
 * @returns {{ start: Date, end: Date }}
 */
export function getPeriodBounds(year, period) {
  const startMonth = (period - 1) * 2; // 0-indexed
  const endMonth = startMonth + 1;

  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));

  // Last day of endMonth: month+1 day 0 = last day of month
  const end = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59, 999));

  return { start, end };
}

/**
 * Returns the human-readable display name for a period.
 * @param {number} period 1–6
 * @returns {string}
 */
export function getPeriodName(period) {
  return PERIOD_NAMES[period - 1] ?? `Period ${period}`;
}

export function getReminderDate(year, period) {
  const { end } = getPeriodBounds(year, period);
  return new Date(Date.UTC(year, end.getUTCMonth(), end.getUTCDate() - 7));
}

export function getCompletedPeriods(since, now = new Date()) {
  const periods = [];
  for (let year = since.getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    for (let period = 1; period <= 6; period++) {
      const { end } = getPeriodBounds(year, period);
      if (end >= since && end < now) periods.push({ year, period });
    }
  }
  return periods;
}
