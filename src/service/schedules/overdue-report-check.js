import client from '../../client/index.js';
import config from '../../config/index.js';
import MonitoredChannel from '../../models/monitored-channel.js';
import WaiterAssignment from '../../models/waiter-assignment.js';
import EventHistory from '../../models/event-history.js';
import OverdueReport from '../../models/overdue-report.js';
import { getPeriodBounds, getPeriodName, getCompletedPeriods } from '../utils/reporting-periods.js';
import deliverNotification from '../utils/notification-delivery.js';

export default async function overdueReportCheck(now = new Date()) {
  if (!config.STAFF_CHANNEL_ID) return;
  const channels = await MonitoredChannel.find({ isActive: true });
  if (!channels.length) return;
  const earliest = new Date(Math.min(...channels.map((ch) => ch.registeredAt.getTime())));
  const periods = getCompletedPeriods(earliest, now);
  const currentAssignments = new Map();

  for (const { year, period } of periods) {
    const key = { year, reportingPeriod: period };
    if (await OverdueReport.findOne({ ...key, sentAt: { $ne: null } })) continue;
    if (!currentAssignments.size) {
      for (const ch of channels) {
        currentAssignments.set(ch.channelId, await WaiterAssignment.find({
          channelId: ch.channelId, isActive: true,
        }));
      }
    }
    const { end } = getPeriodBounds(year, period);
    const lines = [];
    for (const ch of channels) {
      if (ch.registeredAt > end || !currentAssignments.get(ch.channelId).length) continue;
      const historical = await WaiterAssignment.find({
        channelId: ch.channelId,
        assignedAt: { $lte: end },
        $or: [{ removedAt: null }, { removedAt: { $gt: end } }],
      });
      if (!historical.length) continue;
      if (await EventHistory.findOne({
        languageChannelId: ch.channelId, year, reportingPeriod: period, isValid: true,
      })) continue;
      const currentIds = new Set(currentAssignments.get(ch.channelId).map((w) => w.userId));
      const waiters = historical.map((w) => currentIds.has(w.userId)
        ? `<@${w.userId}>` : `Former waiter (${w.userId})`).join(', ');
      lines.push(`${ch.emoji} <#${ch.channelId}> - ${waiters}`);
    }
    if (!lines.length) {
      await OverdueReport.updateOne(key, { $set: { sentAt: new Date() } }, { upsert: true });
      continue;
    }
    const channel = await client.channels.fetch(config.STAFF_CHANNEL_ID);
    if (!channel) throw new Error('Staff notification channel is unavailable');
    const content = `**Overdue Events - ${getPeriodName(period)} ${year}**\n\n`
      + lines.join('\n') + `\n\n**Total: ${lines.length} channels overdue**`;
    await deliverNotification(OverdueReport, key, channel, content, client.user.id);
  }
}
