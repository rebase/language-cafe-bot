import TrackerParticipant from '../../../models/tracker-participant.js';
import EMOJI_KEYWORDS from '../../../data/emoji-keywords.js';

export default async function trackerJoinEmojiAutocomplete(interaction) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const threadId = interaction.channel.id;

    // Get all searchable emojis from the keywords file
    const allSearchableEmojis = Object.keys(EMOJI_KEYWORDS);

    // Get emojis already in use
    const usedEmojis = await TrackerParticipant.find({ trackerId: threadId }).select('emoji');
    const usedEmojiSet = new Set(usedEmojis.map((p) => p.emoji));

    // Filter available emojis (remove used ones)
    const availableEmojis = allSearchableEmojis.filter((emoji) => !usedEmojiSet.has(emoji));

    let filteredEmojis = availableEmojis;

    // If user typed something, filter emojis based on keywords
    if (focusedValue) {
      filteredEmojis = availableEmojis.filter((emoji) => {
        const keywords = EMOJI_KEYWORDS[emoji] || [];
        return keywords.some((keyword) => keyword.toLowerCase().includes(focusedValue));
      });

      // If no keyword matches found, show first 25 available emojis as fallback
      if (filteredEmojis.length === 0) {
        filteredEmojis = availableEmojis.slice(0, 25);
      }
    }

    // Limit to 25 choices (Discord's limit for autocomplete)
    const choices = filteredEmojis.slice(0, 25).map((emoji) => ({
      name: emoji,
      value: emoji,
    }));

    await interaction.respond(choices);
  } catch (error) {
    console.error('Error in tracker join emoji autocomplete:', error);
    // Fallback to first 25 available emojis if there's an error
    const allSearchableEmojis = Object.keys(EMOJI_KEYWORDS);
    const usedEmojis = await TrackerParticipant.find({ trackerId: interaction.channel.id }).select(
      'emoji',
    );
    const usedEmojiSet = new Set(usedEmojis.map((p) => p.emoji));
    const availableEmojis = allSearchableEmojis.filter((emoji) => !usedEmojiSet.has(emoji));
    const fallbackChoices = availableEmojis.slice(0, 25).map((emoji) => ({
      name: emoji,
      value: emoji,
    }));
    await interaction.respond(fallbackChoices);
  }
}
