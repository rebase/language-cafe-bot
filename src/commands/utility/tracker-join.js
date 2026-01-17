import { SlashCommandBuilder } from 'discord.js';
import joinTracker from '../../service/interaction/is-chat-input-command/join-tracker.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('tracker-join')
  .setDescription('Join the tracker in this forum thread')
  .addStringOption((option) =>
    option
      .setName('emoji')
      .setDescription('Your emoji for the tracker (e.g., 🐶, 🎨, 🚀)')
      .setRequired(true),
  );

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await joinTracker(interaction);
  },
};
