import { COLORS } from '../../../constants/index.js';
import channelLog, { generateInteractionCreateLogContent } from '../../utils/channel-log.js';
import { refreshEventCalendar } from '../../utils/event-calendar.js';

/**
 * /today — refresh and post the compact daily calendar embed to #event-calendar.
 */
export default async function postTodayEventCalendar(interaction) {
  await interaction.deferReply({ ephemeral: true });

  channelLog(generateInteractionCreateLogContent(interaction));

  const result = await refreshEventCalendar();

  if (!result.ok) {
    const descriptions = {
      missing_config:
        'The event calendar channel is not configured (`EVENT_CALENDAR_CHANNEL_ID`).',
      channel_not_found:
        'Could not access the event calendar channel. Check the bot permissions and channel ID.',
      error: 'Something went wrong while updating the event calendar. Please try again later.',
    };

    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Could Not Update Event Calendar',
          description: descriptions[result.reason] ?? descriptions.error,
        },
      ],
    });
    return;
  }

  await interaction.editReply({
    embeds: [
      {
        color: COLORS.PRIMARY,
        title: 'Event Calendar Updated',
        description:
          `Posted today's compact event calendar to <#${result.channelId}>.\n\n` +
          `Active async events: **${result.activeEvents}**\n` +
          `Live events today: **${result.liveEvents}**`,
      },
    ],
  });
}
