import Tracker from '../../models/tracker.js';
import client from '../../client/index.js';
import channelLog from '../utils/channel-log.js';

/**
 * Daily reminders for trackers:
 * - Daily trackers: Post reminder every day
 * - Weekly trackers: Post reminder at the start of each week (every 7 days)
 */
export default async function trackerDailyReminders() {
  try {
    const activeTrackers = await Tracker.find({ isActive: true });

    for (const tracker of activeTrackers) {
      await sendTrackerReminder(tracker);
    }

    channelLog(`Tracker daily reminders processed for ${activeTrackers.length} trackers`);
  } catch (error) {
    console.error('Error in tracker daily reminders:', error);
  }
}

async function sendTrackerReminder(tracker) {
  try {
    const channel = await client.channels.fetch(tracker.threadId);
    if (!channel) {
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const startDate = new Date(tracker.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(tracker.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Check if we're within the tracker period
    if (now < startDate || now > endDate) {
      return; // Outside tracker period, don't send reminder
    }

    // Calculate day number from tracker start
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dayNumber = daysSinceStart + 1; // Day 1, Day 2, etc.

    if (tracker.frequency === 'daily') {
      // Daily tracker: Send reminder every day
      await channel.send(
        `📅 Day ${dayNumber} - Don't forget to check in today! Use \`!checkin done <activity>\``,
      );
      channelLog(`Daily reminder sent for tracker: ${tracker.threadId} | Day ${dayNumber}`);
    } else if (tracker.frequency === 'weekly') {
      // Weekly tracker: Send reminder at the start of each week (every 7 days)
      // Week starts on day 1, 8, 15, 22, etc.
      if (dayNumber === 1 || (dayNumber - 1) % 7 === 0) {
        const weekNumber = Math.floor((dayNumber - 1) / 7) + 1;
        await channel.send(
          `📅 Week ${weekNumber} - Don't forget to check in this week! Use \`!checkin done <activity>\``,
        );
        channelLog(`Weekly reminder sent for tracker: ${tracker.threadId} | Week ${weekNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error sending reminder for tracker ${tracker.threadId}:`, error);
  }
}
