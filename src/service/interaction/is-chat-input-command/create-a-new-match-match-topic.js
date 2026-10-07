import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default async (interaction) => {
  const modal = new ModalBuilder()
    .setCustomId('create-a-new-match-match-topic')
    .setTitle('Create new match-match topic');

  const topic = new TextInputBuilder()
    .setCustomId('topic')
    .setLabel('Put a topic to create')
    .setStyle(TextInputStyle.Paragraph);

  modal.addComponents(new ActionRowBuilder().addComponents(topic));

  await interaction.showModal(modal);
};
