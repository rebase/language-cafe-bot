import config from '../../../config/index.js';
import Queue from '../../../models/queue.js';
import { getCurrentQueueDescription } from './get-queue.js';

export default async (interaction) => {
  try {
    const userId = interaction.user.id;
    const { channel } = interaction;

    const isExist = await Queue.findOne({ id: userId });

    if (isExist) {
      interaction.reply({
        embeds: [
          {
            color: 0xc3c3e5,
            description: 'You are already in the queue.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    await Queue.create({ id: userId });

    const queueLength = await Queue.countDocuments();

    await interaction.reply({
      embeds: [
        {
          color: 0xc3c3e5,
          description: `You have been added to the queue.\nCurrent queue position: \`${queueLength}\`\n\nYou're now in the queue. Please wait for your turn. If you wish to remove yourself from the queue, use </remove-me-from-queue:${config.REMOVE_ME_FROM_QUEUE_COMMAND_ID}>`,
        },
      ],
      ephemeral: true,
    });

    await channel.send({
      embeds: [
        {
          color: 0xc3c3e5,
          footer: {
            icon_url: interaction.user.avatarURL(),
            text: `${interaction.user.globalName}(${interaction.user.username}#${interaction.user.discriminator}) has been added to the queue.`,
          },
        },
      ],
    });

    const currentQueueDescription = await getCurrentQueueDescription();

    await channel.send({
      embeds: [
        {
          color: 0xc3c3e5,
          description: currentQueueDescription,
        },
      ],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};
