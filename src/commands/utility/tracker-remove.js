import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import removeFromTracker from '../../service/interaction/is-chat-input-command/remove-from-tracker.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('tracker-remove')
  .setDescription('Remove a user from the tracker (Staff only)')
  .addUserOption((option) =>
    option.setName('user').setDescription('User to remove from the tracker').setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.PinMessages);

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await removeFromTracker(interaction);
  },
};
