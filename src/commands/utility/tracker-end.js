import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import endTracker from '../../service/interaction/is-chat-input-command/end-tracker.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('tracker-end')
  .setDescription('End the tracker in this forum thread (Staff only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await endTracker(interaction);
  },
};
