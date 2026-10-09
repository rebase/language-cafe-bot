import MonitoredChannel from '../../../models/monitored-channel.js';
import WaiterAssignment from '../../../models/waiter-assignment.js';

/**
 * /channel list
 * Shows all registered monitored channels and their currently assigned waiters.
 */
export default async function channelList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channels = await MonitoredChannel.find().sort({ isActive: -1, displayName: 1 });

  if (channels.length === 0) {
    return interaction.editReply('No channels registered yet. Use `/channel add` to register one.');
  }

  const lines = [];

  for (const ch of channels) {
    const waiters = await WaiterAssignment.find({ channelId: ch.channelId, isActive: true });
    const status = ch.isActive ? '' : ' *(inactive)*';
    const waiterList =
      waiters.length > 0 ? waiters.map((w) => `<@${w.userId}>`).join(', ') : '*no waiters assigned*';

    lines.push(`${ch.emoji} **${ch.displayName}**${status} — <#${ch.channelId}>\n↳ ${waiterList}`);
  }

  return interaction.editReply(lines.join('\n\n'));
}
