import { SlashCommandBuilder } from 'discord.js';
import pomodoro from '../../service/utils/pomodoro.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pomodoro')
    .setDescription('Study together with repeating Pomodoro timers')
    .setDMPermission(false)
    .addSubcommand((sub) => sub.setName('create').setDescription('Create a temporary study group')
      .addStringOption((option) => option.setName('group-name').setDescription('Group name')
        .setMaxLength(40).setRequired(true))
      .addStringOption((option) => option.setName('timer-pattern')
        .setDescription('Alternating study/break minutes, for example 25/5')
        .setMaxLength(47).setRequired(true)))
    .addSubcommand((sub) => sub.setName('join').setDescription('Choose a group or permanent preset'))
    .addSubcommand((sub) => sub.setName('leave').setDescription('Leave your current group'))
    .addSubcommand((sub) => sub.setName('status').setDescription('View all active Pomodoro sessions in this server'))
    .addSubcommand((sub) => sub.setName('leaderboard').setDescription('View confirmed study rankings')
      .addStringOption((option) => option.setName('metric').setDescription('Ranking metric')
        .addChoices({ name: 'Study minutes', value: 'minutes' }, { name: 'Completed stages', value: 'stages' }))),
  async execute(interaction) {
    await pomodoro.handle(interaction);
  },
};
