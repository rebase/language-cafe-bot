import Event from '../../../models/event.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { normaliseHashtag } from '../../utils/event-utils.js';
import { refreshEventCalendar } from '../../utils/event-calendar.js';
import { syncEventHistory, refreshEventTracker } from '../../utils/event-tracker.js';

/**
 * /event create
 */
export default async function createEvent(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const name = interaction.options.getString('name');
  const eventType = interaction.options.getString('event_type');
  const hashtag = normaliseHashtag(interaction.options.getString('hashtag'));
  const submissionChannel = interaction.options.getChannel('submission_channel');
  const startDateStr = interaction.options.getString('start_date');
  const endDateStr = interaction.options.getString('end_date');
  const pointsPerSubmission = interaction.options.getInteger('points_per_submission') ?? null;
  const maxPoints =
    interaction.options.getInteger('max_points') ?? (pointsPerSubmission ? 200 : null);
  const creatorBonus = interaction.options.getInteger('creator_bonus') ?? 0;
  const eventPostLink = interaction.options.getString('event_post_link') ?? null;
  // Language channel for permanent history — defaults to submission channel if not specified
  const languageChannel = interaction.options.getChannel('language_channel') ?? submissionChannel;

  // If points_per_submission is set, max_points defaults to 200 but can be overridden.
  // If neither is set, both remain null (tracking-only mode).
  if (pointsPerSubmission !== null && maxPoints === null) {
    return interaction.editReply(
      '❌ `max_points` is required when `points_per_submission` is set.',
    );
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (Number.isNaN(startDate.getTime())) {
    return interaction.editReply(
      '❌ Invalid start date. Use UTC format: `YYYY-MM-DDTHH:MM` or `YYYY-MM-DD HH:MM`.',
    );
  }
  if (Number.isNaN(endDate.getTime())) {
    return interaction.editReply(
      '❌ Invalid end date. Use UTC format: `YYYY-MM-DDTHH:MM` or `YYYY-MM-DD HH:MM`.',
    );
  }
  if (endDate <= startDate) {
    return interaction.editReply('❌ End date must be after start date.');
  }

  const now = new Date();
  const status = startDate <= now ? 'active' : 'pending';

  const event = new Event({
    name,
    eventType,
    hashtag,
    submissionChannelId: submissionChannel.id,
    languageChannelId: languageChannel.id,
    startDate,
    endDate,
    pointsPerSubmission,
    maxPoints,
    creatorBonus,
    eventPostLink,
    creatorId: interaction.user.id,
    status,
  });

  await event.save();

  // Create permanent history record — survives /event remove
  await syncEventHistory(event, languageChannel.id);

  await refreshEventCalendar();
  await refreshEventTracker();

  channelLog(
    generateSystemLogContent('Event Created', {
      event: `\`${event.name}\``,
      id: `\`${event._id}\``,
      type: `\`${event.eventType}\``,
      hashtag: `\`${event.hashtag}\``,
      channel: `<#${submissionChannel.id}>`,
      languageChannel: `<#${languageChannel.id}>`,
      status: `\`${status}\``,
      creator: `<@${interaction.user.id}>`,
    }),
  );

  const pointsInfo = pointsPerSubmission
    ? `${pointsPerSubmission} pts/submission · max ${maxPoints} pts`
    : 'No points (tracking only)';

  return interaction.editReply(
    `✅ Event **${name}** created (ID: \`${event._id}\`).\n` +
      `Channel: <#${submissionChannel.id}> · ${pointsInfo}`,
  );
}
