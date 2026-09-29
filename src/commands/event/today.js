import { SlashCommandBuilder } from 'discord.js';
import postTodayEventCalendar from '../../service/interaction/is-chat-input-command/post-today-event-calendar.js';

export default {
  data: new SlashCommandBuilder()
    .setName('today')
    .setDescription("Post today's compact event calendar to #event-calendar"),

  async execute(interaction) {
    await postTodayEventCalendar(interaction);
  },
};
