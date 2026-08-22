import Event from '../../../models/event.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { normaliseHashtag } from '../../utils/event-utils.js';
import { refreshEventCalendar } from '../../utils/event-calendar.js';

/**
 * /event edit
 * Updates any provided fields and saves. Event is looked up by name (case-insensitive).
 */
export default async function editEvent(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const eventName = interaction.options.getString('event_name');

  const event = await Event.findOne({ name: { $regex: new RegExp(`^${eventName}$`, 'i') } });

  if (!event) {
    return interaction.editReply(`❌ No event found with the name **${eventName}**.`);
  }

  const updates = {};
  const changed = [];

  const name = interaction.options.getString('name');
  if (name) {
    updates.name = name;
    changed.push('name');
  }

  const eventType = interaction.options.getString('event_type');
  if (eventType) {
    updates.eventType = eventType;
    changed.push('event_type');
  }

  const rawHashtag = interaction.options.getString('hashtag');
  if (rawHashtag) {
    updates.hashtag = normaliseHashtag(rawHashtag);
    changed.push('hashtag');
  }

  const submissionChannel = interaction.options.getChannel('submission_channel');
  if (submissionChannel) {
    updates.submissionChannelId = submissionChannel.id;
    changed.push('submission_channel');
  }

  const startDateStr = interaction.options.getString('start_date');
  if (startDateStr) {
    const d = new Date(startDateStr);
    if (isNaN(d.getTime())) return interaction.editReply('❌ Invalid start date.');
    updates.startDate = d;
    changed.push('start_date');
  }

  const endDateStr = interaction.options.getString('end_date');
  if (endDateStr) {
    const d = new Date(endDateStr);
    if (isNaN(d.getTime())) return interaction.editReply('❌ Invalid end date.');
    updates.endDate = d;
    changed.push('end_date');
  }

  const newStart = updates.startDate ?? event.startDate;
  const newEnd = updates.endDate ?? event.endDate;
  if (newEnd <= newStart) {
    return interaction.editReply('❌ End date must be after start date.');
  }

  const pointsPerSubmission = interaction.options.getInteger('points_per_submission');
  if (pointsPerSubmission !== null) {
    updates.pointsPerSubmission = pointsPerSubmission;
    changed.push('points_per_submission');
  }

  const maxPoints = interaction.options.getInteger('max_points');
  if (maxPoints !== null) {
    updates.maxPoints = maxPoints;
    changed.push('max_points');
  }

  const creatorBonus = interaction.options.getInteger('creator_bonus');
  if (creatorBonus !== null) {
    updates.creatorBonus = creatorBonus;
    changed.push('creator_bonus');
  }

  const eventPostLink = interaction.options.getString('event_post_link');
  if (eventPostLink !== null) {
    updates.eventPostLink = eventPostLink || null;
    changed.push('event_post_link');
  }

  if (changed.length === 0) {
    return interaction.editReply('ℹ️ No changes provided.');
  }

  const updated = await Event.findByIdAndUpdate(event._id, updates, { new: true });

  // Refresh the calendar channel
  refreshEventCalendar();

  channelLog(
    generateSystemLogContent('Event Edited', {
      event: `\`${updated.name}\``,
      id: `\`${updated._id}\``,
      changed: changed.map((f) => `\`${f}\``).join(', '),
      editor: `<@${interaction.user.id}>`,
    }),
  );

  return interaction.editReply(`✅ **${updated.name}** updated. Changed: ${changed.join(', ')}`);
}
