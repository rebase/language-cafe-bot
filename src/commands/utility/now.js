import { SlashCommandBuilder } from 'discord.js';
import displayEvents from '../../service/utils/event-calendar.js';

export default {
  data: new SlashCommandBuilder()
    .setName('now')
    .setDescription('Display events that are live right now'),

  async execute(interaction) {
    await displayEvents(interaction, 'now');
  },
};
