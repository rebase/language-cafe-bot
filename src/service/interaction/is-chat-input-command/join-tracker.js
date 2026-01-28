import { COLORS } from '../../../constants/index.js';
import Tracker from '../../../models/tracker.js';
import TrackerParticipant from '../../../models/tracker-participant.js';
import TrackerBan from '../../../models/tracker-ban.js';
import { isForumThread } from '../../utils/tracker-utils.js';
import { updateLiveTracker } from '../../utils/tracker-renderer.js';
import channelLog from '../../utils/channel-log.js';
import EMOJI_KEYWORDS from '../../../data/emoji-keywords.js';

export default async function joinTracker(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Validate this is a thread
    if (!isForumThread(interaction.channel)) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Channel',
            description: 'You can only join trackers in threads.',
          },
        ],
      });
      return;
    }

    const threadId = interaction.channel.id;
    const userId = interaction.user.id;
    const selectedEmoji = interaction.options.getString('emoji');

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
      });
      return;
    }

    // Check if user is already a participant
    const existingParticipant = await TrackerParticipant.findOne({ trackerId: threadId, userId });
    if (existingParticipant) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Already Joined',
            description: `You are already participating in this tracker as ${existingParticipant.emoji}`,
          },
        ],
      });
      return;
    }

    // Check if user is banned
    const ban = await TrackerBan.findOne({ trackerId: threadId, userId });
    if (ban) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Cannot Join',
            description:
              'You are banned from this tracker due to exceeding the maximum number of misses.',
          },
        ],
      });
      return;
    }

    // Check participant limit (max 25)
    const participantCount = await TrackerParticipant.countDocuments({ trackerId: threadId });
    if (participantCount >= 25) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Tracker Full',
            description: 'This tracker has reached the maximum of 25 participants.',
          },
        ],
      });
      return;
    }

    // Validate the selected emoji is available (must be in emoji-keywords)
    const availableEmojis = Object.keys(EMOJI_KEYWORDS);
    if (!availableEmojis.includes(selectedEmoji)) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Emoji',
            description: 'The selected emoji is not available for trackers.',
          },
        ],
      });
      return;
    }

    // Check if emoji is already in use
    const emojiInUse = await TrackerParticipant.findOne({
      trackerId: threadId,
      emoji: selectedEmoji,
    });
    if (emojiInUse) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Emoji Already Taken',
            description: `The emoji ${selectedEmoji} is already in use by another participant. Please choose a different emoji.`,
          },
        ],
      });
      return;
    }

    // Create participant
    const participant = new TrackerParticipant({
      trackerId: threadId,
      userId,
      emoji: selectedEmoji,
      joinedAt: new Date(),
    });

    await participant.save();

    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Successfully Joined Tracker!',
          description: `<@${userId}> has joined the **${tracker.displayName}** tracker as ${selectedEmoji}`,
        },
      ],
    });

    channelLog(`User joined tracker: ${userId} | ${threadId} | ${selectedEmoji}`);

    // Update live tracker
    await updateLiveTracker(threadId, interaction.channel);
  } catch (error) {
    console.error('Error joining tracker:', error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Error',
          description: 'An error occurred while joining the tracker. Please try again.',
        },
      ],
    });
  }
}
