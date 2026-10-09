import MonitoredChannel from '../../../models/monitored-channel.js';
import WaiterAssignment from '../../../models/waiter-assignment.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { refreshEventTracker } from '../../utils/event-tracker.js';

/**
 * /channel waiter-add
 * Assigns a waiter to a monitored language channel.
 * Supports multiple waiters per channel and one waiter across multiple channels.
 */
export default async function channelWaiterAdd(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel');
  const user = interaction.options.getUser('user');

  // Channel must be registered
  const monitoredChannel = await MonitoredChannel.findOne({ channelId: channel.id, isActive: true });
  if (!monitoredChannel) {
    return interaction.editReply(
      `❌ <#${channel.id}> is not a registered monitored channel. Use \`/channel add\` first.`,
    );
  }

  // Check for an existing active assignment
  const existing = await WaiterAssignment.findOne({
    channelId: channel.id,
    userId: user.id,
    isActive: true,
  });

  if (existing) {
    return interaction.editReply(
      `❌ <@${user.id}> is already assigned as a waiter for <#${channel.id}>.`,
    );
  }

  await WaiterAssignment.create({
    channelId: channel.id,
    userId: user.id,
    isActive: true,
    assignedAt: new Date(),
    removedAt: null,
  });

  channelLog(
    generateSystemLogContent('Waiter Assigned', {
      waiter: `<@${user.id}>`,
      channel: `<#${channel.id}>`,
      displayName: `\`${monitoredChannel.displayName}\``,
    }),
  );

  await refreshEventTracker();

  return interaction.editReply(
    `✅ <@${user.id}> assigned as a waiter for <#${channel.id}> (**${monitoredChannel.displayName}**).`,
  );
}
