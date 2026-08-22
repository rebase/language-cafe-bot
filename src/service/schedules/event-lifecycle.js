import Event from '../../models/event.js';
import channelLog, { generateSystemLogContent } from '../utils/channel-log.js';
import { refreshEventCalendar } from '../utils/event-calendar.js';

/**
 * Runs every hour.
 * - Activates pending events whose start time has passed.
 * - Closes active events whose end time has passed.
 *
 * Events are never auto-deleted when they end — they remain available
 * for leaderboard viewing and point export until explicitly removed.
 */
export default async function eventLifecycle() {
  try {
    const now = new Date();

    // ── Activate pending events ──────────────────────────────────────────────
    const toActivate = await Event.find({
      status: 'pending',
      startDate: { $lte: now },
    });

    for (const event of toActivate) {
      event.status = 'active';
      await event.save();

      channelLog(
        generateSystemLogContent('Event Activated', {
          event: `\`${event.name}\``,
          id: `\`${event._id}\``,
          startDate: `\`${event.startDate.toISOString()}\``,
        }),
      );
    }

    // ── Close active events ──────────────────────────────────────────────────
    const toClose = await Event.find({
      status: 'active',
      endDate: { $lte: now },
    });

    for (const event of toClose) {
      event.status = 'ended';
      await event.save();

      channelLog(
        generateSystemLogContent('Event Ended', {
          event: `\`${event.name}\``,
          id: `\`${event._id}\``,
          endDate: `\`${event.endDate.toISOString()}\``,
        }),
      );
    }

    if (toActivate.length > 0 || toClose.length > 0) {
      channelLog(
        generateSystemLogContent('Event Lifecycle Run', {
          activated: `\`${toActivate.length}\``,
          closed: `\`${toClose.length}\``,
        }),
      );
      await refreshEventCalendar();
    }
  } catch (err) {
    console.error('Error in eventLifecycle:', err);
  }
}
