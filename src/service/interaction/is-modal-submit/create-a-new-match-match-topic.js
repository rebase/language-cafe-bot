import { COLORS } from '../../../constants/index.js';
import MatchMatchTopic from '../../../models/match-match-topic.js';

export default async (interaction) => {
  try {
    const topic = interaction.fields.getTextInputValue('topic');

    const res = await MatchMatchTopic.create({
      topic,
    });

    if (res) {
      await interaction.reply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: `Match-match topic created successfully\n\nTopic\`\`\`\n${topic}\n\`\`\``,
          },
        ],
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: 'Failed to create match-match topic',
          },
        ],
        ephemeral: true,
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    await interaction.reply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          description: 'Failed to create match-match topic (Internal Server Error)',
        },
      ],
      ephemeral: true,
    });
  }
};
