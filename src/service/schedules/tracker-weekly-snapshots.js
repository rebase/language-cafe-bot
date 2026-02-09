import Tracker from '../../models/tracker.js';
import TrackerCheckin from '../../models/tracker-checkin.js';
import TrackerParticipant from '../../models/tracker-participant.js';
import client from '../../client/index.js';
import { generateLiveTrackerEmbed } from '../utils/tracker-renderer.js';
import channelLog from '../utils/channel-log.js';

/**
 * Weekly snapshots for daily trackers:
 * - Post immutable weekly snapshot messages
 * - Only for daily trackers
 * - Snapshots are never edited
 * - Captures the last 14 completed days (ending yesterday)
 */
export default async function trackerWeeklySnapshots() {
  try {
    // Only process daily trackers
    const dailyTrackers = await Tracker.find({
      isActive: true,
      frequency: 'daily',
    });

    for (const tracker of dailyTrackers) {
      await createWeeklySnapshot(tracker);
    }

    channelLog(`Tracker weekly snapshots created for ${dailyTrackers.length} daily trackers`);
  } catch (error) {
    console.error('Error in tracker weekly snapshots:', error);
  }
}

async function createWeeklySnapshot(tracker) {
  try {
    const channel = await client.channels.fetch(tracker.threadId);
    if (!channel) {
      return;
    }

    // Generate snapshot embed for the last 14 completed days (ending yesterday)
    const embed = await generateSnapshotEmbed(tracker.threadId);
    if (!embed) {
      return;
    }

    // Calculate yesterday's date for the snapshot label
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const weekEnding = yesterday.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    embed.title = `📸 ${tracker.displayName} - Weekly Snapshot`;
    embed.footer = {
      text: `Week ending ${weekEnding} • 📸 Snapshot (immutable)`,
    };

    // Post snapshot message
    await channel.send({ embeds: [embed] });

    channelLog(`Weekly snapshot created for tracker: ${tracker.threadId} | ${tracker.displayName}`);
  } catch (error) {
    console.error(`Error creating weekly snapshot for tracker ${tracker.threadId}:`, error);
  }
}

/**
 * Generate snapshot embed showing the last 14 completed days
 */
async function generateSnapshotEmbed(trackerId) {
  try {
    const tracker = await Tracker.findOne({ threadId: trackerId });
    if (!tracker || tracker.frequency !== 'daily') {
      return null;
    }

    // Get all participants sorted by join date
    const participants = await TrackerParticipant.find({ trackerId: tracker.threadId }).sort({
      joinedAt: 1,
    });

    if (participants.length === 0) {
      return null;
    }

    // Calculate 14-day window ending yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const windowEnd = yesterday;
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 13);

    // Constrain to tracker period
    const trackerStart = new Date(tracker.startDate);
    trackerStart.setHours(0, 0, 0, 0);
    const trackerEnd = new Date(tracker.endDate);
    trackerEnd.setHours(0, 0, 0, 0);

    const effectiveWindowStart = windowStart < trackerStart ? trackerStart : windowStart;
    const effectiveWindowEnd = windowEnd < trackerEnd ? windowEnd : trackerEnd;

    // Generate dates within the window
    const dates = [];
    const currentDate = new Date(effectiveWindowStart);
    while (currentDate <= effectiveWindowEnd) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all check-ins for this period
    const checkins = await TrackerCheckin.find({
      trackerId: tracker.threadId,
      date: { $gte: effectiveWindowStart, $lte: effectiveWindowEnd },
    });

    // Create lookup map
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

    // Date rows
    for (const date of dates) {
      const dateKey = date.toISOString().split('T')[0];

      // Check-in cells for each participant on this date
      for (const participant of participants) {
        const userKey = `${participant.userId}-${dateKey}`;
        const checkin = checkinMap.get(userKey);

        let cellEmoji = '⬜'; // Default to missing

        if (checkin) {
          cellEmoji = checkin.type === 'done' ? '✅' : '🟨';
        } else {
          const joinDate = new Date(participant.joinedAt);
          joinDate.setHours(0, 0, 0, 0);

          if (date < joinDate) {
            cellEmoji = '🔘'; // Before join
          } else {
            // Check if grace period has expired
            const daysSinceDate = Math.floor(
              (yesterday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysSinceDate > tracker.gracePeriodDays) {
              cellEmoji = '❌'; // Final miss
            } else {
              cellEmoji = '⬜'; // Still missing
            }
          }
        }

        trackerText += `${cellEmoji} `;
      }

      // Date label
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      trackerText += `${month} ${day}\n`;
    }

    return {
      color: 0x5865f2,
      title: `📸 ${tracker.displayName} - Weekly Snapshot`,
      description: `Please keep in mind that this bot is set to GMT/UTC so each day starts at <t:946684800:t> your time\n\n\`\`\`\n${trackerText}\`\`\``,
      footer: {
        text: '✅ Done • 🟨 Break • ⬜ Missing • ❌ Final Miss • 🔘 Before Join',
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating snapshot embed:', error);
    return null;
  }
}
