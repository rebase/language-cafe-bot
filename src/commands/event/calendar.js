import { SlashCommandBuilder } from 'discord.js';
import eventCalendar from '../../service/interaction/is-chat-input-command/event-calendar.js';

export default {
  data: new SlashCommandBuilder()
    .setName('calendar')
    .setDescription('Show upcoming and active events'),

  async execute(interaction) {
    await eventCalendar(interaction);
  },
};
