import { PermissionFlagsBits } from 'discord.js';
import { refreshEventTracker } from '../../utils/event-tracker.js';

/**
 * /event-tracker refresh
 * Recalculates the current year's tracker and updates (or recreates) the Discord message.
 * Administrator only — intentionally separate from /event to restrict access.
 */
export default async function eventTrackerRefresh(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.editReply('❌ You need Administrator permission to use this command.');
  }

  const refreshed = await refreshEventTracker();
  if (!refreshed) {
    return interaction.editReply('Tracker refresh failed. Check the waiter channel configuration and bot permissions, then retry.');
  }

  return interaction.editReply('✅ Event tracker refreshed.');
}
