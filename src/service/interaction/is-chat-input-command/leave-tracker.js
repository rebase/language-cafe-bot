import { COLORS } from '../../../constants/index.js';
import Tracker from '../../../models/tracker.js';
import TrackerParticipant from '../../../models/tracker-participant.js';
import TrackerCheckin from '../../../models/tracker-checkin.js';
import { isForumThread } from '../../utils/tracker-utils.js';
import { updateLiveTracker } from '../../utils/tracker-renderer.js';
import channelLog from '../../utils/channel-log.js';

export default async function leaveTracker(interaction) {
  await interaction.deferReply();

  try {
    // Validate this is a forum thread
    if (!isForumThread(interaction.channel)) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Channel',
            description: 'You can only leave trackers in forum threads.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    const threadId = interaction.channel.id;
    const userId = interaction.user.id;

    // Find the tracker
    const tracker = await Tracker.findOne({ threadId, isActive: true });
    if (!tracker) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'No Tracker Found',
            description: 'There is no active tracker in this thread.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Check if user is a participant
    const participant = await TrackerParticipant.findOne({ trackerId: threadId, userId });
    if (!participant) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Not Participating',
            description: 'You are not participating in this tracker.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Delete participant and all their check-ins
    await TrackerParticipant.deleteOne({ trackerId: threadId, userId });
    await TrackerCheckin.deleteMany({ trackerId: threadId, userId });

    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Left Tracker',
          description: `<@${userId}> has left the tracker. Their emoji ${participant.emoji} is now available for others.`,
        },
      ],
    });

    channelLog(`User left tracker: ${userId} | ${threadId} | ${participant.emoji}`);

    // Update live tracker
    await updateLiveTracker(threadId, interaction.channel);
  } catch (error) {
    console.error('Error leaving tracker:', error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Error',
          description: 'An error occurred while leaving the tracker. Please try again.',
        },
      ],
      ephemeral: true,
    });
  }
}
