import MonitoredChannel from '../../../models/monitored-channel.js';
import channelLog, { generateSystemLogContent } from '../../utils/channel-log.js';
import { refreshEventTracker } from '../../utils/event-tracker.js';
import FLAG_EMOJI_KEYWORDS from '../../../data/flag-emoji-keywords.js';
/**
 * /channel add
 * Registers a Discord channel as a monitored language channel for event tracking.
 */
export default async function channelAdd(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel');
  const displayName = interaction.options.getString('display_name');
  const emoji = interaction.options.getString('emoji');

  if (!Object.keys(FLAG_EMOJI_KEYWORDS).includes(emoji)) {
    return interaction.editReply('❌ Invalid emoji. Please choose from the autocomplete list.');
  }

  const existing = await MonitoredChannel.findOne({ channelId: channel.id });

  if (existing) {
    if (existing.isActive) {
      return interaction.editReply(
        `❌ <#${channel.id}> is already registered as **${existing.displayName}**.`,
      );
    }

    // Re-activate a previously removed channel
    existing.isActive = true;
    existing.displayName = displayName;
    existing.emoji = emoji;
    await existing.save();

    channelLog(
      generateSystemLogContent('Monitored Channel Re-registered', {
        channel: `<#${channel.id}>`,
        displayName: `\`${displayName}\``,
        emoji,
      }),
    );

    await refreshEventTracker();

    return interaction.editReply(
      `✅ <#${channel.id}> re-registered as **${displayName}** ${emoji}.`,
    );
  }

  await MonitoredChannel.create({
    channelId: channel.id,
    displayName,
    emoji,
    isActive: true,
    registeredAt: new Date(),
  });

  channelLog(
    generateSystemLogContent('Monitored Channel Added', {
      channel: `<#${channel.id}>`,
      displayName: `\`${displayName}\``,
      emoji,
    }),
  );

  await refreshEventTracker();

  return interaction.editReply(`✅ <#${channel.id}> registered as **${displayName}** ${emoji}.`);
}
