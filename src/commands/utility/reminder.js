import { SlashCommandBuilder } from 'discord.js';
import createReminder from '../../service/interaction/is-chat-input-command/create-reminder.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('reminder')
  .setDescription('Set up an event reminder system')
  .addStringOption((option) =>
    option
      .setName('message_link')
      .setDescription(
        'Right-click message → Copy Message Link (e.g., https://discord.com/channels/...)',
      )
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('end_date')
      .setDescription('Event end date: 2024-12-25 or 2024-12-25 18:00')
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('days_before')
      .setDescription('Days before end date to send reminder (default: 1)')
      .setMinValue(1)
      .setMaxValue(30),
  );

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await createReminder(interaction);
  },
};
