import Event from '../../models/event.js';
import EventParticipant from '../../models/event-participant.js';
import EventSubmission from '../../models/event-submission.js';
import EventBan from '../../models/event-ban.js';
import channelLog, { generateSystemLogContent } from '../utils/channel-log.js';
import {
  findActiveEventForChannel,
  messageContainsHashtag,
  updateLiveLeaderboard,
} from '../utils/event-utils.js';

/**
 * Called for every non-bot message.
 * Checks whether the message is a valid event submission and records it.
 */
export default async function eventSubmission(message) {
  try {
    const channelId = message.channelId ?? message.channel?.id;
    if (!channelId) return;

    // Find an active event that tracks this channel
    const event = await findActiveEventForChannel(channelId);
    if (!event) return;

    const userId = message.author.id;
    const messageId = message.id;
    const eventId = event._id.toString();

    // Check the message contains the event's hashtag
    if (!messageContainsHashtag(message.content, event.hashtag)) return;

    // Check if the user is banned from this event
    const ban = await EventBan.findOne({ eventId, userId });
    if (ban) {
      await message.react('❌').catch(() => {});
      await message
        .reply({
          content: `You are banned from participating in **${event.name}**. Please contact a moderator for further information.`,
        })
        .catch(() => {});
      return;
    }

    // Deduplicate: has this exact message already been counted?
    const existingSubmission = await EventSubmission.findOne({ eventId, messageId });
    if (existingSubmission) return;

    // Fetch or create the participant record
    let participant = await EventParticipant.findOne({ eventId, userId });
    if (!participant) {
      participant = new EventParticipant({ eventId, userId, points: 0, submissionCount: 0 });
    }

    // If no points configured, just count the submission with no points awarded
    if (!event.pointsPerSubmission) {
      const submission = new EventSubmission({
        eventId,
        userId,
        messageId,
        channelId,
        pointsAwarded: 0,
      });
      await submission.save();
      participant.submissionCount += 1;
      await participant.save();
      await message.react('✅').catch(() => {});
      return;
    }

    // Check if the participant has already hit the max points cap
    if (participant.points >= event.maxPoints) {
      await message.react('🔒').catch(() => {});
      return;
    }

    // Calculate how many points to award (may be less than pointsPerSubmission at cap)
    const remaining = event.maxPoints - participant.points;
    const pointsAwarded = Math.min(event.pointsPerSubmission, remaining);

    // Save the submission record
    const submission = new EventSubmission({
      eventId,
      userId,
      messageId,
      channelId,
      pointsAwarded,
    });
    await submission.save();

    // Update participant totals
    participant.points += pointsAwarded;
    participant.submissionCount += 1;
    await participant.save();

    // React to the message so the participant knows their submission was counted
    await message.react('✅').catch(() => {});

    channelLog(
      generateSystemLogContent('Event Submission Counted', {
        event: `\`${event.name}\``,
        user: `<@${userId}>`,
        points: `\`+${pointsAwarded}\` (total: \`${participant.points}/${event.maxPoints}\`)`,
        channel: `<#${channelId}>`,
      }),
    );

    // Update the pinned leaderboard message (no-op if not posted or already locked)
    await updateLiveLeaderboard(event);
  } catch (err) {
    console.error('Error processing event submission:', err);
  }
}
