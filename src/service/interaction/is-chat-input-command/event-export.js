import Event from '../../../models/event.js';
import EventParticipant from '../../../models/event-participant.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';

const MAX_EXPORT_CHARS = 1900; // Leave room for Discord's 2000-char limit

/**
 * /event export
 * Generates t@scores commands for all participants.
 * The event creator's total includes their creator bonus if configured.
 */
export default async function eventExport(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');

  const event = await Event.findOne({ name: { $regex: new RegExp(`^${eventName}$`, 'i') } });

  if (!event) {
    return interaction.editReply(`❌ No event found with the name **${eventName}**.`);
  }

  const participants = await EventParticipant.find({ eventId: event._id.toString() })
    .sort({ points: -1 })
    .lean();

  if (participants.length === 0) {
    return interaction.editReply('ℹ️ No participants to export for this event.');
  }

  if (!event.pointsPerSubmission) {
    return interaction.editReply(
      `❌ **${event.name}** has no points configured — nothing to export.`,
    );
  }

  // Build one line per participant
  const lines = participants.map((p) => {
    let total = p.points;

    // Add creator bonus only in the export total, not on the leaderboard
    if (p.userId === event.creatorId && event.creatorBonus > 0) {
      total += event.creatorBonus;
    }

    return `t@scores add ${p.userId} ${total}`;
  });

  // Split into chunks that fit within Discord's message limit
  const chunks = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > MAX_EXPORT_CHARS) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  // Send first chunk as the deferred reply, subsequent chunks as follow-ups
  await interaction.editReply(
    `**Export for: ${event.name}** (${participants.length} participants)\n\`\`\`\n${chunks[0]}\n\`\`\``,
  );

  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp({ content: `\`\`\`\n${chunks[i]}\n\`\`\``, ephemeral: true });
  }

  channelLog(
    generateSystemLogContent('Event Export Generated', {
      event: `\`${event.name}\``,
      id: `\`${event._id}\``,
      participants: `\`${participants.length}\``,
      requestedBy: `<@${interaction.user.id}>`,
    }),
  );
}
