import Tracker from '../../models/tracker.js';
import client from '../../client/index.js';
import { generateLiveTrackerEmbed } from '../utils/tracker-renderer.js';
import channelLog from '../utils/channel-log.js';

/**
 * Weekly snapshots for daily trackers:
 * - Post immutable weekly snapshot messages
 * - Only for daily trackers
 * - Snapshots are never edited
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

    // Generate snapshot embed (same as live tracker but immutable)
    const embed = await generateLiveTrackerEmbed(tracker.threadId);
    if (!embed) {
      return;
    }

    // Modify embed for snapshot
    const now = new Date();
    const weekEnding = now.toLocaleDateString('en-US', {
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
