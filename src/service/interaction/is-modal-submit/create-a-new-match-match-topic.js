import { COLORS } from '../../../constants/index.js';
import MatchMatchTopic from '../../../models/match-match-topic.js';

export default async (interaction) => {
  try {
    await interaction.deferReply({ ephemeral: true });

    const topic = interaction.fields.getTextInputValue('topic');

    const res = await MatchMatchTopic.create({
      topic,
    });

    if (res) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: `Match-match topic created successfully\n\nTopic\`\`\`\n${topic}\n\`\`\``,
          },
        ],
      });
    } else {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: 'Failed to create match-match topic',
          },
        ],
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          description: 'Failed to create match-match topic (Internal Server Error)',
        },
      ],
    });
  }
};
