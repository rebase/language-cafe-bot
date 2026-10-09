import MonitoredChannel from '../../../models/monitored-channel.js';
import WaiterAssignment from '../../../models/waiter-assignment.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { refreshEventTracker } from '../../utils/event-tracker.js';

/**
 * /channel waiter-remove
 * Deactivates a waiter's assignment for a monitored channel.
 * Historical assignments are preserved for compliance reporting.
 */
export default async function channelWaiterRemove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel');
  const user = interaction.options.getUser('user');

  const assignment = await WaiterAssignment.findOne({
    channelId: channel.id,
    userId: user.id,
    isActive: true,
  });

  if (!assignment) {
    return interaction.editReply(
      `❌ <@${user.id}> is not currently assigned as a waiter for <#${channel.id}>.`,
    );
  }

  assignment.isActive = false;
  assignment.removedAt = new Date();
  await assignment.save();

  const monitoredChannel = await MonitoredChannel.findOne({ channelId: channel.id });

  channelLog(
    generateSystemLogContent('Waiter Removed', {
      waiter: `<@${user.id}>`,
      channel: `<#${channel.id}>`,
      displayName: monitoredChannel ? `\`${monitoredChannel.displayName}\`` : `\`unknown\``,
    }),
  );

  await refreshEventTracker();

  return interaction.editReply(
    `✅ <@${user.id}> has been removed as a waiter for <#${channel.id}>.`,
  );
}
