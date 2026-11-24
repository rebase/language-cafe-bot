import { SlashCommandBuilder } from 'discord.js';
import { handleStudy } from '../../service/utils/study.js';

export default {
  data: new SlashCommandBuilder().setName('study').setDescription('Your optional interactive Study Streak')
    .setDMPermission(false)
    .addSubcommand((s) => s.setName('start').setDescription('Check in and start today’s plan'))
    .addSubcommand((s) => s.setName('plan').setDescription('Find your latest post or open a daily plan')
      .addStringOption((o) => o.setName('date').setDescription('UTC date YYYY-MM-DD; defaults to your latest post')))
    .addSubcommand((s) => s.setName('template').setDescription('Manage up to five reusable templates'))
    .addSubcommand((s) => s.setName('goals').setDescription('Set optional weekly completion goals'))
    .addSubcommand((s) => s.setName('stats').setDescription('View streak, Activity and Task statistics')
      .addIntegerOption((o) => o.setName('page').setDescription('Page number').setMinValue(1))),
  execute: handleStudy,
};
