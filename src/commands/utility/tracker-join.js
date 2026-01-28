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
      .setDescription('Choose your emoji for this tracker')
      .setRequired(true)
      .setAutocomplete(true),
  );

export default {
  data,
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));
    await joinTracker(interaction);
  },
};
