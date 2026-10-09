import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default async (interaction) => {
  const modal = new ModalBuilder()
    .setCustomId('create-a-new-match-match-topic')
    .setTitle('Create match-match topics');

  const topic = new TextInputBuilder()
    .setCustomId('topic')
    .setLabel('One topic per line (max 256 chars each)')
    .setPlaceholder('water\nsun\nbook')
    .setRequired(true)
    .setMaxLength(4000)
    .setStyle(TextInputStyle.Paragraph);

  modal.addComponents(new ActionRowBuilder().addComponents(topic));

  await interaction.showModal(modal);
};
