import Tracker from '../../models/tracker.js';
import channelLog, { generateSystemLogContent } from '../utils/channel-log.js';
import { fetchTrackerChannel } from '../utils/tracker-utils.js';

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
    const channel = await fetchTrackerChannel(tracker);
    if (!channel) {
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const startDate = new Date(tracker.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(tracker.endDate);
    endDate.setHours(23, 59, 59, 999);

    const endDateAtMidnight = new Date(tracker.endDate);
    endDateAtMidnight.setHours(0, 0, 0, 0);

    // Check if we're within the tracker period
    if (now < startDate || now > endDate) {
      return; // Outside tracker period, don't send reminder
    }

    // Calculate day number from tracker start
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const dayNumber = daysSinceStart + 1; // Day 1, Day 2, etc.
    const totalDays = ((endDateAtMidnight.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);

    if (tracker.frequency === 'daily') {
      // Daily tracker: Send reminder every day
      await channel.send(
        `📅 Day ${dayNumber}/${totalDays} - Don't forget to check in today! Use \`!checkin done <activity>\``,
      );
      channelLog(
        generateSystemLogContent('Tracker Daily Reminder Sent', {
          tracker: `<#${tracker.threadId}>`,
          name: tracker.displayName,
          day: `\`${dayNumber}\``,
        }),
      );
    } else if (tracker.frequency === 'weekly') {
      // Weekly tracker: Send reminder at the start of each week (every 7 days)
      // Week starts on day 1, 8, 15, 22, etc.
      if (dayNumber === 1 || (dayNumber - 1) % 7 === 0) {
        const weekNumber = Math.floor((dayNumber - 1) / 7) + 1;
        await channel.send(
          `📅 Week ${weekNumber}/${totalWeeks} - Don't forget to check in this week! Use \`!checkin done <activity>\``,
        );
        channelLog(
          generateSystemLogContent('Tracker Weekly Reminder Sent', {
            tracker: `<#${tracker.threadId}>`,
            name: tracker.displayName,
            week: `\`${weekNumber}\``,
          }),
        );
      }
    }
  } catch (error) {
    console.error(`Error sending reminder for tracker ${tracker.threadId}:`, error);
  }
}