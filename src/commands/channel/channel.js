import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import channelAdd from '../../service/interaction/is-chat-input-command/channel-add.js';
import channelRemove from '../../service/interaction/is-chat-input-command/channel-remove.js';
import channelWaiterAdd from '../../service/interaction/is-chat-input-command/channel-waiter-add.js';
import channelWaiterRemove from '../../service/interaction/is-chat-input-command/channel-waiter-remove.js';
import channelList from '../../service/interaction/is-chat-input-command/channel-list.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';
const data = new SlashCommandBuilder()
  .setName('channel')
  .setDescription('Manage monitored language channels and waiter assignments')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  // ── /channel add ───────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Register a language channel for event tracking')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('The language channel to register').setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName('display_name')
          .setDescription('Human-readable name, e.g. Korean')
          .setRequired(true)
          .setMaxLength(50),
      )
      .addStringOption((o) =>
        o
          .setName('emoji')
          .setDescription('Country flag or custom emoji, e.g. 🇰🇷')
          .setRequired(true)
          .setMaxLength(50)
          .setAutocomplete(true),
      ),
  )

  // ── /channel remove ────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Deregister a monitored language channel (historical records preserved)')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('The channel to deregister').setRequired(true),
      ),
  )

  // ── /channel waiter-add ────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('waiter-add')
      .setDescription('Assign a waiter to a monitored language channel')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('The language channel').setRequired(true),
      )
      .addUserOption((o) =>
        o.setName('user').setDescription('The waiter to assign').setRequired(true),
      ),
  )

  // ── /channel waiter-remove ─────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('waiter-remove')
      .setDescription('Remove a waiter from a monitored language channel')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('The language channel').setRequired(true),
      )
      .addUserOption((o) =>
        o.setName('user').setDescription('The waiter to remove').setRequired(true),
      ),
  )

  // ── /channel list ──────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('List all registered channels and their assigned waiters'),
  );

export default {
  data,

  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') return channelAdd(interaction);
    if (sub === 'remove') return channelRemove(interaction);
    if (sub === 'waiter-add') return channelWaiterAdd(interaction);
    if (sub === 'waiter-remove') return channelWaiterRemove(interaction);
    if (sub === 'list') return channelList(interaction);

    return interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
  },
};
