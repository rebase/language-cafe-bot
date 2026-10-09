import { COLORS } from '../../../constants/index.js';
import MatchMatchTopic, { MAX_TOPIC_LENGTH } from '../../../models/match-match-topic.js';

const reply = (interaction, description) => interaction.editReply({
  embeds: [{ color: COLORS.PRIMARY, description }],
});

export default async (interaction) => {
  try {
    await interaction.deferReply({ ephemeral: true });
    const input = interaction.fields.getTextInputValue('topic');
    if (typeof input !== 'string' || input.length > 4000) {
      await reply(interaction, 'Submit text with one topic per line (4000 characters total maximum).');
      return;
    }

    const topics = input.split(/\r\n|[\n\r]/).map((line) => line.trim()).filter(Boolean);
    if (topics.length === 0) {
      await reply(interaction, 'No topics submitted. Enter at least one topic, one per line.');
      return;
    }
    if (topics.some((topic) => topic.length > MAX_TOPIC_LENGTH)) {
      await reply(interaction,
        `Each topic must be ${MAX_TOPIC_LENGTH} characters or fewer. No topics were created.`);
      return;
    }

    const existing = await MatchMatchTopic.find({}, 'topic').lean();
    const seen = new Set(existing.map(({ topic }) => topic.trim().toLowerCase()));
    const newTopics = topics.filter((topic) => {
      const key = topic.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const skipped = topics.length - newTopics.length;
    if (newTopics.length === 0) {
      await reply(interaction, `No topics created. Skipped ${skipped} duplicate topic(s).`);
      return;
    }

    const created = await MatchMatchTopic.insertMany(newTopics.map((topic) => ({ topic })));
    await reply(interaction,
      `${created.length} match-match topic(s) created in input order. Skipped ${skipped} duplicate topic(s).`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    await reply(interaction, 'Failed to create match-match topics (Internal Server Error).');
  }
};
