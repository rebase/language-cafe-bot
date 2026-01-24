import TrackerCheckin from '../../models/tracker-checkin.js';
import TrackerParticipant from '../../models/tracker-participant.js';
import Tracker from '../../models/tracker.js';
import channelLog from '../utils/channel-log.js';
import { updateLiveTracker } from '../utils/tracker-renderer.js';
import {
  getStartOfDay,
  getTrackerWeek,
  isDateInTrackerPeriod,
  isForumThread,
} from '../utils/tracker-utils.js';

export default async function trackerCheckin(message) {
  try {
    // Only process in forum threads
    if (!isForumThread(message.channel)) {
      return;
    }

    const threadId = message.channel.id;
    const userId = message.author.id;

    // Find active tracker
    const tracker = await Tracker.findOne({ threadId, isActive: true });
    if (!tracker) {
      return; // No tracker, ignore silently
    }

    // Check if user is a participant
    const participant = await TrackerParticipant.findOne({ trackerId: threadId, userId });
    if (!participant) {
      await message.reply(
        '❌ You are not participating in this tracker. Use `/tracker-join` to join.',
      );
      return;
    }

    // Parse command: !checkin done|break [YYYY-MM-DD]
    const content = message.content.trim();
    const args = content.split(/\s+/);

    if (args.length < 2) {
      await message.reply('❌ Usage: `!checkin done|break [YYYY-MM-DD]`');
      return;
    }

    const type = args[1].toLowerCase();
    if (!['done', 'break'].includes(type)) {
      await message.reply('❌ Check-in type must be `done` or `break`');
      return;
    }

    // Parse optional date
    let targetDate = new Date();

    if (args.length === 3) {
      // Third argument should be a date in YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (!dateRegex.test(args[2])) {
        await message.reply('❌ Invalid date format. Use YYYY-MM-DD');
        return;
      }

      try {
        targetDate = new Date(args[2] + 'T00:00:00.000Z');
        if (Number.isNaN(targetDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        await message.reply('❌ Invalid date format. Use YYYY-MM-DD');
        return;
      }
    } else if (args.length > 3) {
      // Too many arguments
      await message.reply('❌ Usage: `!checkin done|break [YYYY-MM-DD]`');
      return;
    }

    // Validate date constraints
    const now = new Date();
    const today = getStartOfDay(now);
    const checkDate = getStartOfDay(targetDate);

    // No future dates
    if (checkDate > today) {
      await message.reply('❌ Cannot check in for future dates');
      return;
    }

    // Must be within tracker period
    if (!isDateInTrackerPeriod(checkDate, tracker.startDate, tracker.endDate)) {
      await message.reply('❌ Date is outside the tracker period');
      return;
    }

    // Must be after user joined
    const joinDate = getStartOfDay(participant.joinedAt);
    if (checkDate < joinDate) {
      await message.reply('❌ Cannot check in for dates before you joined the tracker');
      return;
    }

    // Grace period check for backfill
    const daysSinceDate = Math.floor(
      (today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceDate > tracker.gracePeriodDays) {
      await message.reply(
        `❌ Cannot backfill check-ins older than ${tracker.gracePeriodDays} days (grace period)`,
      );
      return;
    }

    // Weekly tracker specific validation
    if (tracker.frequency === 'weekly') {
      if (type === 'break') {
        await message.reply('❌ Break check-ins are not supported for weekly trackers');
        return;
      }
    }

    // Daily tracker break limit validation
    if (tracker.frequency === 'daily' && type === 'break' && tracker.maxBreaksPerWeek !== null) {
      // Calculate tracker week for the check-in date
      const trackerWeek = getTrackerWeek(checkDate, tracker.startDate);

      // Count existing breaks in this tracker week
      const weekStart = new Date(tracker.startDate);
      weekStart.setDate(weekStart.getDate() + trackerWeek * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const existingBreaks = await TrackerCheckin.countDocuments({
        trackerId: threadId,
        userId,
        type: 'break',
        date: { $gte: weekStart, $lte: weekEnd },
      });

      if (existingBreaks >= tracker.maxBreaksPerWeek) {
        await message.reply(
          `❌ Break limit reached for this week (${tracker.maxBreaksPerWeek} max). Use \`!checkin done\` if you completed the task. If you do nothing, this day will remain ⬜ and will become ❌ after the grace period expires.`,
        );
        return;
      }
    }

    // Calculate tracker week for weekly trackers
    let trackerWeekNum = null;
    if (tracker.frequency === 'weekly') {
      trackerWeekNum = getTrackerWeek(checkDate, tracker.startDate);
    }

    // Check for existing check-in
    const existingCheckin = await TrackerCheckin.findOne({
      trackerId: threadId,
      userId,
      date: checkDate,
    });

    if (existingCheckin) {
      // Update existing check-in
      existingCheckin.type = type;
      if (trackerWeekNum !== null) {
        existingCheckin.trackerWeek = trackerWeekNum;
      }
      await existingCheckin.save();

      await message.react('✅');
      channelLog(
        `Tracker check-in updated: ${userId} | ${threadId} | ${
          checkDate.toISOString().split('T')[0]
        } | ${type}`,
      );
    } else {
      // Create new check-in
      const checkin = new TrackerCheckin({
        trackerId: threadId,
        userId,
        date: checkDate,
        type,
        trackerWeek: trackerWeekNum,
      });

      await checkin.save();

      await message.react('✅');
      channelLog(
        `Tracker check-in created: ${userId} | ${threadId} | ${
          checkDate.toISOString().split('T')[0]
        } | ${type}`,
      );
    }

    // Update live tracker
    await updateLiveTracker(threadId, message.channel);
  } catch (error) {
    console.error('Error processing tracker check-in:', error);
    await message.reply('❌ An error occurred while processing your check-in. Please try again.');
  }
}
