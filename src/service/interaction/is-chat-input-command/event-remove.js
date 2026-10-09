import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Event from '../../../models/event.js';
import EventHistory from '../../../models/event-history.js';
import EventParticipant from '../../../models/event-participant.js';
import EventSubmission from '../../../models/event-submission.js';
import EventBan from '../../../models/event-ban.js';
import EventLeaderboard from '../../../models/event-leaderboard.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { refreshEventCalendar } from '../../utils/event-calendar.js';
import { findByIdOrName } from '../../utils/event-utils.js';
import { hasManageEventsPermission } from '../../utils/permissions.js';
import { syncEventHistory, refreshEventTracker } from '../../utils/event-tracker.js';

/**
 * /event remove
 * Shows a confirmation prompt before permanently deleting an event and all its data.
 */
export default async function eventRemove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!hasManageEventsPermission(interaction)) {
    return interaction.editReply('❌ You need the Manage Events permission to remove events.');
  }

  const eventName = interaction.options.getString('event_name');

  const event = await findByIdOrName(Event, eventName);

  if (!event) {
    return interaction.editReply(`❌ No event found with the name **${eventName}**.`);
  }

  const eventId = event._id.toString();

  const participantCount = await EventParticipant.countDocuments({ eventId });

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`event-remove-confirm:${eventId}`)
      .setLabel('Yes, delete permanently')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`event-remove-cancel:${eventId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
  );

  return interaction.editReply({
    content:
      `⚠️ **Permanently delete "${event.name}"?**\n` +
      `This will remove the event and data for **${participantCount} participant(s)**.\n` +
      'This action **cannot be undone**.',
    components: [confirmRow],
  });
}

/**
 * Handles the confirm button press for event removal.
 */
export async function handleEventRemoveConfirm(interaction) {
  await interaction.deferUpdate();

  if (!hasManageEventsPermission(interaction)) {
    return interaction.editReply({
      content: '❌ You need the Manage Events permission to remove events.',
      components: [],
    });
  }

  const eventId = interaction.customId.split(':')[1];

  let event;
  try {
    event = await Event.findById(eventId);
  } catch {
    return interaction.editReply({ content: '❌ Invalid event ID.', components: [] });
  }

  if (!event) {
    return interaction.editReply({ content: '❌ Event not found.', components: [] });
  }

  await syncEventHistory(event);
  // Invalidate unfinished events only in permanent history.
  if (event.endDate > new Date()) {
    await EventHistory.updateOne({ emsEventId: eventId }, { $set: { isValid: false } });
  }

  // Permanent history survives deletion of operational data.
  await Promise.all([
    EventParticipant.deleteMany({ eventId }),
    EventSubmission.deleteMany({ eventId }),
    EventBan.deleteMany({ eventId }),
    EventLeaderboard.deleteOne({ eventId }),
    Event.findByIdAndDelete(eventId),
  ]);

  channelLog(
    generateSystemLogContent('Event Removed', {
      event: `\`${event.name}\``,
      id: `\`${eventId}\``,
      removedBy: `<@${interaction.user.id}>`,
    }),
  );

  await refreshEventCalendar();
  await refreshEventTracker();

  return interaction.editReply({
    content: `🗑️ Event **${event.name}** and all associated data have been permanently deleted.`,
    components: [],
  });
}

/**
 * Handles the cancel button press for event removal.
 */
export async function handleEventRemoveCancel(interaction) {
  await interaction.deferUpdate();
  return interaction.editReply({ content: '✅ Event removal cancelled.', components: [] });
}
