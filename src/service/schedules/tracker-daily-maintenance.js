import Tracker from '../../models/tracker.js';
import TrackerParticipant from '../../models/tracker-participant.js';
import TrackerCheckin from '../../models/tracker-checkin.js';
import TrackerBan from '../../models/tracker-ban.js';
import client from '../../client/index.js';
import { getStartOfDay } from '../utils/tracker-utils.js';
import { updateLiveTracker } from '../utils/tracker-renderer.js';
import channelLog from '../utils/channel-log.js';

/**
 * Daily maintenance for trackers:
 * - Finalize misses after grace period
 * - Enforce max_misses and ban users if needed
 * - Update live trackers
 */
export default async function trackerDailyMaintenance() {
  try {
    const activeTrackers = await Tracker.find({ isActive: true });

    for (const tracker of activeTrackers) {
      await processTrackerMaintenance(tracker);
    }

    channelLog(`Tracker daily maintenance completed for ${activeTrackers.length} trackers`);
  } catch (error) {
    console.error('Error in tracker daily maintenance:', error);
  }
}

async function processTrackerMaintenance(tracker) {
  try {
    const today = getStartOfDay(new Date());
    const graceCutoff = new Date(today);
    graceCutoff.setDate(graceCutoff.getDate() - tracker.gracePeriodDays);

    // Only do ban enforcement if maxMisses is set
    if (tracker.maxMisses) {
      // Get all participants
      const participants = await TrackerParticipant.find({ trackerId: tracker.threadId });

      for (const participant of participants) {
        await checkParticipantForBan(tracker, participant, graceCutoff, today);
      }
    }

    // Always update live tracker daily (regardless of enforcement settings)
    try {
      const channel = await client.channels.fetch(tracker.threadId);
      if (channel) {
        await updateLiveTracker(tracker.threadId, channel);
      }
    } catch (error) {
      console.error(`Error updating live tracker for ${tracker.threadId}:`, error);
    }
  } catch (error) {
    console.error(`Error processing maintenance for tracker ${tracker.threadId}:`, error);
  }
}

async function checkParticipantForBan(tracker, participant, graceCutoff, today) {
  try {
    const joinDate = getStartOfDay(participant.joinedAt);
    const trackerStart = getStartOfDay(tracker.startDate);
    const trackerEnd = getStartOfDay(tracker.endDate);

    // Calculate the date range this participant is responsible for
    const startDate = joinDate > trackerStart ? joinDate : trackerStart;
    const endDate = today < trackerEnd ? today : trackerEnd;

    if (startDate > endDate) {
      return; // No days to check
    }

    // Get all check-ins for this participant
    const checkins = await TrackerCheckin.find({
      trackerId: tracker.threadId,
      userId: participant.userId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Create a map of check-in dates
    const checkinDates = new Set();
    checkins.forEach((checkin) => {
      checkinDates.add(checkin.date.toISOString().split('T')[0]);
    });

    // Count final misses (days past grace period with no check-in)
    let finalMisses = 0;

    if (tracker.frequency === 'daily') {
      // Check each day
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateKey = date.toISOString().split('T')[0];

        if (!checkinDates.has(dateKey)) {
          // No check-in for this date
          if (date <= graceCutoff) {
            // Grace period has expired
            finalMisses++;
          }
        }
      }
    } else if (tracker.frequency === 'weekly') {
      // Check each tracker week
      const trackerStartDate = getStartOfDay(tracker.startDate);

      // Calculate which weeks this participant should have checked in
      const startWeek = Math.floor(
        (startDate.getTime() - trackerStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7),
      );
      const endWeek = Math.floor(
        (endDate.getTime() - trackerStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7),
      );

      for (let week = startWeek; week <= endWeek; week++) {
        const weekStart = new Date(trackerStartDate);
        weekStart.setDate(weekStart.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Check if this week is past grace period
        if (weekEnd <= graceCutoff) {
          // Check if user has any check-in in this week
          const weekCheckins = checkins.filter((checkin) => {
            const checkinDate = getStartOfDay(checkin.date);
            return checkinDate >= weekStart && checkinDate <= weekEnd;
          });

          if (weekCheckins.length === 0) {
            finalMisses++;
          }
        }
      }
    }

    // Ban user if they exceed max misses
    if (finalMisses > tracker.maxMisses) {
      await banParticipant(tracker, participant);
    }
  } catch (error) {
    console.error(`Error checking participant ${participant.userId} for ban:`, error);
  }
}

async function banParticipant(tracker, participant) {
  try {
    // Create ban record
    const ban = new TrackerBan({
      trackerId: tracker.threadId,
      userId: participant.userId,
      reason: 'max_misses_exceeded',
    });
    await ban.save();

    // Remove participant and all their check-ins
    await TrackerParticipant.deleteOne({
      trackerId: tracker.threadId,
      userId: participant.userId,
    });
    await TrackerCheckin.deleteMany({
      trackerId: tracker.threadId,
      userId: participant.userId,
    });

    channelLog(
      `User banned from tracker: ${participant.userId} | ${tracker.threadId} | max_misses_exceeded`,
    );

    // Notify in the thread
    try {
      const channel = await client.channels.fetch(tracker.threadId);
      if (channel) {
        await channel.send({
          embeds: [
            {
              color: 0xff0000,
              title: '🚫 Participant Removed',
              description: `<@${participant.userId}> has been removed from the tracker for exceeding the maximum number of misses (${tracker.maxMisses}). Their emoji ${participant.emoji} is now available for others.`,
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error sending ban notification:', error);
    }
  } catch (error) {
    console.error(`Error banning participant ${participant.userId}:`, error);
  }
}
