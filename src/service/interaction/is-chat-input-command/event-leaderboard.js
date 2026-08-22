import Event from '../../../models/event.js';
import EventLeaderboard from '../../../models/event-leaderboard.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { buildLiveLeaderboardEmbed } from '../../utils/event-utils.js';
import client from '../../../client/index.js';

/**
 * /event leaderboard
 * Posts the live leaderboard embed in the event's submission channel, pins it,
 * and stores the message ID so the submission handler can edit it on every new submission.
 *
 * If a leaderboard record already exists but the message has been deleted,
 * it replaces the record with a fresh post automatically.
 *
 * Events without points configured do not get a leaderboard.
 */
export default async function eventLeaderboard(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');

  const event = await Event.findOne({ name: { $regex: new RegExp(`^${eventName}$`, 'i') } });

  if (!event) {
    return interaction.editReply(`❌ No event found with the name **${eventName}**.`);
  }

  if (!event.pointsPerSubmission) {
    return interaction.editReply(
      `❌ **${event.name}** has no points configured — leaderboards are only available for point-based events.`,
    );
  }

  // Fetch the submission channel from the event itself
  let channel;
  try {
    channel = await client.channels.fetch(event.submissionChannelId);
  } catch {
    return interaction.editReply(
      `❌ Could not fetch the submission channel <#${event.submissionChannelId}>. Check bot permissions.`,
    );
  }

  if (!channel) {
    return interaction.editReply(`❌ Submission channel not found.`);
  }

  const existing = await EventLeaderboard.findOne({ eventId: event._id.toString() });

  if (existing) {
    // Check if the stored message still exists
    let messageStillExists = false;
    try {
      await channel.messages.fetch(existing.messageId);
      messageStillExists = true;
    } catch {
      // Message was deleted — we'll replace the record
    }

    if (messageStillExists) {
      return interaction.editReply(
        `❌ A leaderboard for **${event.name}** already exists in <#${existing.channelId}>.\n` +
          `https://discord.com/channels/${interaction.guildId}/${existing.channelId}/${existing.messageId}`,
      );
    }

    // Message gone — delete the stale record and re-post
    await EventLeaderboard.deleteOne({ eventId: event._id.toString() });
  }

  const embed = await buildLiveLeaderboardEmbed(event);
  const posted = await channel.send({ embeds: [embed] });

  try {
    await posted.pin();
  } catch {
    // Missing pin permissions — not fatal
  }

  await EventLeaderboard.create({
    eventId: event._id.toString(),
    channelId: channel.id,
    messageId: posted.id,
  });

  channelLog(
    generateSystemLogContent('Event Leaderboard Posted', {
      event: `\`${event.name}\``,
      channel: `<#${channel.id}>`,
      postedBy: `<@${interaction.user.id}>`,
    }),
  );

  return interaction.editReply(`✅ Leaderboard posted and pinned in <#${channel.id}>.`);
}
