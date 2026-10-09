import client from '../../client/index.js';
import config from '../../config/index.js';
import EventHistory from '../../models/event-history.js';
import MonitoredChannel from '../../models/monitored-channel.js';
import WaiterAssignment from '../../models/waiter-assignment.js';
import TrackerMessage from '../../models/tracker-message.js';
import channelLog, { generateSystemLogContent } from './channel-log.js';
import { getPeriodForDate, getPeriodBounds } from './reporting-periods.js';

const { WAITER_CHANNEL_ID } = config;

// ─── Status cell emojis ───────────────────────────────────────────────────────

const STATUS = {
  HAS_EVENT: '✅',
  ONGOING_MISSING: '🟪',
  OVERDUE: '❌',
  EXEMPT: '⚪',
  NOT_STARTED: '➖',
};

// ─── History helpers ──────────────────────────────────────────────────────────

/**
 * Creates or synchronises permanent history from the current EMS event data.
 * @param {import('mongoose').Document} event         The updated Event document
 * @param {string|null} languageChannelId  New channel ID, or null to retain the stored reference.
 */
export async function syncEventHistory(event, languageChannelId = null) {
  const emsEventId = event._id.toString();
  const record = await EventHistory.findOne({ emsEventId });
  const { period, year } = getPeriodForDate(event.startDate);
  const values = {
    name: event.name,
    languageChannelId: languageChannelId ?? event.languageChannelId
      ?? record?.languageChannelId ?? event.submissionChannelId,
    startDate: event.startDate,
    endDate: event.endDate,
    eventPostLink: event.eventPostLink ?? null,
    isValid: record?.isValid ?? true,
    year,
    reportingPeriod: period,
  };
  return EventHistory.updateOne(
    { emsEventId }, { $set: values }, { upsert: true, runValidators: true },
  );
}

// ─── Compliance helpers ───────────────────────────────────────────────────────

/**
 * Returns the active waiter assignments for a channel as they stood at a given point in time.
 * Used to determine historical compliance accurately.
 * @param {string} channelId
 * @param {Date} atDate
 * @returns {Promise<import('mongoose').Document[]>}
 */
async function getWaitersAtDate(channelId, atDate) {
  return WaiterAssignment.find({
    channelId,
    assignedAt: { $lte: atDate },
    $or: [{ removedAt: null }, { removedAt: { $gt: atDate } }],
  });
}

/**
 * Checks if a qualifying (valid) EventHistory record exists for a channel/period/year.
 * @param {string} languageChannelId
 * @param {number} year
 * @param {number} period
 * @returns {Promise<boolean>}
 */
async function hasQualifyingEvent(languageChannelId, year, period) {
  const record = await EventHistory.findOne({
    languageChannelId,
    year,
    reportingPeriod: period,
    isValid: true,
  });
  return !!record;
}

/**
 * Computes the status cell for a single channel + period combination.
 * @param {import('mongoose').Document} channel   MonitoredChannel document
 * @param {number} year
 * @param {number} period
 * @param {Date} now
 * @returns {Promise<string>} One of the STATUS emoji values
 */
async function computeCell(channel, year, period, now) {
  const { start, end } = getPeriodBounds(year, period);

  const qualified = await hasQualifyingEvent(channel.channelId, year, period);
  if (qualified) return STATUS.HAS_EVENT;

  // Future periods have no requirement to assess yet.
  if (now < start) return STATUS.NOT_STARTED;

  // Exempt: channel was registered after this period ended
  if (channel.registeredAt > end) return STATUS.EXEMPT;

  // Assess the current period as of today, completed periods at their deadline.
  const assessmentDate = now < end ? now : end;
  const waiters = await getWaitersAtDate(channel.channelId, assessmentDate);
  if (waiters.length === 0) return STATUS.EXEMPT;

  // Period not yet over → still time to schedule
  if (now <= end) return STATUS.ONGOING_MISSING;

  // Period ended, no event → overdue
  return STATUS.OVERDUE;
}

// ─── Grid renderer ────────────────────────────────────────────────────────────

const PERIOD_SHORT_NAMES = ['Jan–Feb', 'Mar–Apr', 'May–Jun', 'Jul–Aug', 'Sep–Oct', 'Nov–Dec'];

