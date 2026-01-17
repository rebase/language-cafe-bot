import { COLORS } from '../../../constants/index.js';
import Tracker from '../../../models/tracker.js';
import TrackerParticipant from '../../../models/tracker-participant.js';
import TrackerCheckin from '../../../models/tracker-checkin.js';
import TrackerBan from '../../../models/tracker-ban.js';
import { isForumThread } from '../../utils/tracker-utils.js';
import channelLog from '../../utils/channel-log.js';

export default async function endTracker(interaction) {
  await interaction.deferReply();

  try {
    // Check if user has Manage Channels permission
    if (!interaction.member.permissions.has('ManageChannels')) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Insufficient Permissions',
            description: 'You need the "Manage Channels" permission to end trackers.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Validate this is a thread
    if (!isForumThread(interaction.channel)) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Channel',
            description: 'You can only end trackers in threads.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    const threadId = interaction.channel.id;

    // Find the tracker
    const tracker = await Tracker.findOne({ threadId });
    if (!tracker) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'No Tracker Found',
            description: 'There is no tracker in this thread.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Delete all tracker data
    await Promise.all([
      Tracker.deleteOne({ threadId }),
      TrackerParticipant.deleteMany({ trackerId: threadId }),
      TrackerCheckin.deleteMany({ trackerId: threadId }),
      TrackerBan.deleteMany({ trackerId: threadId }),
    ]);

    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: '🏁 Tracker Ended',
          description: `The tracker "${tracker.displayName}" has been completely removed by <@${interaction.user.id}>.\n\nAll data has been deleted. You can create a new tracker anytime.`,
        },
      ],
    });

    channelLog(`Tracker deleted: ${threadId} | ${tracker.displayName} | by ${interaction.user.id}`);
  } catch (error) {
    console.error('Error ending tracker:', error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Error',
          description: 'An error occurred while ending the tracker. Please try again.',
        },
      ],
      ephemeral: true,
    });
  }
}
