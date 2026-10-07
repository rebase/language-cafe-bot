import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default async (interaction) => {
  const modal = new ModalBuilder()
    .setCustomId('create-new-category')
    .setTitle('Create new category');

  const message = new TextInputBuilder()
    .setCustomId('message')
    .setLabel('Put message content')
    .setStyle(TextInputStyle.Paragraph);

  modal.addComponents(new ActionRowBuilder().addComponents(message));

  await interaction.showModal(modal);
};
