import FLAG_EMOJI_KEYWORDS from '../../../data/flag-emoji-keywords.js';

const ALL_EMOJIS = Object.keys(FLAG_EMOJI_KEYWORDS);

/**
 * Autocomplete handler for the `emoji` option in /channel add.
 * Searches flag emojis by country name, language, and keywords.
 */
export async function handleChannelEmojiAutocomplete(interaction) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    const filtered = focusedValue
      ? ALL_EMOJIS.filter((emoji) =>
          FLAG_EMOJI_KEYWORDS[emoji].some((kw) => kw.includes(focusedValue)),
        )
      : ALL_EMOJIS;

    const results = (filtered.length > 0 ? filtered : ALL_EMOJIS).slice(0, 25).map((emoji) => ({
      name: `${emoji} ${FLAG_EMOJI_KEYWORDS[emoji][0]}`,
      value: emoji,
    }));

    await interaction.respond(results);
  } catch (err) {
    console.error('handleChannelEmojiAutocomplete error:', err);
  }
}
