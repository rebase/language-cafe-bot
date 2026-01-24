import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import unbanFromTracker from '../../service/interaction/is-chat-input-command/unban-from-tracker.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('tracker-unban')
  .setDescription('Unban a user from the tracker (Staff only)')
  .addUserOption((option) =>
    option.setName('user').setDescription('User to unban from the tracker').setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.PinMessages);

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await unbanFromTracker(interaction);
  },
};
