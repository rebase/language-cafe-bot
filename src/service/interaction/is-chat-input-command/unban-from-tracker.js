import { COLORS } from '../../../constants/index.js';
import Tracker from '../../../models/tracker.js';
import TrackerBan from '../../../models/tracker-ban.js';
import { isForumThread } from '../../utils/tracker-utils.js';
import channelLog from '../../utils/channel-log.js';

export default async function unbanFromTracker(interaction) {
  await interaction.deferReply();

  try {
    // Validate this is a forum thread
    if (!isForumThread(interaction.channel)) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Channel',
            description: 'You can only unban users from trackers in forum threads.',
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

    // Check if user is banned
    const ban = await TrackerBan.findOne({ trackerId: threadId, userId: targetUser.id });
    if (!ban) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'User Not Banned',
            description: `${targetUser.displayName} is not banned from this tracker.`,
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Remove the ban
    await TrackerBan.deleteOne({ trackerId: threadId, userId: targetUser.id });

    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'User Unbanned',
          description: `${targetUser.displayName} has been unbanned from the tracker by <@${interaction.user.id}>. They can now rejoin if they wish.`,
        },
      ],
    });

    channelLog(
      `User unbanned from tracker: ${targetUser.id} | ${threadId} | by ${interaction.user.id}`,
    );
  } catch (error) {
    console.error('Error unbanning user from tracker:', error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Error',
          description: 'An error occurred while unbanning the user. Please try again.',
        },
      ],
      ephemeral: true,
    });
  }
}
