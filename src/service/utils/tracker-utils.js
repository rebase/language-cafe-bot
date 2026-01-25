import emojis from '../../data/emojis.js';

// Available emojis for tracker participants - imported from existing emoji data
// Users can select any emoji from this list when joining a tracker
export const TRACKER_EMOJIS = emojis;

// Cell state emojis
export const CELL_EMOJIS = {
  MISSING: '⬜',
  FINAL_MISS: '❌',
  DONE: '✅',
  BREAK: '🟨',
  BEFORE_JOIN: '🔘',
};

/**
 * Get the start of day for a given date
 */
export function getStartOfDay(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

/**
 * Calculate which tracker week a date falls into
 * @param {Date} date - The date to check
 * @param {Date} trackerStartDate - When the tracker started
 * @returns {number} - Week number (0-based)
 */
export function getTrackerWeek(date, trackerStartDate) {
  const startOfDay = getStartOfDay(date);
  const startOfTracker = getStartOfDay(trackerStartDate);
  const diffTime = startOfDay.getTime() - startOfTracker.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/**
 * Get the start date of a specific tracker week
 * @param {number} weekNumber - Week number (0-based)
 * @param {Date} trackerStartDate - When the tracker started
 * @returns {Date} - Start date of that week
 */
export function getTrackerWeekStart(weekNumber, trackerStartDate) {
  const startOfTracker = getStartOfDay(trackerStartDate);
  const weekStart = new Date(startOfTracker);
  weekStart.setDate(weekStart.getDate() + weekNumber * 7);
  return weekStart;
}

/**
 * Check if a date is within the tracker period
 * @param {Date} date - Date to check
 * @param {Date} startDate - Tracker start date
 * @param {Date} endDate - Tracker end date
 * @returns {boolean}
 */
export function isDateInTrackerPeriod(date, startDate, endDate) {
  const checkDate = getStartOfDay(date);
  const start = getStartOfDay(startDate);
  const end = getStartOfDay(endDate);
  return checkDate >= start && checkDate <= end;
}

/**
 * Validate channel is a thread (any type)
 * @param {Object} channel - Discord channel object
 * @returns {boolean}
 */
export function isForumThread(channel) {
  // Accept any thread type: PublicThread (11), PrivateThread (12), or forum threads
  // Thread types: 10 (AnnouncementThread), 11 (PublicThread), 12 (PrivateThread)
  return channel && channel.isThread();
}
