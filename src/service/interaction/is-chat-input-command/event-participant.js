import Event from '../../../models/event.js';
import EventParticipant from '../../../models/event-participant.js';
import EventSubmission from '../../../models/event-submission.js';
import EventBan from '../../../models/event-ban.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { updateLiveLeaderboard } from '../../utils/event-utils.js';

async function findEventByName(name) {
  return Event.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
}

/**
 * /event participant remove
 * Removes a participant and all their tracked event data.
 * Does not ban them — they can still earn points again if they resubmit.
 */
export async function eventParticipantRemove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');
  const targetUser = interaction.options.getUser('user');

  const event = await findEventByName(eventName);
  if (!event) return interaction.editReply(`❌ No event found with the name **${eventName}**.`);

  const participant = await EventParticipant.findOne({
    eventId: event._id.toString(),
    userId: targetUser.id,
  });

  if (!participant) {
    return interaction.editReply(
      `ℹ️ <@${targetUser.id}> is not a recorded participant for this event.`,
    );
  }

  await Promise.all([
    EventParticipant.deleteOne({ eventId: event._id.toString(), userId: targetUser.id }),
    EventSubmission.deleteMany({ eventId: event._id.toString(), userId: targetUser.id }),
  ]);

  channelLog(
    generateSystemLogContent('Event Participant Removed', {
      event: `\`${event.name}\``,
      user: `<@${targetUser.id}>`,
      pointsRemoved: `\`${participant.points}\``,
      moderator: `<@${interaction.user.id}>`,
    }),
  );

  // Refresh the leaderboard since rankings may have changed
  await updateLiveLeaderboard(event);

  return interaction.editReply(
    `✅ <@${targetUser.id}>'s data for **${event.name}** has been removed.\n` +
      `(${participant.points} points, ${participant.submissionCount} submissions deleted)`,
  );
}

/**
 * /event participant ban
 * Prevents a participant from earning further points for an event.
 * Existing points are NOT removed unless a moderator separately uses /event points remove.
 */
export async function eventParticipantBan(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');
  const targetUser = interaction.options.getUser('user');

  const event = await findEventByName(eventName);
  if (!event) return interaction.editReply(`❌ No event found with the name **${eventName}**.`);

  const existingBan = await EventBan.findOne({
    eventId: event._id.toString(),
    userId: targetUser.id,
  });

  if (existingBan) {
    return interaction.editReply(
      `ℹ️ <@${targetUser.id}> is already banned from **${event.name}**.`,
    );
  }

  const ban = new EventBan({
    eventId: event._id.toString(),
    userId: targetUser.id,
    bannedBy: interaction.user.id,
  });
  await ban.save();

  channelLog(
    generateSystemLogContent('Event Participant Banned', {
      event: `\`${event.name}\``,
      user: `<@${targetUser.id}>`,
      moderator: `<@${interaction.user.id}>`,
    }),
  );

  return interaction.editReply(
    `✅ <@${targetUser.id}> has been banned from earning points in **${event.name}**.\n` +
      `Their existing points are unchanged. Use \`/event points remove\` to deduct them if needed.`,
  );
}
