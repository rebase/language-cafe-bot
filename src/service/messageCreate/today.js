import { buildTodayCalendarEmbed } from '../utils/calendar-embed.js';

export default async (message) => {
  try {
    const { embed } = await buildTodayCalendarEmbed();
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('?today command error:', error);
    await message.channel
      .send('Sorry, something went wrong while fetching the calendar.')
      .catch(() => {});
  }
};
