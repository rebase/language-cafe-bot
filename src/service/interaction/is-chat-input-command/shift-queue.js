import Queue from '../../../models/queue.js';
import { getCurrentQueueDescription } from './get-queue.js';

export default async (interaction) => {
  try {
    const { channel } = interaction;

    const oldestQueue = await Queue.findOne().sort({ createdAt: 1 });
    if (!oldestQueue) {
      await interaction.reply({
        embeds: [
          {
            color: 0xc3c3e5,
            description: 'Queue is empty.',
          },
        ],
        ephemeral: true,
      });
      return;
    }

    await Queue.findByIdAndDelete(oldestQueue._id);

    await interaction.reply({
      embeds: [
        {
          color: 0xc3c3e5,
          description: 'Queue has been shifted.',
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
