import client from '../../client/index.js';
import config from '../../config/index.js';
import channelLog, { generateSystemLogContent } from './channel-log.js';
import { buildTodayCalendarEmbed } from './calendar-embed.js';

const { EVENT_CALENDAR_CHANNEL_ID: calendarChannelId } = config;

// ─── Channel refresh ──────────────────────────────────────────────────────────

export async function refreshEventCalendar() {
  try {
    if (!calendarChannelId) return;

    const channel = await client.channels.fetch(calendarChannelId).catch(() => null);
    if (!channel) return;

    // Delete existing bot messages — individual deletes to avoid bulkDelete's 14-day limit
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter((m) => m.author.id === client.user.id);
    for (const msg of botMessages.values()) {
      await msg
        .delete()
        .catch((err) =>
          console.error(`refreshEventCalendar: failed to delete message ${msg.id}:`, err.message),
        );
    }

    const { embed, events, liveEvents } = await buildTodayCalendarEmbed();

    await channel.send({
      embeds: [embed],
    });

    channelLog(
      generateSystemLogContent('Event Calendar Refreshed', {
        activeEvents: `\`${events.length}\``,
        liveEvents: `\`${liveEvents.length}\``,
      }),
    );
  } catch (err) {
    console.error('refreshEventCalendar error:', err);
  }
}
