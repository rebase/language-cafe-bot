import Event from '../../models/event.js';
import client from '../../client/index.js';
import config from '../../config/index.js';
import channelLog, { generateSystemLogContent } from './channel-log.js';

const { EVENT_CALENDAR_CHANNEL_ID: calendarChannelId } = config;

// ─── Category squares ─────────────────────────────────────────────────────────

const CATEGORY_SQUARE = {
  Reading: '🟥',
  Listening: '🟨',
  Speaking: '🟦',
  Writing: '🟩',
  'Live Event': '🩷',
  Mixed: '🟧',
  Other: '🟪',
};

const LEGEND =
  '🟥 Reading · 🟨 Listening · 🟦 Speaking · 🟩 Writing · 🩷 Live Event · 🟧 Mixed · 🟪 Other';

// ─── Embed builder ────────────────────────────────────────────────────────────

/**
 * Builds a single embed showing all currently active events.
 * Each event appears once as a line item — no day-by-day expansion.
 */
function buildCalendarEmbed(events) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  if (events.length === 0) {
    return {
      color: 0x5865f2,
      title: '🗓️ Language Cafe Event Calendar',
      description: `**Today's Events · ${today}**\n${LEGEND}\n\n*No active events at the moment.*`,
    };
  }

  const lines = events.map((event) => {
    const square = CATEGORY_SQUARE[event.eventType] ?? '🟪';
    const name = event.eventPostLink ? `[${event.name}](${event.eventPostLink})` : event.name;
    return `${square} ${name}`;
  });

  return {
    color: 0x5865f2,
    title: '🗓️ Language Cafe Event Calendar',
    description: `**Today's Events · ${today}**\n${LEGEND}\n\n` + lines.join('\n'),
  };
}

// ─── Channel refresh ──────────────────────────────────────────────────────────

/**
 * Clears all bot messages in the #event-calendar channel and reposts
 * a single embed listing all currently active events.
 *
 * No-op if EVENT_CALENDAR_CHANNEL_ID is not configured.
 */
export async function refreshEventCalendar() {
  try {
    if (!calendarChannelId) return;

    const channel = await client.channels.fetch(calendarChannelId).catch(() => null);
    if (!channel) return;

    // Delete existing bot messages
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter((m) => m.author.id === client.user.id);

    if (botMessages.size > 0) {
      try {
        await channel.bulkDelete(botMessages);
      } catch {
        for (const msg of botMessages.values()) {
          await msg.delete().catch(() => {});
        }
      }
    }

    // Fetch active events sorted by start date
    const events = await Event.find({ status: 'active' }).sort({ startDate: 1 });

    await channel.send({ embeds: [buildCalendarEmbed(events)] });

    channelLog(
      generateSystemLogContent('Event Calendar Refreshed', {
        activeEvents: `\`${events.length}\``,
      }),
    );
  } catch (err) {
    console.error('refreshEventCalendar error:', err);
  }
}
