import MonitoredChannel from '../../../models/monitored-channel.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { refreshEventTracker } from '../../utils/event-tracker.js';

/**
 * /channel remove
 * Deactivates a monitored channel. Historical compliance records are preserved.
 * The channel becomes exempt from future period requirements.
 */
export default async function channelRemove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel');

  const existing = await MonitoredChannel.findOne({ channelId: channel.id, isActive: true });

  if (!existing) {
    return interaction.editReply(
      `❌ <#${channel.id}> is not currently registered as a monitored channel.`,
    );
  }

  existing.isActive = false;
  await existing.save();

  channelLog(
    generateSystemLogContent('Monitored Channel Removed', {
      channel: `<#${channel.id}>`,
      displayName: `\`${existing.displayName}\``,
    }),
  );

  await refreshEventTracker();

  return interaction.editReply(
    `✅ <#${channel.id}> (**${existing.displayName}**) has been deregistered and is now exempt from future requirements.`,
  );
}
