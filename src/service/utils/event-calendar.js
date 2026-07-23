import { GuildScheduledEventEntityType } from 'discord.js';
import client from '../../client/index.js';
import config from '../../config/index.js';
import { COLORS, GENERAL_CHANNELS } from '../../constants/index.js';
import channelLog, { generateInteractionCreateLogContent } from './channel-log.js';

function getUtcDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function filterTodayEvents(events) {
  const { start, end } = getUtcDayBounds();

  return [...events.values()]
    .filter((event) => {
      if (event.isCanceled() || event.isCompleted()) return false;
      if (event.isActive()) return true;

      const eventStart = event.scheduledStartAt?.getTime();
      if (!eventStart) return false;

      return eventStart >= start.getTime() && eventStart < end.getTime();
    })
    .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt);
}

export function filterNowEvents(events) {
  const now = Date.now();

  return [...events.values()]
    .filter((event) => {
      if (event.isCanceled() || event.isCompleted()) return false;
      if (event.isActive()) return true;

      const start = event.scheduledStartAt?.getTime();
      if (!start || now < start) return false;

      const end = event.scheduledEndAt?.getTime();
      return !end || now <= end;
    })
    .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt);
}

function formatLocation(event) {
  if (event.entityType === GuildScheduledEventEntityType.External) {
    return event.entityMetadata?.location ?? 'External location';
  }

  if (event.channelId) {
    return `<#${event.channelId}>`;
  }

  return 'Location TBD';
}

function formatEventLine(event, { showLiveStatus = false } = {}) {
  const startTs = Math.floor(event.scheduledStartAt.getTime() / 1000);
  const endTs = event.scheduledEndAt
    ? Math.floor(event.scheduledEndAt.getTime() / 1000)
    : null;

  const timeStr = endTs
    ? `<t:${startTs}:t> – <t:${endTs}:t> UTC`
    : `<t:${startTs}:t> UTC`;

  const liveBadge = showLiveStatus && event.isActive() ? ' 🔴 **Live**' : '';

  return `**[${event.name}](${event.url})**${liveBadge}\n${timeStr} · ${formatLocation(event)}`;
}

function getCalendarLink() {
  const { SERVER_ID: serverId } = config;
  if (!serverId || !GENERAL_CHANNELS.eventCalendar) return null;
  return `https://discord.com/channels/${serverId}/${GENERAL_CHANNELS.eventCalendar}`;
}

export function buildEventsEmbed({ title, events, emptyMessage, showLiveStatus = false }) {
  const calendarLink = getCalendarLink();
  const footerText = calendarLink
    ? 'All times in UTC · View full calendar'
    : 'All times in UTC';

  if (events.length === 0) {
    return {
      color: COLORS.PRIMARY,
      title,
      description: emptyMessage,
      footer: { text: footerText },
      ...(calendarLink && { url: calendarLink }),
    };
  }

  return {
    color: COLORS.PRIMARY,
    title,
    description: events.map((event) => formatEventLine(event, { showLiveStatus })).join('\n\n'),
    footer: {
      text: `${footerText} · ${events.length} event${events.length === 1 ? '' : 's'}`,
    },
    ...(calendarLink && { url: calendarLink }),
  };
}

export async function fetchGuildScheduledEvents(guildId) {
  const guild = await client.guilds.fetch(guildId);
  return guild.scheduledEvents.fetch();
}

const MODES = {
  today: {
    title: "Today's Events",
    emptyMessage: 'No events scheduled for today.',
    filter: filterTodayEvents,
    showLiveStatus: true,
  },
  now: {
    title: 'Live Now',
    emptyMessage: 'Nothing is live right now. Check back later or use `/today` to see upcoming events.',
    filter: filterNowEvents,
    showLiveStatus: true,
  },
};

export default async function displayEvents(interaction, mode) {
  const { title, emptyMessage, filter, showLiveStatus } = MODES[mode];

  await interaction.deferReply();

  channelLog(generateInteractionCreateLogContent(interaction, `mode: ${mode}`));

  const guildId = interaction.guildId ?? config.SERVER_ID;

  if (!guildId) {
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Server Not Found',
          description: 'This command must be used in a server, or SERVER_ID must be configured.',
        },
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    const events = await fetchGuildScheduledEvents(guildId);
    const filteredEvents = filter(events);
    const embed = buildEventsEmbed({
      title,
      events: filteredEvents,
      emptyMessage,
      showLiveStatus,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching ${mode} events:`, error);

    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Could Not Load Events',
          description:
            'Unable to fetch scheduled events. Make sure the bot has access to this server and the **View Events** permission.',
        },
      ],
      ephemeral: true,
    });
  }
}
