import { COLORS } from '../../../constants/index.js';
import A_TO_Z from '../../../data/a2z.js';
import Category from '../../../models/category.js';

export default async (interaction) => {
  try {
    await interaction.deferReply({ ephemeral: true });

    const message = interaction.fields.getTextInputValue('message');

    const res = await Category.create({
      message,
      alphabet: A_TO_Z,
    });

    if (res) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: `Category created successfully\n\nMessage\`\`\`\n${message}\n\`\`\``,
          },
        ],
      });
    } else {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: 'Failed to create category',
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
          description: 'Failed to create category (Internal Server Error)',
        },
      ],
    });
  }
};