/**
 * Builds the tracker grid string and legend embed for a given year.
 * Returns { gridEmbed, legendEmbed }.
 * @param {import('mongoose').Document[]} channels  Active MonitoredChannel docs (sorted)
 * @param {number} year
 * @param {Date} now
 */
async function buildTrackerEmbeds(channels, year, now) {
  // No code block — flag emojis collapse to letters inside triple-backtick blocks on Discord.
  const header = channels.map((c) => c.emoji).join('   ');

  const rows = [];
  for (let p = 1; p <= 6; p++) {
    const cells = await Promise.all(channels.map((ch) => computeCell(ch, year, p, now)));
    rows.push(`${cells.join('   ')}  **${PERIOD_SHORT_NAMES[p - 1]}**`);
  }

  const gridText = channels.length > 0
    ? [header, ...rows].join('\n')
    : '*No active channels registered.*';
  const truncated = gridText.length > 3800 ? gridText.slice(0, 3780) + '\n…(truncated)' : gridText;

  const gridEmbed = {
    color: 0x5865f2,
    title: `📊 Event Tracker — ${year}`,
    description: truncated,
    footer: {
      text: `${STATUS.HAS_EVENT} Event recorded  ${STATUS.ONGOING_MISSING} Ongoing, no event yet  ${STATUS.OVERDUE} Overdue  ${STATUS.EXEMPT} Exempt (not registered yet or no waiter assigned)  ${STATUS.NOT_STARTED} Not started`,
    },
    timestamp: new Date().toISOString(),
  };

  // Legend: map each emoji → displayName + channel mention
  const legendLines = channels.map(
    (ch) => `${ch.emoji} **${ch.displayName}** — <#${ch.channelId}>`,
  );
  const legendEmbed = {
    color: 0x5865f2,
    title: 'Channel Legend',
    description: legendLines.length > 0 ? legendLines.join('\n') : '*No channels registered yet.*',
  };

  return { gridEmbed, legendEmbed };
}

// ─── Core refresh ─────────────────────────────────────────────────────────────

/**
 * Recalculates the annual event tracker and edits (or recreates) the Discord message.
 * Safe to call at any time — idempotent, recovers from deleted messages.
 *
 * @param {number} [year]  Defaults to current UTC year. Pass a past year to finalise it.
 */
async function updateEventTracker(year) {
  try {
    if (!WAITER_CHANNEL_ID) return false;

    const targetYear = year ?? new Date().getUTCFullYear();
    const now = new Date();

    // Don't edit archived (previous-year) trackers
    const trackerRecord = await TrackerMessage.findOne({ year: targetYear });
    if (trackerRecord?.isArchived) return true;

    const channel = await client.channels.fetch(trackerRecord?.channelId ?? WAITER_CHANNEL_ID);
    if (!channel) return false;

    const channels = await MonitoredChannel.find({ isActive: true })
      .sort({ registeredAt: 1, displayName: 1 });

    const { gridEmbed, legendEmbed } = await buildTrackerEmbeds(channels, targetYear, now);

    if (trackerRecord) {
      // Try to edit existing message
      try {
        const existing = await channel.messages.fetch(trackerRecord.messageId);
        await existing.edit({ embeds: [gridEmbed, legendEmbed] });
        return true;
      } catch (error) {
        // Only a deleted message warrants posting a replacement.
        if (error.code !== 10008) throw error;
      }
    }

    // Post a new tracker message
    const msg = await channel.send({ embeds: [gridEmbed, legendEmbed] });

    if (trackerRecord) {
      trackerRecord.messageId = msg.id;
      await trackerRecord.save();
    } else {
      await TrackerMessage.create({
        year: targetYear,
        channelId: WAITER_CHANNEL_ID,
        messageId: msg.id,
        isArchived: false,
      });
    }

    channelLog(
      generateSystemLogContent('Event Tracker Posted', {
        year: `\`${targetYear}\``,
        messageId: `\`${msg.id}\``,
      }),
    );
    return true;
  } catch (err) {
    console.error('refreshEventTracker error:', err);
    channelLog(generateSystemLogContent('Event Tracker Error', { error: err.message }));
    return false;
  }
}

// Serialize refreshes so startup, commands and recovery cannot post competing trackers.
let trackerQueue = Promise.resolve();
export function refreshEventTracker(year) {
  const refresh = trackerQueue.then(() => updateEventTracker(year));
  trackerQueue = refresh.catch(() => {});
  return refresh;
}
