import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import createTracker from '../../service/interaction/is-chat-input-command/create-tracker.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('tracker-create')
  .setDescription('Create a new tracker in this forum thread (Staff only)')
  .addStringOption((option) =>
    option.setName('start_date').setDescription('Start date (YYYY-MM-DD)').setRequired(true),
  )
  .addStringOption((option) =>
    option.setName('end_date').setDescription('End date (YYYY-MM-DD)').setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('frequency')
      .setDescription('Check-in frequency')
      .setRequired(true)
      .addChoices({ name: 'Daily', value: 'daily' }, { name: 'Weekly', value: 'weekly' }),
  )
  .addStringOption((option) =>
    option
      .setName('display_name')
      .setDescription('Display name (optional, defaults to thread title)')
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName('grace_period')
      .setDescription('Grace period in days (default: 7)')
      .setMinValue(0)
      .setMaxValue(30)
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName('max_breaks_per_week')
      .setDescription('Max breaks per week for daily trackers (optional)')
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName('max_misses')
      .setDescription('Max misses before ban (days for daily, weeks for weekly trackers)')
      .setMinValue(0)
      .setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await createTracker(interaction);
  },
};
