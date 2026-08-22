import Event from '../../../models/event.js';

/**
 * Autocomplete handler for the `event_name` option.
 * Returns up to 25 events whose names start with (or contain) the typed value.
 * Shows all non-removed events (pending, active, ended).
 */
export async function handleEventNameAutocomplete(interaction) {
  try {
    const focused = interaction.options.getFocused();

    const query = focused ? { name: { $regex: new RegExp(focused, 'i') } } : {};

    const events = await Event.find(query).sort({ startDate: -1 }).limit(25).select('name status');

    const statusEmoji = { active: '🟢', pending: '🕐', ended: '⚫' };

    const choices = events.map((e) => ({
      name: `${statusEmoji[e.status] ?? ''} ${e.name}`.trim(),
      value: e.name,
    }));

    await interaction.respond(choices);
  } catch (err) {
    console.error('Error in event name autocomplete:', err);
    await interaction.respond([]);
  }
}
