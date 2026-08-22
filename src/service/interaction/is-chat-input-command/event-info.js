import { time } from 'discord.js';
import Event from '../../../models/event.js';
import EventParticipant from '../../../models/event-participant.js';
import channelLog, { generateInteractionCreateLogContent } from '../../utils/channel-log.js';

/**
 * /event info
 * Looks up an event by name (case-insensitive) and displays its full config and status.
 */
export default async function eventInfo(interaction) {
  await interaction.deferReply({ ephemeral: false });

  channelLog(generateInteractionCreateLogContent(interaction));

  const eventName = interaction.options.getString('event_name');

  const event = await Event.findOne({ name: { $regex: new RegExp(`^${eventName}$`, 'i') } });

  if (!event) {
    return interaction.editReply(`❌ No event found with the name **${eventName}**.`);
  }

  const participantCount = await EventParticipant.countDocuments({
    eventId: event._id.toString(),
  });

  const statusLabel =
    event.status === 'active' ? '🟢 Active' : event.status === 'ended' ? '⚫ Ended' : '🕐 Upcoming';

  const fields = [
    { name: 'Type', value: event.eventType, inline: true },
    { name: 'Status', value: statusLabel, inline: true },
    { name: 'Creator', value: `<@${event.creatorId}>`, inline: true },
    { name: 'Hashtag', value: `\`${event.hashtag}\``, inline: true },
    { name: 'Submission Channel', value: `<#${event.submissionChannelId}>`, inline: true },
    { name: 'Participants', value: `${participantCount}`, inline: true },
    {
      name: 'Start',
      value: time(Math.floor(event.startDate.getTime() / 1000), 'F'),
      inline: true,
    },
    {
      name: 'End',
      value: time(Math.floor(event.endDate.getTime() / 1000), 'F'),
      inline: true,
    },
  ];

  if (event.pointsPerSubmission) {
    fields.push(
      { name: 'Points per Submission', value: `${event.pointsPerSubmission}`, inline: true },
      { name: 'Max Points', value: `${event.maxPoints}`, inline: true },
      {
        name: 'Creator Bonus',
        value: event.creatorBonus > 0 ? `${event.creatorBonus}` : '*(none)*',
        inline: true,
      },
    );
  } else {
    fields.push({ name: 'Points', value: 'Tracking only (no points)', inline: true });
  }

  if (event.eventPostLink) {
    fields.push({ name: 'Event Post', value: event.eventPostLink, inline: false });
  }

  return interaction.editReply({
    embeds: [
      {
        color: 0x4a90d9,
        title: event.name,
        fields,
        footer: { text: `Event ID: ${event._id}` },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
