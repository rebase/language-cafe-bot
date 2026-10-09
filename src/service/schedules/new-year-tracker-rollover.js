import TrackerMessage from '../../models/tracker-message.js';
import channelLog, { generateSystemLogContent } from '../utils/channel-log.js';
import { refreshEventTracker } from '../utils/event-tracker.js';

/**
 * Finalise any unarchived past years, including after downtime across January 1.
 * Only successfully updated trackers are archived. Recover the current year too.
 */
export default async function newYearTrackerRollover() {
  try {
    const now = new Date();

    // Finalise and archive the previous year
    const previousRecords = await TrackerMessage.find({
      year: { $lt: now.getUTCFullYear() }, isArchived: false,
    });
    for (const prevRecord of previousRecords) {
      // Render the final state of the previous year's tracker before archiving
      const refreshed = await refreshEventTracker(prevRecord.year);
      if (!refreshed) continue;

      prevRecord.isArchived = true;
      await prevRecord.save();

      channelLog(
        generateSystemLogContent('Annual Tracker Archived', { year: `\`${prevRecord.year}\`` }),
      );
    }

    // Recover or refresh the current year's tracker.
    await refreshEventTracker();
  } catch (err) {
    console.error('newYearTrackerRollover error:', err);
    channelLog(generateSystemLogContent('New Year Tracker Rollover Error', { error: err.message }));
  }
}
