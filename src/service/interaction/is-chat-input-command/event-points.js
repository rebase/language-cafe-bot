import Event from '../../../models/event.js';
import EventParticipant from '../../../models/event-participant.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { updateLiveLeaderboard } from '../../utils/event-utils.js';

async function findEventByName(name) {
  return Event.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
}

/**
 * /event points add
 * Manually adds points to a participant. Capped at maxPoints.
 */
export async function eventPointsAdd(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');
  const targetUser = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  const event = await findEventByName(eventName);
  if (!event) return interaction.editReply(`❌ No event found with the name **${eventName}**.`);

  if (!event.pointsPerSubmission) {
    return interaction.editReply(`❌ **${event.name}** has no points configured.`);
  }

  let participant = await EventParticipant.findOne({
    eventId: event._id.toString(),
    userId: targetUser.id,
  });

  if (!participant) {
    participant = new EventParticipant({
      eventId: event._id.toString(),
      userId: targetUser.id,
      points: 0,
      submissionCount: 0,
    });
  }

  const before = participant.points;
  participant.points = Math.min(participant.points + amount, event.maxPoints);
  const actual = participant.points - before;
  await participant.save();

  channelLog(
    generateSystemLogContent('Event Points Added (Manual)', {
      event: `\`${event.name}\``,
      user: `<@${targetUser.id}>`,
      added: `\`+${actual}\``,
      total: `\`${participant.points}/${event.maxPoints}\``,
      moderator: `<@${interaction.user.id}>`,
    }),
  );

  await updateLiveLeaderboard(event);

  return interaction.editReply(
    `✅ Added **${actual}** points to <@${targetUser.id}> for **${event.name}**.\n` +
      `New total: **${participant.points}** / ${event.maxPoints}`,
  );
}

/**
 * /event points remove
 * Manually removes points from a participant. Floors at 0.
 */
export async function eventPointsRemove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');
  const targetUser = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  const event = await findEventByName(eventName);
  if (!event) return interaction.editReply(`❌ No event found with the name **${eventName}**.`);

  if (!event.pointsPerSubmission) {
    return interaction.editReply(`❌ **${event.name}** has no points configured.`);
  }

  const participant = await EventParticipant.findOne({
    eventId: event._id.toString(),
    userId: targetUser.id,
  });

  if (!participant) {
    return interaction.editReply(`ℹ️ <@${targetUser.id}> has no recorded points for this event.`);
  }

  const before = participant.points;
  participant.points = Math.max(0, participant.points - amount);
  const actual = before - participant.points;
  await participant.save();

  channelLog(
    generateSystemLogContent('Event Points Removed (Manual)', {
      event: `\`${event.name}\``,
      user: `<@${targetUser.id}>`,
      removed: `\`-${actual}\``,
      total: `\`${participant.points}/${event.maxPoints}\``,
      moderator: `<@${interaction.user.id}>`,
    }),
  );

  await updateLiveLeaderboard(event);

  return interaction.editReply(
    `✅ Removed **${actual}** points from <@${targetUser.id}> for **${event.name}**.\n` +
      `New total: **${participant.points}** / ${event.maxPoints}`,
  );
}
