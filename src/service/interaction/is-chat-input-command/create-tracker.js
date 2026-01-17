import { COLORS } from '../../../constants/index.js';
import Tracker from '../../../models/tracker.js';
import { isForumThread, getStartOfDay } from '../../utils/tracker-utils.js';
import channelLog from '../../utils/channel-log.js';

export default async function createTracker(interaction) {
  await interaction.deferReply();

  try {
    // Check if user has Manage Channels permission
    if (!interaction.member.permissions.has('ManageChannels')) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Insufficient Permissions',
            description: 'You need the "Manage Channels" permission to create trackers.',
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
            description: 'Trackers can only be created in threads.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    const threadId = interaction.channel.id;

    // Check if a tracker already exists in this thread
    const existingTracker = await Tracker.findOne({ threadId });
    if (existingTracker) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Tracker Already Exists',
            description:
              'This thread already has a tracker. Use `/tracker-end` to remove it first.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Parse and validate dates
    const startDateStr = interaction.options.getString('start_date');
    const endDateStr = interaction.options.getString('end_date');

    let startDate, endDate;
    try {
      startDate = new Date(startDateStr + 'T00:00:00.000Z');
      endDate = new Date(endDateStr + 'T23:59:59.999Z');

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Date Format',
            description: 'Please use YYYY-MM-DD format for dates (e.g., 2026-01-20).',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Validate date logic
    if (startDate >= endDate) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Dates',
            description: 'End date must be after start date.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Get other options
    const frequency = interaction.options.getString('frequency');
    const displayName = interaction.options.getString('display_name') || interaction.channel.name;
    const gracePeriodDays = interaction.options.getInteger('grace_period') || 7;
    const maxBreaksPerWeek = interaction.options.getInteger('max_breaks_per_week');
    const maxMisses = interaction.options.getInteger('max_misses');

    // Validate break limits only apply to daily trackers
    if (frequency === 'weekly' && maxBreaksPerWeek !== null) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Configuration',
            description: 'Break limits only apply to daily trackers.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Create tracker
    const tracker = new Tracker({
      threadId,
      displayName,
      startDate,
      endDate,
      frequency,
      gracePeriodDays,
      maxBreaksPerWeek,
      maxMisses,
      createdBy: interaction.user.id,
    });

    await tracker.save();

    // Create and send tracker info embed
    const infoEmbed = {
      color: COLORS.PRIMARY,
      title: `📊 ${displayName}`,
      fields: [
        {
          name: '📅 Period',
          value: `${startDateStr} to ${endDateStr}`,
          inline: true,
        },
        {
          name: '⏰ Frequency',
          value: frequency.charAt(0).toUpperCase() + frequency.slice(1),
          inline: true,
        },
        {
          name: '🕐 Grace Period',
          value: `${gracePeriodDays} days`,
          inline: true,
        },
      ],
      description: 'Use `/tracker-join` to participate in this tracker.',
    };

    if (maxBreaksPerWeek !== null) {
      infoEmbed.fields.push({
        name: '☕ Max Breaks/Week',
        value: maxBreaksPerWeek.toString(),
        inline: true,
      });
    }

    if (maxMisses !== null) {
      infoEmbed.fields.push({
        name: '❌ Max Misses',
        value: maxMisses.toString(),
        inline: true,
      });
    }

    const infoMessage = await interaction.editReply({
      embeds: [infoEmbed],
    });

    // Pin the info message
    await infoMessage.pin();

    // Update tracker with message ID
    tracker.infoMessageId = infoMessage.id;
    await tracker.save();

    channelLog(
      `Tracker created: ${threadId} | ${displayName} | ${frequency} | ${startDateStr} to ${endDateStr}`,
    );
  } catch (error) {
    console.error('Error creating tracker:', error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Error',
          description: 'An error occurred while creating the tracker. Please try again.',
        },
      ],
      ephemeral: true,
    });
  }
}
