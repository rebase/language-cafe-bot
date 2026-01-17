import { COLORS } from '../../../constants/index.js';
import Tracker from '../../../models/tracker.js';
import TrackerParticipant from '../../../models/tracker-participant.js';
import TrackerCheckin from '../../../models/tracker-checkin.js';
import { isForumThread } from '../../utils/tracker-utils.js';
import { updateLiveTracker } from '../../utils/tracker-renderer.js';
import channelLog from '../../utils/channel-log.js';

export default async function removeFromTracker(interaction) {
  await interaction.deferReply();

  try {
    // Validate this is a forum thread
    if (!isForumThread(interaction.channel)) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Channel',
            description: 'You can only remove users from trackers in forum threads.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    const threadId = interaction.channel.id;
    const targetUser = interaction.options.getUser('user');

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
    const participant = await TrackerParticipant.findOne({
      trackerId: threadId,
      userId: targetUser.id,
    });
    if (!participant) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'User Not Found',
            description: `${targetUser.displayName} is not participating in this tracker.`,
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Remove participant and all their check-ins (does NOT ban)
    await TrackerParticipant.deleteOne({ trackerId: threadId, userId: targetUser.id });
    await TrackerCheckin.deleteMany({ trackerId: threadId, userId: targetUser.id });

    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'User Removed',
          description: `${targetUser.displayName} has been removed from the tracker by <@${interaction.user.id}>. Their emoji ${participant.emoji} is now available for others.\n\n*Note: This does not ban the user - they can rejoin if they wish.*`,
        },
      ],
    });

    channelLog(
      `User removed from tracker: ${targetUser.id} | ${threadId} | ${participant.emoji} | by ${interaction.user.id}`,
    );

    // Update live tracker
    await updateLiveTracker(threadId, interaction.channel);
  } catch (error) {
    console.error('Error removing user from tracker:', error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Error',
          description: 'An error occurred while removing the user. Please try again.',
        },
      ],
      ephemeral: true,
    });
  }
}
