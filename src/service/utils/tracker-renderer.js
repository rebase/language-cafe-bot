import Tracker from '../../models/tracker.js';
import TrackerParticipant from '../../models/tracker-participant.js';
import TrackerCheckin from '../../models/tracker-checkin.js';
import { getStartOfDay, getTrackerWeek, CELL_EMOJIS } from './tracker-utils.js';

/**
 * Generate the live tracker embed for a given tracker
 * Shows rolling 14-day window with participant check-ins
 */
export async function generateLiveTrackerEmbed(trackerId) {
  try {
    const tracker = await Tracker.findOne({ threadId: trackerId });
    if (!tracker) {
      return null;
    }

    // Get all participants sorted by join date
    const participants = await TrackerParticipant.find({ trackerId }).sort({ joinedAt: 1 });

    if (participants.length === 0) {
      return {
        color: 0x5865f2,
        title: `📊 ${tracker.displayName} - Live Tracker`,
        description: 'No participants yet. Use `/tracker-join` to participate!',
      };
    }

    // Calculate 14-day rolling window, but constrain to tracker period
    const today = getStartOfDay(new Date());
    const trackerStart = getStartOfDay(tracker.startDate);
    const trackerEnd = getStartOfDay(tracker.endDate);

    // Window ends at the earliest of: today or tracker end date
    const windowEnd = today < trackerEnd ? today : trackerEnd;

    // Window starts 13 days before windowEnd, but not before tracker start
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 13);

    // Constrain window start to tracker start date
    const effectiveWindowStart = windowStart < trackerStart ? trackerStart : windowStart;

    // Generate dates within the constrained window
    const dates = [];
    const currentDate = new Date(effectiveWindowStart);
    while (currentDate <= windowEnd) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all check-ins for this period
    const checkins = await TrackerCheckin.find({
      trackerId,
      date: { $gte: windowStart, $lte: today },
    });

    // Create lookup map for quick access
    const checkinMap = new Map();
    checkins.forEach((checkin) => {
      const dateKey = checkin.date.toISOString().split('T')[0];
      const userKey = `${checkin.userId}-${dateKey}`;
      checkinMap.set(userKey, checkin);
    });

    // Build the tracker grid
    let trackerText = '';

    // Header row with participant emojis
    participants.forEach((participant) => {
      trackerText += `${participant.emoji} `;
    });
    trackerText += '\n';

    // Date rows - each row is a date with check-ins for all participants
    for (const date of dates) {
      const dateKey = date.toISOString().split('T')[0];

      // Check-in cells for each participant on this date
      for (const participant of participants) {
        const userKey = `${participant.userId}-${dateKey}`;
        const checkin = checkinMap.get(userKey);

        let cellEmoji = CELL_EMOJIS.MISSING; // Default to missing

        if (checkin) {
          // User has a check-in for this date
          cellEmoji = checkin.type === 'done' ? CELL_EMOJIS.DONE : CELL_EMOJIS.BREAK;
        } else {
          // No check-in - determine if it should be ❌ or ⬜
          const joinDate = getStartOfDay(participant.joinedAt);

          // Only show cells for dates within tracker period and after user joined
          if (date >= Math.max(joinDate, trackerStart) && date <= trackerEnd && date <= today) {
            // Check if grace period has expired
            const daysSinceDate = Math.floor(
              (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysSinceDate > tracker.gracePeriodDays) {
              cellEmoji = CELL_EMOJIS.FINAL_MISS; // Grace period expired
            } else {
              cellEmoji = CELL_EMOJIS.MISSING; // Still within grace period
            }
          } else {
            // Date is before join, before tracker start, after tracker end, or in future
            cellEmoji = CELL_EMOJIS.MISSING;
          }
        }

        trackerText += `${cellEmoji} `;
      }

      // Date label at the end of the row
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      trackerText += `${month} ${day}\n`;
    }

    // Check if content exceeds Discord limits
    if (trackerText.length > 4000) {
      // Fallback to simpler format if too long
      trackerText = `Tracker too large to display (${participants.length} participants)\n`;
      trackerText += `Use individual commands to check progress.`;
    }

    return {
      color: 0x5865f2,
      title: `📊 ${tracker.displayName} - Live Tracker`,
      description: `\`\`\`\n${trackerText}\`\`\``,
      footer: {
        text: `${CELL_EMOJIS.DONE} Done • ${CELL_EMOJIS.BREAK} Break • ${CELL_EMOJIS.MISSING} Missing • ${CELL_EMOJIS.FINAL_MISS} Final Miss`,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating live tracker embed:', error);
    return {
      color: 0xff0000,
      title: 'Error',
      description: 'Failed to generate live tracker display.',
    };
  }
}

/**
 * Update or create the live tracker message in a thread
 */
export async function updateLiveTracker(trackerId, channel) {
  try {
    const tracker = await Tracker.findOne({ threadId: trackerId });
    if (!tracker || !tracker.isActive) {
      return;
    }

    const embed = await generateLiveTrackerEmbed(trackerId);
    if (!embed) {
      return;
    }

    if (tracker.liveTrackerMessageId) {
      // Try to edit existing message
      try {
        const existingMessage = await channel.messages.fetch(tracker.liveTrackerMessageId);
        await existingMessage.edit({ embeds: [embed] });
        return;
      } catch (error) {
        // Message not found, create new one
      }
    }

    // Create new live tracker message
    const message = await channel.send({ embeds: [embed] });
    await message.pin();

    // Update tracker with new message ID
    tracker.liveTrackerMessageId = message.id;
    await tracker.save();
  } catch (error) {
    console.error('Error updating live tracker:', error);
  }
}
