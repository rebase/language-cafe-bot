import client from '../../client/index.js';
import config from '../../config/index.js';
import MonitoredChannel from '../../models/monitored-channel.js';
import EventHistory from '../../models/event-history.js';
import ReminderDelivery from '../../models/reminder-delivery.js';
import channelLog, { generateSystemLogContent } from '../utils/channel-log.js';
import { getPeriodBounds, getPeriodName, getReminderDate } from '../utils/reporting-periods.js';
import WaiterAssignment from '../../models/waiter-assignment.js';
import deliverNotification from '../utils/notification-delivery.js';

const { WAITER_CHANNEL_ID } = config;

/**
 * Sends 7-day-before-end reminders for a specific reporting period.
 * Recovery checks may repeat; delivery is limited to once per channel and period.
 *
 * Idempotent — persists ReminderDelivery records to prevent duplicate sends
 * (safe to call manually or if the cron fires twice).
 *
 * @param {number} period  1–6
 */
export default async function waiterReminderCheck(period, now = new Date()) {
  try {
    if (!WAITER_CHANNEL_ID) return;

    const year = now.getUTCFullYear();
    const { end } = getPeriodBounds(year, period);
    if (now < getReminderDate(year, period) || now > end) return;
    const periodName = getPeriodName(period);

    const waiterChannel = await client.channels.fetch(WAITER_CHANNEL_ID).catch(() => null);
    if (!waiterChannel) return;

    const channels = await MonitoredChannel.find({ isActive: true });
    let sent = 0;

    for (const ch of channels) {
      // Skip if reminder already sent this period (idempotency)
      const alreadySent = await ReminderDelivery.findOne({
        channelId: ch.channelId,
        year,
        reportingPeriod: period,
        sentAt: { $ne: null },
      });
      if (alreadySent) continue;
      const waiters = await WaiterAssignment.find({ channelId: ch.channelId, isActive: true });
      if (waiters.length === 0) continue;

      // Skip if a qualifying event already exists
      const hasEvent = await EventHistory.findOne({
        languageChannelId: ch.channelId,
        year,
        reportingPeriod: period,
        isValid: true,
      });
      if (hasEvent) continue;

      const endFormatted = end.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });

      const mentions = waiters.map((w) => `<@${w.userId}>`).join(' ');

      const delivered = await deliverNotification(
        ReminderDelivery,
        { channelId: ch.channelId, year, reportingPeriod: period },
        waiterChannel,
        `📅 **Event Reminder — <#${ch.channelId}>**\n\n` +
          `No event has been recorded for the **${periodName}** reporting period.\n\n` +
          `${mentions} — please schedule an event before **${endFormatted}, ${year}**.`,
        client.user.id,
      );
      if (delivered) sent++;
    }

    if (sent > 0) {
      channelLog(
        generateSystemLogContent('Waiter Reminders Sent', {
          period: `\`${periodName} ${year}\``,
          count: `\`${sent}\``,
        }),
      );
    }
  } catch (err) {
    console.error('waiterReminderCheck error:', err);
    channelLog(generateSystemLogContent('Waiter Reminder Error', { error: err.message }));
  }
}
