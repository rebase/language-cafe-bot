import client from '../../../client/index.js';
import { COLORS } from '../../../constants/index.js';
import Reminder from '../../../models/reminder.js';
import channelLog from '../../utils/channel-log.js';

const REMINDER_EMOJI = '🔔';

export default async function createReminder(interaction) {
  await interaction.deferReply();

  try {
    const messageLink = interaction.options.getString('message_link');
    const endDateStr = interaction.options.getString('end_date');
    const daysBefore = interaction.options.getInteger('days_before') || 1;

    // Parse message URL to extract channel and message IDs
    const urlMatch = messageLink.match(/https:\/\/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/);
    if (!urlMatch) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Message Link',
            description: 'Please provide a valid Discord message URL.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    const [, channelId, messageId] = urlMatch;

    // Parse end date
    let endDate;
    try {
      // Support both YYYY-MM-DD and YYYY-MM-DD HH:MM formats
      if (endDateStr.includes(' ')) {
        endDate = new Date(endDateStr);
      } else {
        // If only date provided, set to end of day
        endDate = new Date(`${endDateStr} 23:59:59`);
      }

      if (Number.isNaN(endDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Date Format',
            description:
              'Please use format: YYYY-MM-DD or YYYY-MM-DD HH:MM (e.g., 2024-12-25 or 2024-12-25 18:00)',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Check if end date is in the future
    if (endDate <= new Date()) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid End Date',
            description: 'The end date must be in the future.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Calculate reminder date
    const reminderAt = new Date(endDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

    // Check if reminder date is in the future
    if (reminderAt <= new Date()) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Invalid Reminder Time',
            description:
              'The reminder would be sent in the past. Try reducing days_before or setting a later end date.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    // Verify the message exists and bot has access
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const message = await channel.messages.fetch(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if reminder already exists for this message
      const existingReminder = await Reminder.findOne({ messageId });
      if (existingReminder) {
        await interaction.editReply({
          embeds: [
            {
              color: COLORS.PRIMARY,
              title: 'Reminder Already Exists',
              description: 'A reminder is already set up for this message.',
            },
          ],
          ephemeral: true,
        });
        return;
      }

      // Create reminder in database
      const reminder = new Reminder({
        channelId,
        messageId,
        messageUrl: messageLink,
        endDate,
        daysBefore,
        emoji: REMINDER_EMOJI,
        reminderAt,
        subscribers: [],
      });

      await reminder.save();

      // Add emoji reaction to the message
      await message.react(REMINDER_EMOJI);

      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Reminder Set Up Successfully!',
            description:
              '✅ Reminder created for the event\n\n' +
              `📅 **End Date:** ${endDate.toLocaleString()}\n` +
              `⏰ **Reminder:** ${daysBefore} day(s) before (${reminderAt.toLocaleString()})\n` +
              `🔔 **Emoji:** ${REMINDER_EMOJI}\n\n` +
              `Users can now react with ${REMINDER_EMOJI} on the [event message](${messageLink}) to get reminded!`,
          },
        ],
      });

      channelLog(
        `Reminder created: ${messageId} | End: ${endDate.toISOString()} | Reminder: ${reminderAt.toISOString()}`,
      );
    } catch (error) {
      console.error('Error accessing message:', error);
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Message Access Error',
            description:
              'Could not access the specified message. Please check:\n' +
              '• The message link is correct\n' +
              '• The bot has access to that channel\n' +
              '• The message still exists',
          },
        ],
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('Error creating reminder:', error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Error',
          description: 'An error occurred while setting up the reminder. Please try again.',
        },
      ],
      ephemeral: true,
    });
  }
}
