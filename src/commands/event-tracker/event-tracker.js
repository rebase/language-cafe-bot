import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import eventTrackerRefresh from '../../service/interaction/is-chat-input-command/event-tracker-refresh.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

const data = new SlashCommandBuilder()
  .setName('event-tracker')
  .setDescription('Annual event tracker management')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  // ── /event-tracker refresh ─────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('refresh')
      .setDescription(
        'Recalculate and update the annual event tracker (recreates message if deleted)',
      ),
  );

export default {
  data,

  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));

    const sub = interaction.options.getSubcommand();

    if (sub === 'refresh') return eventTrackerRefresh(interaction);

    return interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
  },
};
