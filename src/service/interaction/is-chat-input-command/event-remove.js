import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Event from '../../../models/event.js';
import EventParticipant from '../../../models/event-participant.js';
import EventSubmission from '../../../models/event-submission.js';
import EventBan from '../../../models/event-ban.js';
import EventLeaderboard from '../../../models/event-leaderboard.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { refreshEventCalendar } from '../../utils/event-calendar.js';

/**
 * /event remove
 * Shows a confirmation prompt before permanently deleting an event and all its data.
 * The actual deletion is handled by handleEventRemoveConfirm() below, triggered
 * by the confirm button in interaction-create.js.
 */
export default async function eventRemove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');

  const event = await Event.findOne({ name: { $regex: new RegExp(`^${eventName}$`, 'i') } });

  if (!event) {
    return interaction.editReply(`❌ No event found with the name **${eventName}**.`);
  }

  const participantCount = await EventParticipant.countDocuments({
    eventId: event._id.toString(),
  });

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
      `This action **cannot be undone**.`,
    components: [confirmRow],
  });
}

/**
 * Handles the confirm button press for event removal.
 * Called from interaction-create.js when customId starts with `event-remove-confirm:`.
 */
export async function handleEventRemoveConfirm(interaction) {
  await interaction.deferUpdate();

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

  // Delete all associated data
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

  // Refresh the calendar channel
  refreshEventCalendar();

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
