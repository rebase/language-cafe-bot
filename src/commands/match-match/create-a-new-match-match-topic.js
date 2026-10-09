import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import createANewMatchMatchTopic from '../../service/interaction/is-chat-input-command/create-a-new-match-match-topic.js';

export default {
  data: new SlashCommandBuilder()
    .setName('create-a-new-match-match-topic')
    .setDescription('Create new match match topic')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    createANewMatchMatchTopic(interaction);
  },
};
