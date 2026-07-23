import { SlashCommandBuilder } from 'discord.js';
import displayEvents from '../../service/utils/event-calendar.js';

export default {
  data: new SlashCommandBuilder()
    .setName('today')
    .setDescription("Display today's events from the event calendar"),

  async execute(interaction) {
    await displayEvents(interaction, 'today');
  },
};
