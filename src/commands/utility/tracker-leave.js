import { SlashCommandBuilder } from 'discord.js';
import leaveTracker from '../../service/interaction/is-chat-input-command/leave-tracker.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('tracker-leave')
  .setDescription('Leave the tracker in this forum thread');

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await leaveTracker(interaction);
  },
};
