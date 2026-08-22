import Event from '../../../models/event.js';
import channelLog, { generateInteractionCreateLogContent } from '../../utils/channel-log.js';
import { buildCalendarEmbed } from '../../utils/event-utils.js';

/**
 * /calendar
 * Displays all upcoming and active events.
 */
export default async function eventCalendar(interaction) {
  await interaction.deferReply({ ephemeral: false });

  channelLog(generateInteractionCreateLogContent(interaction));

  const events = await Event.find({
    status: { $in: ['pending', 'active'] },
  }).sort({ startDate: 1 });

  if (events.length === 0) {
    return interaction.editReply('📅 No upcoming or active events right now. Check back later!');
  }

  const embeds = events.map((event) => buildCalendarEmbed(event));

  // Discord allows up to 10 embeds per message
  if (embeds.length <= 10) {
    return interaction.editReply({ content: '## 📅 Event Calendar', embeds });
  }

  // More than 10 — send in batches
  await interaction.editReply({ content: '## 📅 Event Calendar', embeds: embeds.slice(0, 10) });
  for (let i = 10; i < embeds.length; i += 10) {
    await interaction.followUp({ embeds: embeds.slice(i, i + 10) });
  }
}
